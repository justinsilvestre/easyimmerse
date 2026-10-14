//! What the media routes share: resolving a media file to a readable local path, probing it,
//! choosing its tracks, running ffmpeg, and turning conversion errors into responses.

use std::ffi::OsString;
use std::path::Path;
use std::process::Stdio;
use std::sync::Arc;

use axum::http::StatusCode;
use axum::http::header::{CACHE_CONTROL, CONTENT_TYPE};
use axum::response::{IntoResponse, Response};
use easyimmerse_conversion::{ConversionError, ConversionService};
use easyimmerse_core::media_file::{MediaFile, MediaFileSource};
use easyimmerse_media::{ContainerInfo, TrackInfo, TrackSelection, default_track_selection};
use easyimmerse_media_ffmpeg::{
    BinaryName, FfmpegError, FfmpegPaths, background_command, locate_binary,
};
use tokio::process::Command;

use crate::auth::error_body::{ApiFailure, bad_request, internal, not_found};
use crate::auth::token_kind::TokenKind;
use crate::local_path::resolve_local_file;
use crate::state::AppState;

pub const CONVERSION_UNAVAILABLE: &str = "conversion_unavailable";

/// The local path of a media file, once the token may read it and the file exists.
pub async fn resolve_source_path(
    state: &AppState,
    token: TokenKind,
    media_file: &MediaFile,
) -> Result<String, ApiFailure> {
    let path = match &media_file.source {
        MediaFileSource::Path { path } => path.clone(),
        MediaFileSource::BrowserFile { .. } => return Err(not_resolvable()),
    };
    resolve_local_file(token, &state.config, &path).await?;
    Ok(path)
}

pub fn not_resolvable() -> ApiFailure {
    ApiFailure::new(
        StatusCode::NOT_FOUND,
        "not_resolvable",
        "the browser holds this file; the server cannot read it",
    )
}

pub fn conversion_unavailable() -> ApiFailure {
    ApiFailure::new(
        StatusCode::SERVICE_UNAVAILABLE,
        CONVERSION_UNAVAILABLE,
        "this server has no ffmpeg or no cache directory, so it cannot read the tracks of media files or convert them",
    )
}

pub fn require_conversion(state: &AppState) -> Result<&ConversionService, ApiFailure> {
    state.conversion.as_ref().ok_or_else(conversion_unavailable)
}

/// Probes a file through the probe cache; 400 when ffprobe cannot read it.
pub async fn probe_media(state: &AppState, path: &str) -> Result<Arc<ContainerInfo>, ApiFailure> {
    let probes = state.probes.as_ref().ok_or_else(conversion_unavailable)?;
    probes
        .probe(Path::new(path))
        .await
        .map_err(|error| match error {
            ConversionError::Ffmpeg(FfmpegError::BinaryNotFound(_)) => conversion_unavailable(),
            ConversionError::SourceUnreadable { .. } => not_found(error.to_string()),
            other => bad_request(format!("the file could not be probed: {other}")),
        })
}

/// The saved audio track when the file has one, else the default audio track.
pub fn chosen_audio_track<'a>(
    container: &'a ContainerInfo,
    media_file: &MediaFile,
) -> Option<&'a TrackInfo> {
    let saved = saved_track_selection(media_file).and_then(|selection| selection.audio);
    saved
        .or(default_track_selection(container).audio)
        .and_then(|index| container.track(index))
}

/// The saved video track when the file has one, else the default video track.
pub fn chosen_video_track<'a>(
    container: &'a ContainerInfo,
    media_file: &MediaFile,
) -> Option<&'a TrackInfo> {
    let saved = saved_track_selection(media_file).and_then(|selection| selection.video);
    saved
        .or(default_track_selection(container).video)
        .and_then(|index| container.track(index))
}

fn saved_track_selection(media_file: &MediaFile) -> Option<TrackSelection> {
    media_file
        .track_selection_json
        .as_deref()
        .and_then(|json| serde_json::from_str::<TrackSelection>(json).ok())
}

/// Converts a time in milliseconds to the microseconds ffmpeg takes, saturating at the largest value.
pub fn micros(ms: u64) -> i64 {
    i64::try_from(ms.saturating_mul(1000)).unwrap_or(i64::MAX)
}

/// The path of the ffmpeg binary; 503 when this server has none.
pub fn locate_ffmpeg() -> Result<std::path::PathBuf, ApiFailure> {
    locate_binary(BinaryName::Ffmpeg, &FfmpegPaths::default()).map_err(|_| conversion_unavailable())
}

/// A response carrying media rendered from a media file, which the client may keep for a day.
pub fn rendered_media_response(content_type: &'static str, bytes: Vec<u8>) -> Response {
    (
        StatusCode::OK,
        [
            (CONTENT_TYPE, content_type),
            (CACHE_CONTROL, "private, max-age=86400"),
        ],
        bytes,
    )
        .into_response()
}

/// Runs ffmpeg with `args` and returns what it wrote to standard output.
pub async fn run_ffmpeg_to_stdout(
    ffmpeg: &Path,
    args: Vec<OsString>,
) -> Result<Vec<u8>, FfmpegError> {
    let mut command = background_command(ffmpeg);
    command.args(args);
    let output = Command::from(command)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .output()
        .await
        .map_err(|source| FfmpegError::Spawn {
            binary: BinaryName::Ffmpeg,
            source,
        })?;
    if !output.status.success() {
        return Err(FfmpegError::Failed {
            binary: BinaryName::Ffmpeg,
            status: output.status,
            stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        });
    }
    Ok(output.stdout)
}

/// Maps the errors of the conversion routes.
pub fn conversion_failure(error: ConversionError) -> ApiFailure {
    match error {
        ConversionError::UnknownKey(_) | ConversionError::UnknownSegment { .. } => {
            not_found(error.to_string())
        }
        ConversionError::SourceUnreadable { .. } => not_found(error.to_string()),
        ConversionError::SegmentTimeout { .. } => ApiFailure::new(
            StatusCode::GATEWAY_TIMEOUT,
            "segment_timeout",
            error.to_string(),
        ),
        ConversionError::Ffmpeg(FfmpegError::BinaryNotFound(_)) => conversion_unavailable(),
        ConversionError::RunFailed { .. }
        | ConversionError::SegmentNotProduced { .. }
        | ConversionError::Ffmpeg(_) => ApiFailure::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            "conversion_failed",
            error.to_string(),
        ),
        ConversionError::InvalidWaveformWindow(_) => bad_request(error.to_string()),
        other => internal(other.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_an_unknown_key_to_not_found() {
        let failure = conversion_failure(ConversionError::UnknownKey("k".to_owned()));
        assert_eq!(failure.status, StatusCode::NOT_FOUND);
    }

    #[test]
    fn maps_a_segment_timeout_to_gateway_timeout() {
        let failure = conversion_failure(ConversionError::SegmentTimeout {
            key: "k".to_owned(),
            index: 1,
            timeout: std::time::Duration::from_secs(1),
        });
        assert_eq!(failure.status, StatusCode::GATEWAY_TIMEOUT);
    }

    #[test]
    fn maps_a_failed_run_to_an_internal_error_with_its_own_code() {
        let failure = conversion_failure(ConversionError::RunFailed {
            key: "k".to_owned(),
            stderr: String::new(),
        });
        assert_eq!(failure.error.code, "conversion_failed");
    }

    #[test]
    fn maps_a_segment_no_run_produced_to_the_failed_run_code() {
        let failure = conversion_failure(ConversionError::SegmentNotProduced {
            key: "k".to_owned(),
            segment: "s00001.m4s".to_owned(),
            runs: 3,
            stderr: String::new(),
        });
        assert_eq!(failure.error.code, "conversion_failed");
    }
}

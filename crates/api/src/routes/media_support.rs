//! What the media routes share: resolving a media file to a readable local path, probing it,
//! and turning conversion errors into responses.

use std::path::Path;
use std::sync::Arc;

use axum::http::StatusCode;
use easyimmerse_conversion::{ConversionError, ConversionService};
use easyimmerse_core::media_file::{MediaFile, MediaFileSource};
use easyimmerse_media::ContainerInfo;
use easyimmerse_media_ffmpeg::FfmpegError;

use crate::auth::error_body::{ApiFailure, bad_request, internal, not_found};
use crate::auth::token_kind::TokenKind;
use crate::local_path::ensure_local_file_exists;
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
    ensure_local_file_exists(token, &state.config, &path).await?;
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

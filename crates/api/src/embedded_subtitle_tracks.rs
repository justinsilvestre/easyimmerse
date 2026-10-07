//! Adds the text subtitle tracks inside a local media file as its subtitle tracks.

use std::path::Path;
use std::process::Stdio;

use easyimmerse_core::media_file::MediaFile;
use easyimmerse_core::subtitle_track::AddSubtitleTrackRequest;
use easyimmerse_core::text_source::TextSource;
use easyimmerse_core::timed_text::{TimedTextFormat, clean_converted_srt};
use easyimmerse_media::{TrackInfo, TrackKind, text_subtitle_format};
use easyimmerse_media_ffmpeg::{
    BinaryName, FfmpegError, FfmpegPaths, background_command, locate_binary,
    subtitle_extraction_args,
};
use tokio::process::Command;

use crate::auth::error_body::ApiFailure;
use crate::auth::token_kind::TokenKind;
use crate::routes::media_support::{conversion_unavailable, probe_media};
use crate::routes::subtitles::store_subtitle_track;
use crate::state::AppState;

/// Converts each text subtitle track in the media file at `path` to SubRip and adds it as a
/// track of the media file, without giving it a role. Tracks made of pictures, such as PGS
/// tracks, are skipped, as is any track that ffmpeg cannot convert.
pub async fn add_embedded_subtitle_tracks(
    state: &AppState,
    token: TokenKind,
    media_file: &MediaFile,
    path: &str,
) -> Result<(), ApiFailure> {
    let container = probe_media(state, path).await?;
    let ffmpeg = locate_binary(BinaryName::Ffmpeg, &FfmpegPaths::default())
        .map_err(|_| conversion_unavailable())?;
    for (position, track) in container.tracks_of_kind(TrackKind::Subtitle).enumerate() {
        let Some(format) = text_subtitle_format(track) else {
            continue;
        };
        match extract_srt(&ffmpeg, Path::new(path), track.index).await {
            Ok(srt) => {
                let request = AddSubtitleTrackRequest {
                    name: embedded_track_name(position + 1, track),
                    source: TextSource::Inline {
                        text: clean_converted_srt(&srt, format),
                    },
                    format: Some(TimedTextFormat::Srt),
                    role: None,
                };
                add_track(state, token, media_file, request).await;
            }
            Err(error) => {
                tracing::warn!(
                    "skipped the embedded subtitle track {}: {error}",
                    track.index
                )
            }
        }
    }
    Ok(())
}

async fn extract_srt(
    ffmpeg: &Path,
    source: &Path,
    stream_index: u32,
) -> Result<String, FfmpegError> {
    let mut command = background_command(ffmpeg);
    command.args(subtitle_extraction_args(source, stream_index));
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
    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

/// Names a track by its position among the file's subtitle tracks, its title, and its
/// language, as in `Embedded track 1: SDH (eng)`.
fn embedded_track_name(number: usize, track: &TrackInfo) -> String {
    let title = track
        .title
        .as_deref()
        .map(|title| format!(": {title}"))
        .unwrap_or_default();
    let language = track
        .language
        .as_deref()
        .map(|language| format!(" ({language})"))
        .unwrap_or_default();
    format!("Embedded track {number}{title}{language}")
}

async fn add_track(
    state: &AppState,
    token: TokenKind,
    media_file: &MediaFile,
    request: AddSubtitleTrackRequest,
) {
    let name = request.name.clone();
    if let Err(failure) = store_subtitle_track(state, token, media_file.id.clone(), request).await {
        tracing::warn!("skipped {name:?}: {}", failure.error.message);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_a_track_by_its_title_and_language() {
        let track = TrackInfo {
            title: Some("SDH".to_owned()),
            language: Some("eng".to_owned()),
            ..TrackInfo::default()
        };
        assert_eq!(
            embedded_track_name(1, &track),
            "Embedded track 1: SDH (eng)"
        );
    }

    #[test]
    fn names_a_track_without_a_title_or_language_by_its_number() {
        assert_eq!(
            embedded_track_name(2, &TrackInfo::default()),
            "Embedded track 2"
        );
    }
}

//! A window of a media file's audio as an AAC clip in MP4, for the sentence audio of flashcards.

use std::path::Path as FilePath;

use axum::Extension;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::Response;
use easyimmerse_core::media_file::{MediaFile, MediaFileId, MediaFileSource};
use easyimmerse_core::project::ProjectId;
use easyimmerse_media_ffmpeg::{AudioClipExtract, FfmpegError, audio_clip_args};
use serde::Deserialize;
use utoipa::IntoParams;

use crate::auth::error_body::{ApiError, ApiFailure, bad_request, not_found};
use crate::auth::principal::Principal;
use crate::library_cues::preprocessed_clip;
use crate::routes::media::load_media_file;
use crate::routes::media_support::{
    chosen_audio_track, locate_ffmpeg, micros, probe_media, rendered_media_response,
    resolve_source_path, run_ffmpeg_to_stdout,
};
use crate::state::AppState;

/// The longest clip the route encodes, in milliseconds. Flashcard audio is a sentence.
pub const MAX_CLIP_MS: u64 = 120_000;

/// The matched path of the clip route,
/// which the bearer middleware lets authenticate with a `token` query parameter.
pub const CLIP_ROUTE_PATH: &str = "/projects/{id}/media/{media_id}/clip";

#[derive(Debug, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct ClipQuery {
    /// The clip start in player time, in milliseconds.
    pub start_ms: u64,
    /// The clip end in player time, in milliseconds; after the start.
    /// An end past the end of the media is moved back to it.
    /// The clip may not be longer than 120000 milliseconds.
    pub end_ms: u64,
    /// The bearer token, for audio elements, which cannot send headers.
    #[allow(dead_code)]
    pub token: Option<String>,
}

/// Returns the window of the chosen audio track, else of the default audio track,
/// encoded as AAC in an MP4 file. For a media file from the library, only the exact window of one of its cues is served,
/// from the clip rendered for that cue.
#[utoipa::path(
    get,
    path = "/projects/{id}/media/{media_id}/clip",
    tag = "media",
    operation_id = "getMediaClip",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
        ClipQuery,
    ),
    responses(
        (status = 200, description = "The clip", body = Vec<u8>, content_type = "audio/mp4"),
        (status = 400, description = "The end is not after the start (or the start is past the media), the clip is longer than 120000 milliseconds, or the file could not be probed", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "The token may not read local paths", body = ApiError),
        (status = 404, description = "No such media file, no file at its path, a browser-held file (code `not_resolvable`), a file without audio, or a library media file and a window that is not one of its cues (code `not_preprocessed`)", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 500, description = "ffmpeg failed (code `clip_failed`)", body = ApiError),
        (status = 503, description = "This server has no ffmpeg (code `conversion_unavailable`)", body = ApiError),
    ),
)]
pub async fn get_media_clip(
    State(state): State<AppState>,
    Extension(principal): Extension<Principal>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
    Query(query): Query<ClipQuery>,
) -> Result<Response, ApiFailure> {
    let media_file = load_media_file(&state, project_id, media_id).await?;
    let clip = render_clip(
        &state,
        &principal,
        &media_file,
        query.start_ms,
        query.end_ms,
    )
    .await?;
    Ok(rendered_media_response("audio/mp4", clip))
}

/// Encodes the window from `start_ms` to `end_ms` in player time of the media file's chosen audio track,
/// else its default audio track, as AAC in a fragmented MP4 file.
/// A media file from the library answers with the clip rendered for its item's cue of that window.
pub async fn render_clip(
    state: &AppState,
    principal: &Principal,
    media_file: &MediaFile,
    start_ms: u64,
    end_ms: u64,
) -> Result<Vec<u8>, ApiFailure> {
    if let MediaFileSource::Library { item_id } = &media_file.source {
        return preprocessed_clip(state, item_id, start_ms, end_ms).await;
    }
    let path = resolve_source_path(state, principal, media_file).await?;
    let selection = media_file.track_selection_json.as_deref();
    render_clip_at(state, &path, selection, start_ms, end_ms).await
}

/// Encodes the window of the file at `path` as `render_clip` does, choosing the audio track by the saved track selection.
pub async fn render_clip_at(
    state: &AppState,
    path: &str,
    track_selection_json: Option<&str>,
    start_ms: u64,
    end_ms: u64,
) -> Result<Vec<u8>, ApiFailure> {
    if end_ms <= start_ms {
        return Err(bad_request("the clip must end after it starts"));
    }
    let container = probe_media(state, path).await?;
    let duration_ms = clip_duration_ms(start_ms, end_ms, container.duration_ms)?;
    let track = chosen_audio_track(&container, track_selection_json)
        .ok_or_else(|| not_found("the media file has no audio track"))?;
    let args = audio_clip_args(&AudioClipExtract {
        source: FilePath::new(path),
        stream_index: track.index,
        start_micros: micros(start_ms),
        duration_micros: micros(duration_ms),
    });
    run_ffmpeg_to_stdout(&locate_ffmpeg(state)?, args)
        .await
        .map_err(clip_failed)
}

/// The length of the clip once its end is limited to the media's duration, when that is known.
fn clip_duration_ms(
    start_ms: u64,
    end_ms: u64,
    media_duration_ms: Option<u64>,
) -> Result<u64, ApiFailure> {
    let end_ms = media_duration_ms.map_or(end_ms, |duration| end_ms.min(duration));
    let duration_ms = end_ms
        .checked_sub(start_ms)
        .filter(|duration| *duration > 0)
        .ok_or_else(|| bad_request("the clip must end after it starts, within the media"))?;
    if duration_ms > MAX_CLIP_MS {
        return Err(bad_request(format!(
            "the clip may not be longer than {MAX_CLIP_MS} milliseconds"
        )));
    }
    Ok(duration_ms)
}

fn clip_failed(error: FfmpegError) -> ApiFailure {
    ApiFailure::new(
        StatusCode::INTERNAL_SERVER_ERROR,
        "clip_failed",
        error.to_string(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn limits_the_end_to_the_media_duration() {
        assert_eq!(
            clip_duration_ms(1_000, 90_000, Some(4_000)).ok(),
            Some(3_000)
        );
    }

    #[test]
    fn keeps_the_end_when_the_media_duration_is_unknown() {
        assert_eq!(clip_duration_ms(1_000, 3_000, None).ok(), Some(2_000));
    }

    #[test]
    fn rejects_a_start_past_the_media_duration() {
        let failure = clip_duration_ms(5_000, 6_000, Some(4_000)).err();
        assert_eq!(failure.map(|f| f.status), Some(StatusCode::BAD_REQUEST));
    }

    #[test]
    fn rejects_a_clip_longer_than_the_maximum() {
        let failure = clip_duration_ms(0, MAX_CLIP_MS + 1, None).err();
        assert_eq!(failure.map(|f| f.status), Some(StatusCode::BAD_REQUEST));
    }

    #[test]
    fn accepts_a_clip_of_exactly_the_maximum() {
        assert_eq!(
            clip_duration_ms(0, MAX_CLIP_MS, None).ok(),
            Some(MAX_CLIP_MS)
        );
    }
}

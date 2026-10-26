//! One frame of a media file's video as a JPEG image, for flashcard screenshots.

use std::path::Path as FilePath;

use axum::Extension;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::Response;
use easyimmerse_core::media_file::{MediaFile, MediaFileId, MediaFileSource};
use easyimmerse_core::project::ProjectId;
use easyimmerse_media_ffmpeg::{FfmpegError, FrameGrab, frame_grab_args};
use serde::Deserialize;
use utoipa::IntoParams;

use crate::auth::error_body::{ApiError, ApiFailure, not_found};
use crate::auth::principal::Principal;
use crate::library_cues::preprocessed_frame;
use crate::routes::media::load_media_file;
use crate::routes::media_support::{
    chosen_video_track, locate_ffmpeg, micros, probe_media, rendered_media_response,
    resolve_source_path, run_ffmpeg_to_stdout,
};
use crate::state::AppState;

/// The matched path of the frame route,
/// which the bearer middleware lets authenticate with a `token` query parameter.
pub const FRAME_ROUTE_PATH: &str = "/projects/{id}/media/{media_id}/frame";

/// Frames are scaled down to this width, which suits a flashcard.
const FRAME_MAX_WIDTH: u32 = 640;

#[derive(Debug, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct FrameQuery {
    /// The moment in player time, in milliseconds.
    pub at_ms: u64,
    /// The bearer token, for image elements, which cannot send headers.
    #[allow(dead_code)]
    pub token: Option<String>,
}

/// Returns the frame of the chosen video track at the given time, else of the default video track,
/// as a JPEG image at most 640 pixels wide. For a media file from the library, only the screenshot time of one of its cues
/// is served, from the screenshot rendered for that cue.
#[utoipa::path(
    get,
    path = "/projects/{id}/media/{media_id}/frame",
    tag = "media",
    operation_id = "getMediaFrame",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
        FrameQuery,
    ),
    responses(
        (status = 200, description = "The frame", body = Vec<u8>, content_type = "image/jpeg"),
        (status = 400, description = "The file could not be probed", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "The token may not read local paths", body = ApiError),
        (status = 404, description = "No such media file, no file at its path, a browser-held file (code `not_resolvable`), a file without video, or a library media file and a time that is not the screenshot time of one of its cues (code `not_preprocessed`)", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 500, description = "ffmpeg failed (code `frame_failed`)", body = ApiError),
        (status = 503, description = "This server has no ffmpeg (code `conversion_unavailable`)", body = ApiError),
    ),
)]
pub async fn get_media_frame(
    State(state): State<AppState>,
    Extension(principal): Extension<Principal>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
    Query(query): Query<FrameQuery>,
) -> Result<Response, ApiFailure> {
    let media_file = load_media_file(&state, project_id, media_id).await?;
    let jpeg = render_frame(&state, &principal, &media_file, query.at_ms).await?;
    Ok(rendered_media_response("image/jpeg", jpeg))
}

/// Grabs the frame of the media file's chosen video track, else its default video track, at `at_ms` in player time,
/// as a JPEG image at most 640 pixels wide.
/// A media file from the library answers with the screenshot rendered for its item's cue at that time.
pub async fn render_frame(
    state: &AppState,
    principal: &Principal,
    media_file: &MediaFile,
    at_ms: u64,
) -> Result<Vec<u8>, ApiFailure> {
    if let MediaFileSource::Library { item_id } = &media_file.source {
        return preprocessed_frame(state, item_id, at_ms).await;
    }
    let path = resolve_source_path(state, principal, media_file).await?;
    let selection = media_file.track_selection_json.as_deref();
    render_frame_at(state, &path, selection, at_ms).await
}

/// Grabs the frame of the file at `path` as `render_frame` does, choosing the video track by the saved track selection.
pub async fn render_frame_at(
    state: &AppState,
    path: &str,
    track_selection_json: Option<&str>,
    at_ms: u64,
) -> Result<Vec<u8>, ApiFailure> {
    let container = probe_media(state, path).await?;
    let track = chosen_video_track(&container, track_selection_json)
        .ok_or_else(|| not_found("the media file has no video track"))?;
    let args = frame_grab_args(&FrameGrab {
        source: FilePath::new(path),
        stream_index: track.index,
        at_micros: micros(at_ms),
        max_width: FRAME_MAX_WIDTH,
    });
    let jpeg = run_ffmpeg_to_stdout(&locate_ffmpeg(state)?, args)
        .await
        .map_err(frame_failed)?;
    if jpeg.is_empty() {
        return Err(not_found("the video has no frame at that time"));
    }
    Ok(jpeg)
}

fn frame_failed(error: FfmpegError) -> ApiFailure {
    ApiFailure::new(
        StatusCode::INTERNAL_SERVER_ERROR,
        "frame_failed",
        error.to_string(),
    )
}

//! A window of a media file's audio as an AAC clip in MP4, for the sentence audio of flashcards.

use std::path::Path as FilePath;

use axum::Extension;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::Response;
use easyimmerse_core::media_file::{MediaFile, MediaFileId};
use easyimmerse_core::project::ProjectId;
use easyimmerse_media_ffmpeg::{AudioClipExtract, FfmpegError, audio_clip_args};
use serde::Deserialize;
use utoipa::IntoParams;

use crate::auth::error_body::{ApiError, ApiFailure, bad_request, not_found};
use crate::auth::token_kind::TokenKind;
use crate::routes::media::load_media_file;
use crate::routes::media_support::{
    chosen_audio_track, locate_ffmpeg, probe_media, rendered_media_response, resolve_source_path,
    run_ffmpeg_to_stdout,
};
use crate::state::AppState;

/// The matched path of the clip route,
/// which the bearer middleware lets authenticate with a `token` query parameter.
pub const CLIP_ROUTE_PATH: &str = "/projects/{id}/media/{media_id}/clip";

#[derive(Debug, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct ClipQuery {
    /// The clip start in player time, in milliseconds.
    pub start_ms: u64,
    /// The clip end in player time, in milliseconds; after the start.
    pub end_ms: u64,
    /// The bearer token, for audio elements, which cannot send headers.
    #[allow(dead_code)]
    pub token: Option<String>,
}

/// Returns the window of the chosen audio track, else of the default audio track,
/// encoded as AAC in an MP4 file.
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
        (status = 400, description = "The end is not after the start, or the file could not be probed", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "The token may not read local paths", body = ApiError),
        (status = 404, description = "No such media file, no file at its path, a browser-held file (code `not_resolvable`), or a file without audio", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 500, description = "ffmpeg failed (code `clip_failed`)", body = ApiError),
        (status = 503, description = "This server has no ffmpeg (code `conversion_unavailable`)", body = ApiError),
    ),
)]
pub async fn get_media_clip(
    State(state): State<AppState>,
    Extension(token): Extension<TokenKind>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
    Query(query): Query<ClipQuery>,
) -> Result<Response, ApiFailure> {
    let media_file = load_media_file(&state, project_id, media_id).await?;
    let clip = render_clip(&state, token, &media_file, query.start_ms, query.end_ms).await?;
    Ok(rendered_media_response("audio/mp4", clip))
}

/// Encodes the window from `start_ms` to `end_ms` in player time of the media file's chosen audio track,
/// else its default audio track, as AAC in a fragmented MP4 file.
pub async fn render_clip(
    state: &AppState,
    token: TokenKind,
    media_file: &MediaFile,
    start_ms: u64,
    end_ms: u64,
) -> Result<Vec<u8>, ApiFailure> {
    if end_ms <= start_ms {
        return Err(bad_request("the clip must end after it starts"));
    }
    let path = resolve_source_path(state, token, media_file).await?;
    let container = probe_media(state, &path).await?;
    let track = chosen_audio_track(&container, media_file)
        .ok_or_else(|| not_found("the media file has no audio track"))?;
    let args = audio_clip_args(&AudioClipExtract {
        source: FilePath::new(&path),
        stream_index: track.index,
        start_micros: micros(start_ms),
        duration_micros: micros(end_ms - start_ms),
    });
    run_ffmpeg_to_stdout(&locate_ffmpeg()?, args)
        .await
        .map_err(clip_failed)
}

fn micros(ms: u64) -> i64 {
    i64::try_from(ms.saturating_mul(1000)).unwrap_or(i64::MAX)
}

fn clip_failed(error: FfmpegError) -> ApiFailure {
    ApiFailure::new(
        StatusCode::INTERNAL_SERVER_ERROR,
        "clip_failed",
        error.to_string(),
    )
}

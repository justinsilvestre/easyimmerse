//! One frame of a media file's video as a JPEG image, for flashcard screenshots.

use std::path::Path as FilePath;
use std::process::Stdio;

use axum::Extension;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::http::header::{CACHE_CONTROL, CONTENT_TYPE};
use axum::response::{IntoResponse, Response};
use easyimmerse_core::media_file::{MediaFile, MediaFileId};
use easyimmerse_core::project::ProjectId;
use easyimmerse_media::{ContainerInfo, TrackInfo, TrackSelection, default_track_selection};
use easyimmerse_media_ffmpeg::{
    BinaryName, FfmpegError, FfmpegPaths, FrameGrab, background_command, frame_grab_args,
    locate_binary,
};
use serde::Deserialize;
use tokio::process::Command;
use utoipa::IntoParams;

use crate::auth::error_body::{ApiError, ApiFailure, not_found};
use crate::auth::token_kind::TokenKind;
use crate::routes::media::load_media_file;
use crate::routes::media_support::{conversion_unavailable, probe_media, resolve_source_path};
use crate::state::AppState;

/// The matched path of the frame route, which the bearer middleware lets authenticate with
/// a `token` query parameter.
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

/// Returns the frame of the chosen video track at the given time, else of the default video
/// track, as a JPEG image at most 640 pixels wide.
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
        (status = 404, description = "No such media file, no file at its path, a browser-held file (code `not_resolvable`), or a file without video", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 500, description = "ffmpeg failed (code `frame_failed`)", body = ApiError),
        (status = 503, description = "This server has no ffmpeg (code `conversion_unavailable`)", body = ApiError),
    ),
)]
pub async fn get_media_frame(
    State(state): State<AppState>,
    Extension(token): Extension<TokenKind>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
    Query(query): Query<FrameQuery>,
) -> Result<Response, ApiFailure> {
    let media_file = load_media_file(&state, project_id, media_id).await?;
    let path = resolve_source_path(&state, token, &media_file).await?;
    let container = probe_media(&state, &path).await?;
    let track = chosen_video_track(&container, &media_file)
        .ok_or_else(|| not_found("the media file has no video track"))?;
    let ffmpeg = locate_binary(BinaryName::Ffmpeg, &FfmpegPaths::default())
        .map_err(|_| conversion_unavailable())?;
    let jpeg = grab_frame(&ffmpeg, FilePath::new(&path), track, query.at_ms).await?;
    Ok((
        StatusCode::OK,
        [
            (CONTENT_TYPE, "image/jpeg"),
            (CACHE_CONTROL, "private, max-age=86400"),
        ],
        jpeg,
    )
        .into_response())
}

async fn grab_frame(
    ffmpeg: &FilePath,
    source: &FilePath,
    track: &TrackInfo,
    at_ms: u64,
) -> Result<Vec<u8>, ApiFailure> {
    let args = frame_grab_args(&FrameGrab {
        source,
        stream_index: track.index,
        at_micros: i64::try_from(at_ms.saturating_mul(1000)).unwrap_or(i64::MAX),
        max_width: FRAME_MAX_WIDTH,
    });
    let mut command = background_command(ffmpeg);
    command.args(args);
    let output = Command::from(command)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .output()
        .await
        .map_err(|source| {
            frame_failed(FfmpegError::Spawn {
                binary: BinaryName::Ffmpeg,
                source,
            })
        })?;
    if !output.status.success() {
        return Err(frame_failed(FfmpegError::Failed {
            binary: BinaryName::Ffmpeg,
            status: output.status,
            stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        }));
    }
    if output.stdout.is_empty() {
        return Err(not_found("the video has no frame at that time"));
    }
    Ok(output.stdout)
}

/// The saved video track when the file has one, else the default video track.
fn chosen_video_track<'a>(
    container: &'a ContainerInfo,
    media_file: &MediaFile,
) -> Option<&'a TrackInfo> {
    let saved = media_file
        .track_selection_json
        .as_deref()
        .and_then(|json| serde_json::from_str::<TrackSelection>(json).ok())
        .and_then(|selection| selection.video);
    saved
        .or(default_track_selection(container).video)
        .and_then(|index| container.track(index))
}

fn frame_failed(error: FfmpegError) -> ApiFailure {
    ApiFailure::new(
        StatusCode::INTERNAL_SERVER_ERROR,
        "frame_failed",
        error.to_string(),
    )
}

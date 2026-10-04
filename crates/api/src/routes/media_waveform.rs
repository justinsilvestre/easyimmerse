//! Waveform peaks of a window of a media file's audio.

use std::path::Path as FilePath;

use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::{Extension, Json};
use easyimmerse_conversion::ConversionError;
use easyimmerse_core::media_file::{MediaFile, MediaFileId};
use easyimmerse_core::project::ProjectId;
use easyimmerse_media::{
    ContainerInfo, TrackInfo, TrackSelection, WaveformResponse, default_track_selection,
};
use serde::Deserialize;
use utoipa::IntoParams;

use crate::auth::error_body::{ApiError, ApiFailure, bad_request};
use crate::auth::token_kind::TokenKind;
use crate::routes::media::load_media_file;
use crate::routes::media_support::{probe_media, resolve_source_path};
use crate::state::AppState;

#[derive(Debug, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct WaveformQuery {
    /// The window start in player time, in milliseconds.
    pub start_ms: u64,
    /// The window end in player time, in milliseconds; at most five minutes after the start.
    pub end_ms: u64,
}

/// Returns 100 peaks per second of the window, from the audio track the user chose for the
/// file, else its default audio track. A file without audio yields no peaks.
#[utoipa::path(
    get,
    path = "/projects/{id}/media/{media_id}/waveform",
    tag = "media",
    operation_id = "getMediaWaveform",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
        WaveformQuery,
    ),
    responses(
        (status = 200, description = "The window's peaks", body = WaveformResponse),
        (status = 400, description = "The window is inverted or longer than five minutes, or the file could not be probed", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "The token may not read local paths", body = ApiError),
        (status = 404, description = "No such media file, no file at its path, or a browser-held file (code `not_resolvable`)", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 500, description = "Decoding failed (code `waveform_failed`)", body = ApiError),
        (status = 503, description = "This server has no ffmpeg or no cache directory (code `waveform_unavailable`)", body = ApiError),
    ),
)]
pub async fn get_media_waveform(
    State(state): State<AppState>,
    Extension(token): Extension<TokenKind>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
    Query(query): Query<WaveformQuery>,
) -> Result<Json<WaveformResponse>, ApiFailure> {
    let media_file = load_media_file(&state, project_id, media_id).await?;
    let path = resolve_source_path(&state, token, &media_file).await?;
    let service = state.conversion.as_ref().ok_or_else(waveform_unavailable)?;
    let container = probe_media(&state, &path).await?;
    let Some(track) = chosen_audio_track(&container, &media_file) else {
        return Ok(Json(WaveformResponse {
            start_ms: query.start_ms,
            peaks: Vec::new(),
        }));
    };
    let response = service
        .waveform(FilePath::new(&path), track, query.start_ms, query.end_ms)
        .await
        .map_err(|error| match error {
            ConversionError::InvalidWaveformWindow(_) => bad_request(error.to_string()),
            other => waveform_failed(other),
        })?;
    Ok(Json(response))
}

/// The saved audio track when the file has one, else the default audio track.
fn chosen_audio_track<'a>(
    container: &'a ContainerInfo,
    media_file: &MediaFile,
) -> Option<&'a TrackInfo> {
    let saved = media_file
        .track_selection_json
        .as_deref()
        .and_then(|json| serde_json::from_str::<TrackSelection>(json).ok())
        .and_then(|selection| selection.audio);
    saved
        .or(default_track_selection(container).audio)
        .and_then(|index| container.track(index))
}

fn waveform_unavailable() -> ApiFailure {
    ApiFailure::new(
        StatusCode::SERVICE_UNAVAILABLE,
        "waveform_unavailable",
        "this server has no ffmpeg or no cache directory, so it cannot decode audio",
    )
}

fn waveform_failed(error: ConversionError) -> ApiFailure {
    ApiFailure::new(
        StatusCode::INTERNAL_SERVER_ERROR,
        "waveform_failed",
        error.to_string(),
    )
}

//! The tracks inside a media file, and the user's saved choice among them.

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::{Extension, Json};
use easyimmerse_core::media_file::MediaFileId;
use easyimmerse_core::project::ProjectId;
use easyimmerse_media::{
    TrackInfo, TrackKind, TrackSelection, TracksResponse, default_track_selection, direct_mime_type,
};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure, internal};
use crate::auth::token_kind::TokenKind;
use crate::routes::media::load_media_file;
use crate::routes::media_support::{probe_media, resolve_source_path};
use crate::state::AppState;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct EmbeddedSubtitleTracksResponse {
    pub tracks: Vec<TrackInfo>,
}

#[utoipa::path(
    get,
    path = "/projects/{id}/media/{media_id}/tracks",
    tag = "media",
    operation_id = "getMediaTracks",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
    ),
    responses(
        (status = 200, description = "The probed container, the default track selection, and the MIME type for `canPlayType`", body = TracksResponse),
        (status = 400, description = "The file could not be probed", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "The token may not read local paths", body = ApiError),
        (status = 404, description = "No such media file, no file at its path, or a browser-held file (code `not_resolvable`)", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 503, description = "This server cannot probe media (code `conversion_unavailable`)", body = ApiError),
    ),
)]
pub async fn get_media_tracks(
    State(state): State<AppState>,
    Extension(token): Extension<TokenKind>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
) -> Result<Json<TracksResponse>, ApiFailure> {
    let media_file = load_media_file(&state, project_id, media_id).await?;
    let path = resolve_source_path(&state, token, &media_file).await?;
    let container = probe_media(&state, &path).await?;
    let default_selection = default_track_selection(&container);
    Ok(Json(TracksResponse {
        direct_mime_type: direct_mime_type(&container, &default_selection),
        default_selection,
        container: (*container).clone(),
    }))
}

#[utoipa::path(
    get,
    path = "/projects/{id}/media/{media_id}/embedded-subtitles",
    tag = "media",
    operation_id = "listEmbeddedSubtitleTracks",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
    ),
    responses(
        (status = 200, description = "The subtitle tracks embedded in the file, which cannot be shown yet", body = EmbeddedSubtitleTracksResponse),
        (status = 400, description = "The file could not be probed", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "The token may not read local paths", body = ApiError),
        (status = 404, description = "No such media file, no file at its path, or a browser-held file (code `not_resolvable`)", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 503, description = "This server cannot probe media (code `conversion_unavailable`)", body = ApiError),
    ),
)]
pub async fn list_embedded_subtitle_tracks(
    State(state): State<AppState>,
    Extension(token): Extension<TokenKind>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
) -> Result<Json<EmbeddedSubtitleTracksResponse>, ApiFailure> {
    let media_file = load_media_file(&state, project_id, media_id).await?;
    let path = resolve_source_path(&state, token, &media_file).await?;
    let container = probe_media(&state, &path).await?;
    Ok(Json(EmbeddedSubtitleTracksResponse {
        tracks: container
            .tracks_of_kind(TrackKind::Subtitle)
            .cloned()
            .collect(),
    }))
}

#[utoipa::path(
    put,
    path = "/projects/{id}/media/{media_id}/track-selection",
    tag = "media",
    operation_id = "setMediaTrackSelection",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
    ),
    request_body = TrackSelection,
    responses(
        (status = 204, description = "The choice was saved"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such media file in the project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn set_media_track_selection(
    State(state): State<AppState>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
    Json(selection): Json<TrackSelection>,
) -> Result<StatusCode, ApiFailure> {
    load_media_file(&state, project_id, media_id.clone()).await?;
    let json = serde_json::to_string(&selection)
        .map_err(|error| internal(format!("could not encode the track selection: {error}")))?;
    state
        .with_storage(move |storage| storage.set_track_selection_json(&media_id, Some(&json)))
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    delete,
    path = "/projects/{id}/media/{media_id}/track-selection",
    tag = "media",
    operation_id = "clearMediaTrackSelection",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
    ),
    responses(
        (status = 204, description = "The choice was cleared"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such media file in the project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn clear_media_track_selection(
    State(state): State<AppState>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
) -> Result<StatusCode, ApiFailure> {
    load_media_file(&state, project_id, media_id.clone()).await?;
    state
        .with_storage(move |storage| storage.set_track_selection_json(&media_id, None))
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

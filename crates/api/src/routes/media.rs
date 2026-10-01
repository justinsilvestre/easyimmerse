use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use easyimmerse_core::media_file::{
    MediaFile, MediaId, NewMediaFile, NewSubtitleTrack, SubtitleTrack,
};
use easyimmerse_core::project::ProjectId;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::clock::now_rfc3339;
use crate::state::AppState;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct UpdateMediaDurationRequest {
    pub duration_ms: u64,
}

#[utoipa::path(
    post,
    path = "/projects/{id}/media",
    tag = "media",
    operation_id = "addMediaFile",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    request_body = NewMediaFile,
    responses(
        (status = 201, description = "The registered media file", body = MediaFile),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No project has the id", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn add_media_file(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(media): Json<NewMediaFile>,
) -> Result<(StatusCode, Json<MediaFile>), ApiFailure> {
    let now = now_rfc3339();
    let media = state
        .with_storage(move |storage| storage.add_media_file(&ProjectId(id), &media, &now))
        .await?;
    Ok((StatusCode::CREATED, Json(media)))
}

#[utoipa::path(
    put,
    path = "/projects/{id}/media/{media_id}/duration",
    tag = "media",
    operation_id = "setMediaDuration",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
    ),
    request_body = UpdateMediaDurationRequest,
    responses(
        (status = 200, description = "The media file with its duration", body = MediaFile),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "The project has no media file with the id", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn set_media_duration(
    State(state): State<AppState>,
    Path((id, media_id)): Path<(String, String)>,
    Json(request): Json<UpdateMediaDurationRequest>,
) -> Result<Json<MediaFile>, ApiFailure> {
    let media = state
        .with_storage(move |storage| {
            storage.set_media_duration(&ProjectId(id), &MediaId(media_id), request.duration_ms)
        })
        .await?;
    Ok(Json(media))
}

#[utoipa::path(
    delete,
    path = "/projects/{id}/media/{media_id}",
    tag = "media",
    operation_id = "removeMediaFile",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
    ),
    responses(
        (status = 204, description = "The media file and its subtitle tracks were removed"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "The project has no media file with the id", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn remove_media_file(
    State(state): State<AppState>,
    Path((id, media_id)): Path<(String, String)>,
) -> Result<StatusCode, ApiFailure> {
    state
        .with_storage(move |storage| storage.remove_media_file(&ProjectId(id), &MediaId(media_id)))
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    post,
    path = "/projects/{id}/media/{media_id}/subtitle-tracks",
    tag = "media",
    operation_id = "addSubtitleTrack",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
    ),
    request_body = NewSubtitleTrack,
    responses(
        (status = 201, description = "The attached subtitle track", body = SubtitleTrack),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "The project has no media file with the id", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn add_subtitle_track(
    State(state): State<AppState>,
    Path((id, media_id)): Path<(String, String)>,
    Json(track): Json<NewSubtitleTrack>,
) -> Result<(StatusCode, Json<SubtitleTrack>), ApiFailure> {
    let track = state
        .with_storage(move |storage| {
            storage.add_subtitle_track(&ProjectId(id), &MediaId(media_id), &track)
        })
        .await?;
    Ok((StatusCode::CREATED, Json(track)))
}

#[utoipa::path(
    delete,
    path = "/projects/{id}/media/{media_id}/subtitle-tracks/{track_id}",
    tag = "media",
    operation_id = "removeSubtitleTrack",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
        ("track_id" = String, Path, description = "The subtitle track id"),
    ),
    responses(
        (status = 204, description = "The subtitle track was removed"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such media file or subtitle track", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn remove_subtitle_track(
    State(state): State<AppState>,
    Path((id, media_id, track_id)): Path<(String, String, String)>,
) -> Result<StatusCode, ApiFailure> {
    state
        .with_storage(move |storage| {
            storage.remove_subtitle_track(&ProjectId(id), &MediaId(media_id), &track_id)
        })
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

//! The media files of a project: listing, adding, and removing them.

use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::{Extension, extract};
use easyimmerse_core::media_file::{MediaFile, MediaFileId, MediaFileSource};
use easyimmerse_core::project::ProjectId;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure, not_found};
use crate::auth::token_kind::TokenKind;
use crate::local_path::ensure_local_file_exists;
use crate::state::AppState;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ListMediaFilesResponse {
    pub media_files: Vec<MediaFile>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AddMediaFileRequest {
    /// The name shown in the project's media list, usually the file name.
    pub name: String,
    pub source: MediaFileSource,
}

#[utoipa::path(
    get,
    path = "/projects/{id}/media",
    tag = "media",
    operation_id = "listMediaFiles",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    responses(
        (status = 200, description = "The project's media files, oldest first", body = ListMediaFilesResponse),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn list_media_files(
    State(state): State<AppState>,
    Path(project_id): Path<ProjectId>,
) -> Result<Json<ListMediaFilesResponse>, ApiFailure> {
    let media_files = state
        .with_storage(move |storage| storage.list_media_files(&project_id))
        .await?;
    Ok(Json(ListMediaFilesResponse { media_files }))
}

/// Adds a media file to a project. A `path` source must name an existing file on the
/// server's machine, which only a token allowed to read local paths may do.
#[utoipa::path(
    post,
    path = "/projects/{id}/media",
    tag = "media",
    operation_id = "addMediaFile",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    request_body = AddMediaFileRequest,
    responses(
        (status = 201, description = "The added media file", body = MediaFile),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "The token may not name local paths", body = ApiError),
        (status = 404, description = "No such project, or no file at the given path", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn add_media_file(
    State(state): State<AppState>,
    Extension(token): Extension<TokenKind>,
    Path(project_id): Path<ProjectId>,
    extract::Json(request): extract::Json<AddMediaFileRequest>,
) -> Result<(StatusCode, Json<MediaFile>), ApiFailure> {
    if let MediaFileSource::Path { path } = &request.source {
        ensure_local_file_exists(token, &state.config, path).await?;
    }
    let media_file = state
        .with_storage(move |storage| {
            storage.add_media_file(&project_id, &request.name, &request.source)
        })
        .await?;
    Ok((StatusCode::CREATED, Json(media_file)))
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
        (status = 204, description = "The media file was removed"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such media file in the project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn remove_media_file(
    State(state): State<AppState>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
) -> Result<StatusCode, ApiFailure> {
    load_media_file(&state, project_id, media_id.clone()).await?;
    state
        .with_storage(move |storage| storage.remove_media_file(&media_id))
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Loads a media file, answering 404 when it does not exist or belongs to another project.
pub async fn load_media_file(
    state: &AppState,
    project_id: ProjectId,
    media_id: MediaFileId,
) -> Result<MediaFile, ApiFailure> {
    let media_file = state
        .with_storage(move |storage| storage.get_media_file(&media_id))
        .await?;
    if media_file.project_id == project_id {
        Ok(media_file)
    } else {
        Err(not_found(format!(
            "no media file {:?} in project {:?}",
            media_file.id.0, project_id.0
        )))
    }
}

//! Projects: listing, creating, reading, changing, and deleting them.

use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use easyimmerse_core::media_file::MediaFileSource;
use easyimmerse_core::project::{Project, ProjectId, ProjectSettings};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::routes::media::remove_unreferenced_conversions;
use crate::state::AppState;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ListProjectsResponse {
    pub projects: Vec<Project>,
}

#[utoipa::path(
    get,
    path = "/projects",
    tag = "projects",
    operation_id = "listProjects",
    security(("bearer_token" = [])),
    responses(
        (status = 200, description = "Every project, most recently opened first", body = ListProjectsResponse),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn list_projects(
    State(state): State<AppState>,
) -> Result<Json<ListProjectsResponse>, ApiFailure> {
    let projects = state
        .with_storage(|storage| storage.list_projects())
        .await?;
    Ok(Json(ListProjectsResponse { projects }))
}

#[utoipa::path(
    post,
    path = "/projects",
    tag = "projects",
    operation_id = "createProject",
    security(("bearer_token" = [])),
    request_body = ProjectSettings,
    responses(
        (status = 201, description = "The created project", body = Project),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn create_project(
    State(state): State<AppState>,
    Json(settings): Json<ProjectSettings>,
) -> Result<(StatusCode, Json<Project>), ApiFailure> {
    let project = state
        .with_storage(move |storage| storage.create_project(&settings))
        .await?;
    Ok((StatusCode::CREATED, Json(project)))
}

#[utoipa::path(
    get,
    path = "/projects/{id}",
    tag = "projects",
    operation_id = "getProject",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    responses(
        (status = 200, description = "The project", body = Project),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_project(
    State(state): State<AppState>,
    Path(project_id): Path<ProjectId>,
) -> Result<Json<Project>, ApiFailure> {
    let project = state
        .with_storage(move |storage| storage.get_project(&project_id))
        .await?;
    Ok(Json(project))
}

#[utoipa::path(
    put,
    path = "/projects/{id}",
    tag = "projects",
    operation_id = "updateProject",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    request_body = ProjectSettings,
    responses(
        (status = 200, description = "The project with its new settings", body = Project),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn update_project(
    State(state): State<AppState>,
    Path(project_id): Path<ProjectId>,
    Json(settings): Json<ProjectSettings>,
) -> Result<Json<Project>, ApiFailure> {
    let project = state
        .with_storage(move |storage| storage.update_project(&project_id, &settings))
        .await?;
    Ok(Json(project))
}

/// Deletes the project with its media files, flashcards, and subtitle tracks, and drops the
/// cached conversions no other project's media files point at.
#[utoipa::path(
    delete,
    path = "/projects/{id}",
    tag = "projects",
    operation_id = "deleteProject",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    responses(
        (status = 204, description = "The project was deleted"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn delete_project(
    State(state): State<AppState>,
    Path(project_id): Path<ProjectId>,
) -> Result<StatusCode, ApiFailure> {
    let paths = state
        .with_storage(move |storage| {
            let media_files = storage.list_media_files(&project_id)?;
            storage.delete_project(&project_id)?;
            Ok(media_files
                .into_iter()
                .filter_map(|media_file| match media_file.source {
                    MediaFileSource::Path { path } => Some(path),
                    MediaFileSource::BrowserFile { .. } => None,
                })
                .collect())
        })
        .await?;
    remove_unreferenced_conversions(&state, paths).await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Records that the project was opened just now, which moves it to the front of the list.
#[utoipa::path(
    post,
    path = "/projects/{id}/opened",
    tag = "projects",
    operation_id = "markProjectOpened",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    responses(
        (status = 204, description = "The time was recorded"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn mark_project_opened(
    State(state): State<AppState>,
    Path(project_id): Path<ProjectId>,
) -> Result<StatusCode, ApiFailure> {
    state
        .with_storage(move |storage| storage.mark_project_opened(&project_id))
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use easyimmerse_core::project::{Project, ProjectId, ProjectSettings, ProjectSummary};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::clock::now_rfc3339;
use crate::state::AppState;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ListProjectsResponse {
    pub projects: Vec<ProjectSummary>,
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
        (status = 201, description = "The new project", body = Project),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn create_project(
    State(state): State<AppState>,
    Json(settings): Json<ProjectSettings>,
) -> Result<(StatusCode, Json<Project>), ApiFailure> {
    let now = now_rfc3339();
    let project = state
        .with_storage(move |storage| storage.create_project(&settings, &now))
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
        (status = 200, description = "The project with its media files", body = Project),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No project has the id", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_project(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Project>, ApiFailure> {
    let project = state
        .with_storage(move |storage| storage.get_project(&ProjectId(id)))
        .await?;
    Ok(Json(project))
}

#[utoipa::path(
    put,
    path = "/projects/{id}/settings",
    tag = "projects",
    operation_id = "updateProjectSettings",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    request_body = ProjectSettings,
    responses(
        (status = 200, description = "The project with its new settings", body = Project),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No project has the id", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn update_project_settings(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(settings): Json<ProjectSettings>,
) -> Result<Json<Project>, ApiFailure> {
    let project = state
        .with_storage(move |storage| storage.update_project_settings(&ProjectId(id), &settings))
        .await?;
    Ok(Json(project))
}

#[utoipa::path(
    post,
    path = "/projects/{id}/opened",
    tag = "projects",
    operation_id = "markProjectOpened",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    responses(
        (status = 200, description = "The project, last opened now", body = Project),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No project has the id", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn mark_project_opened(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Project>, ApiFailure> {
    let now = now_rfc3339();
    let project = state
        .with_storage(move |storage| storage.mark_project_opened(&ProjectId(id), &now))
        .await?;
    Ok(Json(project))
}

#[utoipa::path(
    delete,
    path = "/projects/{id}",
    tag = "projects",
    operation_id = "deleteProject",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    responses(
        (status = 204, description = "The project, its media files, and its flashcards were deleted"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No project has the id", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn delete_project(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<StatusCode, ApiFailure> {
    state
        .with_storage(move |storage| storage.delete_project(&ProjectId(id)))
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

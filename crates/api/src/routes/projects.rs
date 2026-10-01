use axum::Json;
use axum::extract::State;
use easyimmerse_core::project::ProjectSummary;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure};
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
        (status = 200, description = "Every project, oldest first", body = ListProjectsResponse),
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

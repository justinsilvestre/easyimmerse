//! The flashcards of a project.

use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use easyimmerse_core::flashcard::{Flashcard, FlashcardDraft, FlashcardId};
use easyimmerse_core::project::ProjectId;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure, not_found};
use crate::state::AppState;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ListFlashcardsResponse {
    pub flashcards: Vec<Flashcard>,
}

#[utoipa::path(
    get,
    path = "/projects/{id}/flashcards",
    tag = "flashcards",
    operation_id = "listFlashcards",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    responses(
        (status = 200, description = "The project's flashcards, oldest first", body = ListFlashcardsResponse),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn list_flashcards(
    State(state): State<AppState>,
    Path(project_id): Path<ProjectId>,
) -> Result<Json<ListFlashcardsResponse>, ApiFailure> {
    let flashcards = state
        .with_storage(move |storage| {
            storage.get_project(&project_id)?;
            storage.list_flashcards(&project_id)
        })
        .await?;
    Ok(Json(ListFlashcardsResponse { flashcards }))
}

/// Saves a new flashcard. Its media file, when named, must belong to the project.
#[utoipa::path(
    post,
    path = "/projects/{id}/flashcards",
    tag = "flashcards",
    operation_id = "createFlashcard",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    request_body = FlashcardDraft,
    responses(
        (status = 201, description = "The saved flashcard", body = Flashcard),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such project, or no such media file in it", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn create_flashcard(
    State(state): State<AppState>,
    Path(project_id): Path<ProjectId>,
    Json(draft): Json<FlashcardDraft>,
) -> Result<(StatusCode, Json<Flashcard>), ApiFailure> {
    let flashcard = state
        .with_storage(move |storage| storage.create_flashcard(&project_id, &draft))
        .await?;
    Ok((StatusCode::CREATED, Json(flashcard)))
}

#[utoipa::path(
    put,
    path = "/projects/{id}/flashcards/{flashcard_id}",
    tag = "flashcards",
    operation_id = "updateFlashcard",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("flashcard_id" = String, Path, description = "The flashcard id"),
    ),
    request_body = FlashcardDraft,
    responses(
        (status = 200, description = "The flashcard as it now stands", body = Flashcard),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such flashcard in the project, or no such media file in it", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn update_flashcard(
    State(state): State<AppState>,
    Path((project_id, flashcard_id)): Path<(ProjectId, FlashcardId)>,
    Json(draft): Json<FlashcardDraft>,
) -> Result<Json<Flashcard>, ApiFailure> {
    load_flashcard(&state, project_id, flashcard_id.clone()).await?;
    let flashcard = state
        .with_storage(move |storage| storage.update_flashcard(&flashcard_id, &draft))
        .await?;
    Ok(Json(flashcard))
}

#[utoipa::path(
    delete,
    path = "/projects/{id}/flashcards/{flashcard_id}",
    tag = "flashcards",
    operation_id = "deleteFlashcard",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("flashcard_id" = String, Path, description = "The flashcard id"),
    ),
    responses(
        (status = 204, description = "The flashcard was deleted"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such flashcard in the project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn delete_flashcard(
    State(state): State<AppState>,
    Path((project_id, flashcard_id)): Path<(ProjectId, FlashcardId)>,
) -> Result<StatusCode, ApiFailure> {
    load_flashcard(&state, project_id, flashcard_id.clone()).await?;
    state
        .with_storage(move |storage| storage.delete_flashcard(&flashcard_id))
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Loads a flashcard, answering 404 when it does not exist or belongs to another project.
async fn load_flashcard(
    state: &AppState,
    project_id: ProjectId,
    flashcard_id: FlashcardId,
) -> Result<Flashcard, ApiFailure> {
    let flashcard = state
        .with_storage(move |storage| storage.get_flashcard(&flashcard_id))
        .await?;
    if flashcard.project_id == project_id {
        Ok(flashcard)
    } else {
        Err(not_found(format!(
            "no flashcard {:?} in project {:?}",
            flashcard.id.0, project_id.0
        )))
    }
}

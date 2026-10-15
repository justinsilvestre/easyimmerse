//! The deleted flashcards whose notes may still be in Anki, which AnkiConnect deletes or the user deals with from the project screen.

use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use easyimmerse_core::flashcard::{AnkiPendingDeletion, FlashcardId};
use easyimmerse_core::project::ProjectId;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::state::AppState;

/// The deletions the user marked done, as the project screen listed them.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AnkiDeletionsCleared {
    pub flashcard_ids: Vec<FlashcardId>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AnkiPendingDeletions {
    /// Oldest first.
    pub deletions: Vec<AnkiPendingDeletion>,
}

/// Lists the project's deleted flashcards whose notes may still be in Anki.
/// Deleting a flashcard that reached Anki, marked as exported or sent, adds it here while the project uses AnkiConnect or lists such deletions,
/// as does recording a send of a flashcard deleted since the send began.
#[utoipa::path(
    get,
    path = "/projects/{id}/anki/pending-deletions",
    tag = "anki",
    operation_id = "listAnkiPendingDeletions",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    responses(
        (status = 200, description = "The pending deletions, oldest first", body = AnkiPendingDeletions),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn list_anki_pending_deletions(
    State(state): State<AppState>,
    Path(project_id): Path<ProjectId>,
) -> Result<Json<AnkiPendingDeletions>, ApiFailure> {
    let deletions = state
        .with_storage(move |storage| storage.list_anki_pending_deletions(&project_id))
        .await?;
    Ok(Json(AnkiPendingDeletions { deletions }))
}

/// Forgets a pending deletion once the client has deleted the note from Anki, or found none to delete.
/// A flashcard without a pending deletion is passed over.
#[utoipa::path(
    delete,
    path = "/projects/{id}/anki/pending-deletions/{flashcard_id}",
    tag = "anki",
    operation_id = "clearAnkiPendingDeletion",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("flashcard_id" = String, Path, description = "The id of the deleted flashcard"),
    ),
    responses(
        (status = 204, description = "The pending deletion is gone"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn clear_anki_pending_deletion(
    State(state): State<AppState>,
    Path((project_id, flashcard_id)): Path<(ProjectId, FlashcardId)>,
) -> Result<StatusCode, ApiFailure> {
    state
        .with_storage(move |storage| {
            storage.clear_anki_pending_deletion(&project_id, &flashcard_id)
        })
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Forgets the named deletions, as when the user has deleted their notes in Anki and marks them done.
/// Only the named deletions go, so that one recorded since the project screen listed them stays.
#[utoipa::path(
    post,
    path = "/projects/{id}/anki/pending-deletions/cleared",
    tag = "anki",
    operation_id = "clearAnkiPendingDeletions",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    request_body = AnkiDeletionsCleared,
    responses(
        (status = 204, description = "The named deletions are gone"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn clear_anki_pending_deletions(
    State(state): State<AppState>,
    Path(project_id): Path<ProjectId>,
    Json(request): Json<AnkiDeletionsCleared>,
) -> Result<StatusCode, ApiFailure> {
    state
        .with_storage(move |storage| {
            storage.clear_anki_pending_deletions(&project_id, &request.flashcard_ids)
        })
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

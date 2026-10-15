//! The notes the AnkiConnect client still has to delete from Anki, for flashcards deleted while their project sends there.

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

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AnkiPendingDeletions {
    /// Oldest first.
    pub deletions: Vec<AnkiPendingDeletion>,
}

/// Lists the flashcards of the project whose notes are still to be deleted from Anki.
/// Deleting a flashcard that has reached Anki while the project's destination is `anki_connect` adds it here, as does recording a send of a flashcard deleted since the send began.
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

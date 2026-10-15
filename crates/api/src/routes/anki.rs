//! Rendering a project's flashcards as notes for the AnkiConnect client, recording what it sent, and turning AnkiConnect on or off.

use std::collections::HashSet;

use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use easyimmerse_anki::{AnkiNotes, render_notes};
use easyimmerse_core::flashcard::FlashcardId;
use easyimmerse_core::project::{Project, ProjectId};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::anki_selection::{deck_spec, load_selection};
use crate::auth::error_body::{ApiError, ApiFailure};
use crate::state::AppState;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AnkiNotesRequest {
    pub flashcard_ids: Vec<FlashcardId>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AnkiSentRequest {
    pub notes: Vec<AnkiSentNote>,
}

/// A flashcard that AnkiConnect created or updated a note for.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AnkiSentNote {
    pub flashcard_id: FlashcardId,
    pub anki_note_id: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AnkiConnectSetting {
    pub uses_anki_connect: bool,
}

/// Renders the flashcards as notes for the AnkiConnect client, with the deck and note type they belong to.
/// A named flashcard that is not in the project, as one deleted since the send was queued, is passed over.
#[utoipa::path(
    post,
    path = "/projects/{id}/anki/notes",
    tag = "anki",
    operation_id = "renderAnkiNotes",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    request_body = AnkiNotesRequest,
    responses(
        (status = 200, description = "The deck, the note type and the notes", body = AnkiNotes),
        (status = 400, description = "No flashcards named", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn render_anki_notes(
    State(state): State<AppState>,
    Path(project_id): Path<ProjectId>,
    Json(request): Json<AnkiNotesRequest>,
) -> Result<Json<AnkiNotes>, ApiFailure> {
    let selection = load_selection(&state, project_id, request.flashcard_ids).await?;
    Ok(Json(render_notes(
        &selection.flashcards,
        &deck_spec(&selection.project),
    )))
}

/// Stores the ids of the notes AnkiConnect created for the flashcards.
/// A flashcard of another project is passed over, and the note of a flashcard deleted since the send began is recorded as to be deleted from Anki.
#[utoipa::path(
    post,
    path = "/projects/{id}/anki/sent",
    tag = "anki",
    operation_id = "recordAnkiNotesSent",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    request_body = AnkiSentRequest,
    responses(
        (status = 204, description = "The note ids were stored"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn record_anki_notes_sent(
    State(state): State<AppState>,
    Path(project_id): Path<ProjectId>,
    Json(request): Json<AnkiSentRequest>,
) -> Result<StatusCode, ApiFailure> {
    let notes = first_note_of_each(request.notes);
    state
        .with_storage(move |storage| storage.record_anki_notes_sent(&project_id, &notes))
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Turns AnkiConnect on or off for the project. Exports and sends never change it.
#[utoipa::path(
    put,
    path = "/projects/{id}/anki-connect",
    tag = "anki",
    operation_id = "setAnkiConnect",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    request_body = AnkiConnectSetting,
    responses(
        (status = 200, description = "The project with AnkiConnect turned on or off", body = Project),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn set_anki_connect(
    State(state): State<AppState>,
    Path(project_id): Path<ProjectId>,
    Json(request): Json<AnkiConnectSetting>,
) -> Result<Json<Project>, ApiFailure> {
    let project = state
        .with_storage(move |storage| {
            storage.set_uses_anki_connect(&project_id, request.uses_anki_connect)?;
            storage.get_project(&project_id)
        })
        .await?;
    Ok(Json(project))
}

/// Pairs each named flashcard with its note id, keeping the first note id of a flashcard named twice.
fn first_note_of_each(notes: Vec<AnkiSentNote>) -> Vec<(FlashcardId, u64)> {
    let mut paired: HashSet<FlashcardId> = HashSet::new();
    notes
        .into_iter()
        .filter(|note| paired.insert(note.flashcard_id.clone()))
        .map(|note| (note.flashcard_id, note.anki_note_id))
        .collect()
}

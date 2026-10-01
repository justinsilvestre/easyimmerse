use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use easyimmerse_core::flashcard::{
    Flashcard, FlashcardDraftRequest, FlashcardId, NewFlashcard, draft_flashcard,
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
        (status = 404, description = "No project has the id", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn list_flashcards(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<ListFlashcardsResponse>, ApiFailure> {
    let flashcards = state
        .with_storage(move |storage| storage.list_flashcards(&ProjectId(id)))
        .await?;
    Ok(Json(ListFlashcardsResponse { flashcards }))
}

#[utoipa::path(
    post,
    path = "/projects/{id}/flashcards",
    tag = "flashcards",
    operation_id = "createFlashcard",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    request_body = NewFlashcard,
    responses(
        (status = 201, description = "The saved flashcard", body = Flashcard),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No project has the id, or the project has no media file with the card's media_id", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn create_flashcard(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(card): Json<NewFlashcard>,
) -> Result<(StatusCode, Json<Flashcard>), ApiFailure> {
    let now = now_rfc3339();
    let card = state
        .with_storage(move |storage| storage.insert_flashcard(&ProjectId(id), &card, &now))
        .await?;
    Ok((StatusCode::CREATED, Json(card)))
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
    request_body = NewFlashcard,
    responses(
        (status = 200, description = "The updated flashcard", body = Flashcard),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "The project has no flashcard with the id, or no media file with the card's media_id", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn update_flashcard(
    State(state): State<AppState>,
    Path((id, flashcard_id)): Path<(String, String)>,
    Json(card): Json<NewFlashcard>,
) -> Result<Json<Flashcard>, ApiFailure> {
    let card = state
        .with_storage(move |storage| {
            storage.update_flashcard(&ProjectId(id), &FlashcardId(flashcard_id), &card)
        })
        .await?;
    Ok(Json(card))
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
        (status = 404, description = "The project has no flashcard with the id", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn delete_flashcard(
    State(state): State<AppState>,
    Path((id, flashcard_id)): Path<(String, String)>,
) -> Result<StatusCode, ApiFailure> {
    state
        .with_storage(move |storage| {
            storage.delete_flashcard(&ProjectId(id), &FlashcardId(flashcard_id))
        })
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    post,
    path = "/flashcards/draft",
    tag = "flashcards",
    operation_id = "draftFlashcard",
    security(("bearer_token" = [])),
    request_body = FlashcardDraftRequest,
    responses(
        (status = 200, description = "The flashcard a click on the word produces, before editing", body = NewFlashcard),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn draft_flashcard_route(
    Json(request): Json<FlashcardDraftRequest>,
) -> Json<NewFlashcard> {
    Json(draft_flashcard(request))
}

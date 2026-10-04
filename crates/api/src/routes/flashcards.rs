//! The flashcards of a project and their screenshot images.

use axum::Json;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use easyimmerse_core::flashcard::{Flashcard, FlashcardFieldKey, FlashcardFields, FlashcardId};
use easyimmerse_core::media_file::MediaFileId;
use easyimmerse_core::project::ProjectId;
use easyimmerse_storage::{FlashcardDraft, ScreenshotChange};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::{IntoParams, ToSchema};

use crate::auth::error_body::{ApiError, ApiFailure, bad_request, not_found};
use crate::state::AppState;

const MAX_SCREENSHOT_BYTES: usize = 5 * 1024 * 1024;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema, IntoParams)]
#[into_params(parameter_in = Query)]
#[ts(export)]
pub struct ListFlashcardsQuery {
    /// Narrows the list to the flashcards made from this media file.
    pub media_id: Option<MediaFileId>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ListFlashcardsResponse {
    pub flashcards: Vec<Flashcard>,
}

/// The body that creates a flashcard or replaces its contents.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct SaveFlashcardRequest {
    pub media_file_id: Option<MediaFileId>,
    pub fields: FlashcardFields,
    pub included_fields: Vec<FlashcardFieldKey>,
    /// A `data:image/...;base64,` URL that replaces the stored screenshot. Absent keeps the
    /// stored one. A `fields.screenshot_at_ms` of null removes it.
    pub screenshot_data_url: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct FlashcardScreenshot {
    /// A `data:image/...;base64,` URL.
    pub data_url: String,
}

#[utoipa::path(
    get,
    path = "/projects/{id}/flashcards",
    tag = "flashcards",
    operation_id = "listFlashcards",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id"), ListFlashcardsQuery),
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
    Query(query): Query<ListFlashcardsQuery>,
) -> Result<Json<ListFlashcardsResponse>, ApiFailure> {
    let flashcards = state
        .with_storage(move |storage| storage.list_flashcards(&project_id, query.media_id.as_ref()))
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
    request_body = SaveFlashcardRequest,
    responses(
        (status = 201, description = "The created flashcard", body = Flashcard),
        (status = 400, description = "The screenshot is not an image data URL or exceeds 5 MB", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such project, or no such media file in it", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn create_flashcard(
    State(state): State<AppState>,
    Path(project_id): Path<ProjectId>,
    Json(request): Json<SaveFlashcardRequest>,
) -> Result<(StatusCode, Json<Flashcard>), ApiFailure> {
    let draft = to_draft(request)?;
    let flashcard = state
        .with_storage(move |storage| storage.insert_flashcard(&project_id, &draft))
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
    request_body = SaveFlashcardRequest,
    responses(
        (status = 200, description = "The changed flashcard", body = Flashcard),
        (status = 400, description = "The screenshot is not an image data URL or exceeds 5 MB", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such flashcard or media file in the project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn update_flashcard(
    State(state): State<AppState>,
    Path((project_id, id)): Path<(ProjectId, FlashcardId)>,
    Json(request): Json<SaveFlashcardRequest>,
) -> Result<Json<Flashcard>, ApiFailure> {
    let draft = to_draft(request)?;
    let flashcard = state
        .with_storage(move |storage| storage.update_flashcard(&project_id, &id, &draft))
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
    Path((project_id, id)): Path<(ProjectId, FlashcardId)>,
) -> Result<StatusCode, ApiFailure> {
    state
        .with_storage(move |storage| storage.delete_flashcard(&project_id, &id))
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    get,
    path = "/projects/{id}/flashcards/{flashcard_id}/screenshot",
    tag = "flashcards",
    operation_id = "getFlashcardScreenshot",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("flashcard_id" = String, Path, description = "The flashcard id"),
    ),
    responses(
        (status = 200, description = "The screenshot image", body = FlashcardScreenshot),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such flashcard in the project, or it has no screenshot", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_flashcard_screenshot(
    State(state): State<AppState>,
    Path((project_id, id)): Path<(ProjectId, FlashcardId)>,
) -> Result<Json<FlashcardScreenshot>, ApiFailure> {
    let data_url = state
        .with_storage(move |storage| storage.get_flashcard_screenshot(&project_id, &id))
        .await?
        .ok_or_else(|| not_found("the flashcard has no screenshot"))?;
    Ok(Json(FlashcardScreenshot { data_url }))
}

fn to_draft(request: SaveFlashcardRequest) -> Result<FlashcardDraft, ApiFailure> {
    let screenshot = match (request.fields.screenshot_at_ms, request.screenshot_data_url) {
        (None, _) => ScreenshotChange::Remove,
        (Some(_), None) => ScreenshotChange::Keep,
        (Some(_), Some(data_url)) => ScreenshotChange::Replace(validate_screenshot(data_url)?),
    };
    Ok(FlashcardDraft {
        media_file_id: request.media_file_id,
        fields: request.fields,
        included_fields: request.included_fields,
        screenshot,
    })
}

fn validate_screenshot(data_url: String) -> Result<String, ApiFailure> {
    if !data_url.starts_with("data:image/") {
        return Err(bad_request("the screenshot must be a data:image/ URL"));
    }
    if data_url.len() > MAX_SCREENSHOT_BYTES {
        return Err(bad_request("the screenshot must not exceed 5 MB"));
    }
    Ok(data_url)
}

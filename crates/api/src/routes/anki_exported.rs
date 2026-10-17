//! Recording an Anki package that the client delivered itself, after the server staged it.

use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use easyimmerse_core::flashcard::FlashcardId;
use easyimmerse_core::project::ProjectId;
use easyimmerse_storage::DeliveredPackage;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::state::AppState;

/// The flashcards a staged package held, once the user has kept a copy of it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AnkiExportedRequest {
    pub flashcard_ids: Vec<FlashcardId>,
    /// Whether the export marks the flashcards as exported, which takes them out of the Anki updates queue.
    pub marks_exported: bool,
    /// The `read_at_ms` the server answered when it staged the package, so that an edit saved since counts as changed.
    pub read_at_ms: u64,
}

/// Records that a package held the flashcards, and marks them exported when the request asks for that.
/// A flashcard of another project, or one deleted since the package was staged, is passed over.
#[utoipa::path(
    post,
    path = "/projects/{id}/anki/exported",
    tag = "anki",
    operation_id = "recordAnkiExported",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    request_body = AnkiExportedRequest,
    responses(
        (status = 204, description = "The export was recorded"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn record_anki_exported(
    State(state): State<AppState>,
    Path(project_id): Path<ProjectId>,
    Json(request): Json<AnkiExportedRequest>,
) -> Result<StatusCode, ApiFailure> {
    let delivered = DeliveredPackage {
        project_id,
        flashcard_ids: request.flashcard_ids,
        exported_at_ms: request.marks_exported.then_some(request.read_at_ms),
    };
    state
        .with_storage(move |storage| storage.record_anki_export(&delivered))
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

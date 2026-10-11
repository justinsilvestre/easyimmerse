//! A document's alignments with its audio and its translation, and the translation it is
//! paired with before the two are aligned. See `docs/alignment-data.md`.

use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use easyimmerse_core::alignment::{
    AddAlignmentRequest, Alignment, AlignmentId, AlignmentsResponse, TranslationDocumentSelection,
};
use easyimmerse_core::media_file::{MediaFile, MediaFileId};
use easyimmerse_core::project::ProjectId;

use crate::auth::error_body::{ApiError, ApiFailure, bad_request};
use crate::routes::media::load_media_file;
use crate::state::AppState;

#[utoipa::path(
    get,
    path = "/projects/{id}/media/{media_id}/alignments",
    tag = "alignments",
    operation_id = "listAlignments",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id of the document"),
    ),
    responses(
        (status = 200, description = "The document's alignments, newest first", body = AlignmentsResponse),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such media file in the project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn list_alignments(
    State(state): State<AppState>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
) -> Result<Json<AlignmentsResponse>, ApiFailure> {
    load_media_file(&state, project_id, media_id.clone()).await?;
    let alignments = state
        .with_storage(move |storage| storage.list_alignments(&media_id))
        .await?;
    Ok(Json(AlignmentsResponse { alignments }))
}

/// Adds an alignment to a document. The audio file or translation it names must be another
/// media file of the same project. Spans are not checked against the documents.
#[utoipa::path(
    post,
    path = "/projects/{id}/media/{media_id}/alignments",
    tag = "alignments",
    operation_id = "addAlignment",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id of the document"),
    ),
    request_body = AddAlignmentRequest,
    responses(
        (status = 201, description = "The added alignment", body = Alignment),
        (status = 400, description = "A span or segment ends before it starts, a span's quote is not as long as the span, a translation link has no spans on either side, or the counterpart is not another media file of the project", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such media file in the project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn add_alignment(
    State(state): State<AppState>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
    Json(request): Json<AddAlignmentRequest>,
) -> Result<(StatusCode, Json<Alignment>), ApiFailure> {
    load_media_file(&state, project_id.clone(), media_id.clone()).await?;
    request
        .content
        .validate()
        .map_err(|error| bad_request(error.to_string()))?;
    let counterpart = request.content.counterpart_media_file_id().clone();
    ensure_counterpart(&state, project_id, &media_id, counterpart).await?;
    let alignment = state
        .with_storage(move |storage| storage.add_alignment(&media_id, &request))
        .await?;
    Ok((StatusCode::CREATED, Json(alignment)))
}

#[utoipa::path(
    delete,
    path = "/projects/{id}/media/{media_id}/alignments/{alignment_id}",
    tag = "alignments",
    operation_id = "removeAlignment",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id of the document"),
        ("alignment_id" = String, Path, description = "The alignment id"),
    ),
    responses(
        (status = 204, description = "The alignment was removed"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such media file in the project, or no such alignment of it", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn remove_alignment(
    State(state): State<AppState>,
    Path((project_id, media_id, alignment_id)): Path<(ProjectId, MediaFileId, AlignmentId)>,
) -> Result<StatusCode, ApiFailure> {
    load_media_file(&state, project_id, media_id.clone()).await?;
    state
        .with_storage(move |storage| storage.remove_alignment(&media_id, &alignment_id))
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Pairs a document with the translation it is read beside, before the two are aligned,
/// or clears the pairing.
#[utoipa::path(
    put,
    path = "/projects/{id}/media/{media_id}/translation-document",
    tag = "alignments",
    operation_id = "setTranslationDocument",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id of the document"),
    ),
    request_body = TranslationDocumentSelection,
    responses(
        (status = 200, description = "The document's media file with the pairing saved", body = MediaFile),
        (status = 400, description = "The translation is not another media file of the project", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such media file in the project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn set_translation_document(
    State(state): State<AppState>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
    Json(selection): Json<TranslationDocumentSelection>,
) -> Result<Json<MediaFile>, ApiFailure> {
    load_media_file(&state, project_id.clone(), media_id.clone()).await?;
    if let Some(translation_id) = selection.translation_media_file_id.clone() {
        ensure_counterpart(&state, project_id, &media_id, translation_id).await?;
    }
    let media_file = state
        .with_storage(move |storage| {
            storage.set_translation_document(
                &media_id,
                selection.translation_media_file_id.as_ref(),
            )?;
            storage.get_media_file(&media_id)
        })
        .await?;
    Ok(Json(media_file))
}

/// Answers 400 unless `counterpart` is a media file of the project other than the document.
async fn ensure_counterpart(
    state: &AppState,
    project_id: ProjectId,
    media_id: &MediaFileId,
    counterpart: MediaFileId,
) -> Result<(), ApiFailure> {
    if counterpart == *media_id {
        return Err(bad_request(format!(
            "the media file {:?} cannot be aligned or paired with itself",
            media_id.0
        )));
    }
    load_media_file(state, project_id, counterpart)
        .await
        .map(|_| ())
        .map_err(|failure| {
            if failure.status == StatusCode::NOT_FOUND {
                bad_request(failure.error.message)
            } else {
                failure
            }
        })
}

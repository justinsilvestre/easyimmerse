//! Exporting a project's flashcards to Anki: as a deck package file, or as notes for the AnkiConnect client to send.

use std::collections::{HashMap, HashSet};
use std::io::Cursor;
use std::path::Path as FilePath;

use axum::extract::{Path, State};
use axum::http::header::{CONTENT_DISPOSITION, CONTENT_TYPE};
use axum::http::{HeaderMap, HeaderName, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::{Extension, Json};
use easyimmerse_anki::{
    AnkiNote, AnkiNotes, CardScheduling, DeckSpec, PackageMedia, render_note, render_notes,
    write_package,
};
use easyimmerse_core::flashcard::{Flashcard, FlashcardId};
use easyimmerse_core::project::{FlashcardDestination, Project, ProjectId};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::anki_media::{render_media, without_skipped_media};
use crate::auth::error_body::{ApiError, ApiFailure, bad_request, not_found};
use crate::auth::token_kind::TokenKind;
use crate::file_download::{attachment_disposition, body_then, safe_file_name};
use crate::local_path::ensure_local_paths_allowed;
use crate::now_ms::now_ms;
use crate::state::AppState;

/// The response header that counts the media files left out of a downloaded package.
pub const SKIPPED_MEDIA_HEADER: &str = "x-easyimmerse-skipped-media";

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AnkiPackageRequest {
    /// The flashcards to export, in the order Anki shows them as new cards.
    pub flashcard_ids: Vec<FlashcardId>,
    /// The absolute path to write the package to, on the server's machine. Null to receive the package in the response.
    pub save_path: Option<String>,
}

/// What the server wrote to the save path.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AnkiPackageSaved {
    pub flashcard_count: u64,
    /// The audio clips and screenshots that could not be rendered and are missing from the package.
    pub skipped_media_count: u64,
}

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
pub struct FlashcardDestinationRequest {
    /// Null clears the destination.
    pub destination: Option<FlashcardDestination>,
}

/// Writes the flashcards into a legacy Anki deck package (.apkg) with their audio clips and screenshots.
/// A clip or screenshot the server cannot render, as from a file the browser holds, is left out and counted.
/// Once the package has been saved, or sent to the client in full, the flashcards are marked exported
/// and the project's flashcard destination becomes `anki_package`.
#[utoipa::path(
    post,
    path = "/projects/{id}/anki/package",
    tag = "anki",
    operation_id = "exportAnkiPackage",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    request_body = AnkiPackageRequest,
    responses(
        (status = 200, description = "Without a save path, the package, named in `Content-Disposition`, with the count of media files left out in `X-EasyImmerse-Skipped-Media`. With a save path, what was saved.", content(
            (Vec<u8> = "application/octet-stream"),
            (AnkiPackageSaved = "application/json"),
        ), headers(
            ("Content-Disposition" = String, description = "Without a save path: the suggested file name, as `filename` in ASCII and `filename*` in UTF-8"),
            ("X-EasyImmerse-Skipped-Media" = u64, description = "Without a save path: the count of audio clips and screenshots left out of the package"),
        )),
        (status = 400, description = "No flashcards named, a save path that is not absolute, or a save path that could not be written (code `save_failed`)", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "A save path, from a token that may not name local paths (code `local_paths_not_allowed`)", body = ApiError),
        (status = 404, description = "No such project, or a flashcard not in it", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 500, description = "The package could not be built (code `package_failed`)", body = ApiError),
    ),
)]
pub async fn export_anki_package(
    State(state): State<AppState>,
    Extension(token): Extension<TokenKind>,
    Path(project_id): Path<ProjectId>,
    Json(request): Json<AnkiPackageRequest>,
) -> Result<Response, ApiFailure> {
    if let Some(path) = &request.save_path {
        ensure_local_paths_allowed(token, &state.config)?;
        ensure_absolute(path)?;
    }
    let (project, flashcards) = load_selection(&state, project_id, request.flashcard_ids).await?;
    let package = build_package(&state, token, project, flashcards).await?;
    match request.save_path {
        Some(path) => save_package(&state, package, &path).await,
        None => Ok(package_download(state, package)),
    }
}

/// Renders the flashcards as notes for the AnkiConnect client, with the deck and note type they belong to.
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
        (status = 404, description = "No such project, or a flashcard not in it", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn render_anki_notes(
    State(state): State<AppState>,
    Path(project_id): Path<ProjectId>,
    Json(request): Json<AnkiNotesRequest>,
) -> Result<Json<AnkiNotes>, ApiFailure> {
    let (project, flashcards) = load_selection(&state, project_id, request.flashcard_ids).await?;
    Ok(Json(render_notes(&flashcards, &deck_spec(&project))))
}

/// Stores the ids of the notes AnkiConnect created for the flashcards,
/// and makes `anki_connect` the project's flashcard destination.
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
        (status = 404, description = "No such project, or a flashcard not in it", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn record_anki_notes_sent(
    State(state): State<AppState>,
    Path(project_id): Path<ProjectId>,
    Json(request): Json<AnkiSentRequest>,
) -> Result<StatusCode, ApiFailure> {
    let mut seen = HashSet::new();
    let notes: Vec<(FlashcardId, u64)> = request
        .notes
        .into_iter()
        .filter(|note| seen.insert(note.flashcard_id.clone()))
        .map(|note| (note.flashcard_id, note.anki_note_id))
        .collect();
    let ids: Vec<FlashcardId> = notes.iter().map(|(id, _)| id.clone()).collect();
    let flashcards = load_project_flashcards(&state, project_id.clone()).await?.1;
    select_flashcards(flashcards, &ids)?;
    state
        .with_storage(move |storage| storage.record_anki_notes_sent(&project_id, &notes))
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    put,
    path = "/projects/{id}/flashcard-destination",
    tag = "anki",
    operation_id = "setFlashcardDestination",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    request_body = FlashcardDestinationRequest,
    responses(
        (status = 200, description = "The project with its new destination", body = Project),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn set_flashcard_destination(
    State(state): State<AppState>,
    Path(project_id): Path<ProjectId>,
    Json(request): Json<FlashcardDestinationRequest>,
) -> Result<Json<Project>, ApiFailure> {
    let project = state
        .with_storage(move |storage| {
            storage.set_flashcard_destination(&project_id, request.destination)?;
            storage.get_project(&project_id)
        })
        .await?;
    Ok(Json(project))
}

/// A package built in memory, with what is recorded once it has been delivered.
struct BuiltPackage {
    bytes: Vec<u8>,
    file_name: String,
    project_id: ProjectId,
    flashcard_ids: Vec<FlashcardId>,
    skipped_media_count: u64,
}

async fn build_package(
    state: &AppState,
    token: TokenKind,
    project: Project,
    flashcards: Vec<Flashcard>,
) -> Result<BuiltPackage, ApiFailure> {
    let notes: Vec<AnkiNote> = flashcards.iter().map(render_note).collect();
    let media = render_media(state, token, &notes).await;
    for skipped in &media.skipped {
        tracing::info!(
            "left {} out of the package: {}",
            skipped.file_name,
            skipped.reason
        );
    }
    let notes = without_skipped_media(notes, &media.skipped);
    Ok(BuiltPackage {
        bytes: write_package_bytes(&project, notes, media.files).await?,
        file_name: format!("{}.apkg", safe_file_name(&project.settings.name)),
        project_id: project.id,
        flashcard_ids: flashcards
            .into_iter()
            .map(|flashcard| flashcard.id)
            .collect(),
        skipped_media_count: media.skipped.len() as u64,
    })
}

/// Writes the package in memory on a blocking thread; 500 `package_failed` when it cannot be written.
async fn write_package_bytes(
    project: &Project,
    notes: Vec<AnkiNote>,
    media: Vec<PackageMedia>,
) -> Result<Vec<u8>, ApiFailure> {
    let project = project.clone();
    let written = tokio::task::spawn_blocking(move || {
        let mut out = Cursor::new(Vec::new());
        write_package(
            &mut out,
            &deck_spec(&project),
            &notes,
            &media,
            CardScheduling::New,
        )
        .map(|()| out.into_inner())
    })
    .await;
    let failed = |error: &dyn std::fmt::Display| {
        ApiFailure::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            "package_failed",
            error.to_string(),
        )
    };
    written
        .map_err(|error| failed(&error))?
        .map_err(|error| failed(&error))
}

/// Writes the bytes to the path through a sibling `.part` file, so that a failed write leaves no truncated package
/// and does not destroy a package already at the path.
async fn write_file_whole(path: &str, bytes: &[u8]) -> std::io::Result<()> {
    let partial = format!("{path}.part");
    tokio::fs::write(&partial, bytes).await?;
    if let Err(error) = tokio::fs::rename(&partial, path).await {
        tokio::fs::remove_file(&partial).await.ok();
        return Err(error);
    }
    Ok(())
}

async fn save_package(
    state: &AppState,
    package: BuiltPackage,
    path: &str,
) -> Result<Response, ApiFailure> {
    write_file_whole(path, &package.bytes)
        .await
        .map_err(|error| {
            ApiFailure::new(
                StatusCode::BAD_REQUEST,
                "save_failed",
                format!("could not write the package to {path:?}: {error}"),
            )
        })?;
    let saved = AnkiPackageSaved {
        flashcard_count: package.flashcard_ids.len() as u64,
        skipped_media_count: package.skipped_media_count,
    };
    record_export(state, package.project_id, package.flashcard_ids).await?;
    Ok(Json(saved).into_response())
}

/// Sends the package as the response body, and records the export once the body has been sent in full.
fn package_download(state: AppState, package: BuiltPackage) -> Response {
    let mut headers = HeaderMap::new();
    headers.insert(
        CONTENT_TYPE,
        HeaderValue::from_static("application/octet-stream"),
    );
    headers.insert(
        CONTENT_DISPOSITION,
        attachment_disposition(&package.file_name),
    );
    headers.insert(
        HeaderName::from_static(SKIPPED_MEDIA_HEADER),
        HeaderValue::from(package.skipped_media_count),
    );
    let BuiltPackage {
        bytes,
        project_id,
        flashcard_ids,
        ..
    } = package;
    let body = body_then(bytes, async move {
        if let Err(failure) = record_export(&state, project_id, flashcard_ids).await {
            tracing::error!("could not record the export: {}", failure.error.message);
        }
    });
    (StatusCode::OK, headers, body).into_response()
}

async fn record_export(
    state: &AppState,
    project_id: ProjectId,
    flashcard_ids: Vec<FlashcardId>,
) -> Result<(), ApiFailure> {
    let exported_at_ms = now_ms();
    state
        .with_storage(move |storage| {
            storage.record_anki_export(&project_id, &flashcard_ids, exported_at_ms)
        })
        .await
}

fn deck_spec(project: &Project) -> DeckSpec<'_> {
    DeckSpec {
        project_id: &project.id.0,
        project_name: &project.settings.name,
        project_created_at_ms: project.created_at_ms,
        front_fields: &project.settings.flashcard_front_fields,
    }
}

fn ensure_absolute(path: &str) -> Result<(), ApiFailure> {
    if FilePath::new(path).is_absolute() {
        Ok(())
    } else {
        Err(bad_request(format!(
            "the save path {path:?} is not absolute"
        )))
    }
}

/// Loads the project and the named flashcards of it, in the order named and each once.
async fn load_selection(
    state: &AppState,
    project_id: ProjectId,
    ids: Vec<FlashcardId>,
) -> Result<(Project, Vec<Flashcard>), ApiFailure> {
    if ids.is_empty() {
        return Err(bad_request("name at least one flashcard"));
    }
    let (project, flashcards) = load_project_flashcards(state, project_id).await?;
    Ok((project, select_flashcards(flashcards, &ids)?))
}

async fn load_project_flashcards(
    state: &AppState,
    project_id: ProjectId,
) -> Result<(Project, Vec<Flashcard>), ApiFailure> {
    state
        .with_storage(move |storage| {
            Ok((
                storage.get_project(&project_id)?,
                storage.list_flashcards(&project_id)?,
            ))
        })
        .await
}

/// Picks the named flashcards out of a project's flashcards; 404 when one is not among them.
fn select_flashcards(
    flashcards: Vec<Flashcard>,
    ids: &[FlashcardId],
) -> Result<Vec<Flashcard>, ApiFailure> {
    let mut by_id: HashMap<FlashcardId, Flashcard> = flashcards
        .into_iter()
        .map(|flashcard| (flashcard.id.clone(), flashcard))
        .collect();
    let mut seen = HashSet::new();
    ids.iter()
        .filter(|id| seen.insert(*id))
        .map(|id| {
            by_id
                .remove(id)
                .ok_or_else(|| not_found(format!("no flashcard {:?} in the project", id.0)))
        })
        .collect()
}

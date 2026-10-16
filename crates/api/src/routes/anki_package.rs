//! Exporting a project's flashcards as a legacy Anki deck package (.apkg), saved at a path or sent for download.

use std::io::Cursor;
use std::path::Path as FilePath;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::Response;
use axum::{Extension, Json};
use easyimmerse_anki::{AnkiNote, CardScheduling, PackageMedia, render_note, write_package};
use easyimmerse_core::flashcard::FlashcardId;
use easyimmerse_core::project::{Project, ProjectId};
use easyimmerse_storage::DeliveredPackage;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::anki_media::{render_media, without_skipped_media};
use crate::anki_package_delivery::{BuiltPackage, package_download, save_package};
use crate::anki_selection::{Selection, deck_spec, load_selection};
use crate::auth::error_body::{ApiError, ApiFailure, bad_request, not_found};
use crate::auth::token_kind::TokenKind;
use crate::file_download::safe_file_name;
use crate::local_path::ensure_local_paths_allowed;
use crate::now_ms::now_ms;
use crate::state::AppState;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AnkiPackageRequest {
    /// The flashcards to export, in the order Anki shows them as new cards.
    pub flashcard_ids: Vec<FlashcardId>,
    /// The absolute path to write the package to, on the server's machine. Null to receive the package in the response.
    pub save_path: Option<String>,
    /// Whether delivering the package marks its flashcards as exported, which takes them out of the Anki updates queue.
    pub marks_exported: bool,
}

/// What the server wrote to the save path.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AnkiPackageSaved {
    pub flashcard_count: u64,
    /// The audio clips and screenshots that could not be rendered and are missing from the package.
    pub skipped_media_count: u64,
}

/// Writes the flashcards into a legacy Anki deck package (.apkg) with their audio clips and screenshots.
/// A clip or screenshot the server cannot render, as from a file the browser holds, is left out and counted.
/// Once the package has been saved, or sent to the client in full, it is recorded that a package held the flashcards,
/// and they are marked exported when the request asks for that.
/// A named flashcard that is not in the project, as one deleted since the export was requested, is left out.
#[utoipa::path(
    post,
    path = "/projects/{id}/anki/package",
    tag = "anki",
    operation_id = "exportAnkiPackage",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    request_body = AnkiPackageRequest,
    responses(
        (status = 200, description = "Without a save path, the package, named in `Content-Disposition`, with the count of flashcards it holds in `X-EasyImmerse-Flashcard-Count` and of media files left out in `X-EasyImmerse-Skipped-Media`. With a save path, what was saved.", content(
            (Vec<u8> = "application/octet-stream"),
            (AnkiPackageSaved = "application/json"),
        ), headers(
            ("Content-Disposition" = String, description = "Without a save path: the suggested file name, as `filename` in ASCII and `filename*` in UTF-8"),
            ("X-EasyImmerse-Flashcard-Count" = u64, description = "Without a save path: the count of flashcards the package holds, which leaves out those named that are not in the project"),
            ("X-EasyImmerse-Skipped-Media" = u64, description = "Without a save path: the count of audio clips and screenshots left out of the package"),
        )),
        (status = 400, description = "No flashcards named, a save path that is not absolute, or a save path that could not be written (code `save_failed`)", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "A save path, from a token that may not name local paths (code `local_paths_not_allowed`)", body = ApiError),
        (status = 404, description = "No such project, or none of the named flashcards in it", body = ApiError),
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
    if request.flashcard_ids.is_empty() {
        return Err(bad_request("name at least one flashcard"));
    }
    let selection = load_selection(&state, project_id, request.flashcard_ids).await?;
    if selection.flashcards.is_empty() {
        return Err(not_found("none of the named flashcards is in the project"));
    }
    let package = build_package(&state, token, selection, request.marks_exported).await?;
    match request.save_path {
        Some(path) => save_package(&state, package, &path).await,
        None => Ok(package_download(state, package)),
    }
}

/// Builds the package, dating its notes at the time it is written, since Anki updates a note it already has only from a newer one.
async fn build_package(
    state: &AppState,
    token: TokenKind,
    selection: Selection,
    marks_exported: bool,
) -> Result<BuiltPackage, ApiFailure> {
    let notes: Vec<AnkiNote> = selection.flashcards.iter().map(render_note).collect();
    let media = render_media(state, token, &notes).await;
    for skipped in &media.skipped {
        tracing::info!(
            "left {} out of the package: {}",
            skipped.file_name,
            skipped.reason
        );
    }
    let notes = without_skipped_media(notes, &media.skipped);
    let project = &selection.project;
    Ok(BuiltPackage {
        bytes: write_package_bytes(project, notes, media.files, now_ms()).await?,
        file_name: format!("{}.apkg", safe_file_name(&project.settings.name)),
        skipped_media_count: media.skipped.len() as u64,
        delivered: DeliveredPackage {
            project_id: project.id.clone(),
            flashcard_ids: selection
                .flashcards
                .into_iter()
                .map(|flashcard| flashcard.id)
                .collect(),
            exported_at_ms: marks_exported.then_some(selection.read_at_ms),
        },
    })
}

/// Writes the package in memory on a blocking thread; 500 `package_failed` when it cannot be written.
async fn write_package_bytes(
    project: &Project,
    notes: Vec<AnkiNote>,
    media: Vec<PackageMedia>,
    exported_at_ms: u64,
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
            exported_at_ms,
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

fn ensure_absolute(path: &str) -> Result<(), ApiFailure> {
    if FilePath::new(path).is_absolute() {
        Ok(())
    } else {
        Err(bad_request(format!(
            "the save path {path:?} is not absolute"
        )))
    }
}

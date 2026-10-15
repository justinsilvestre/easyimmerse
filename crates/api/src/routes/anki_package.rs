//! Exporting a project's flashcards as a legacy Anki deck package (.apkg), saved at a path or sent for download.

use std::io::Cursor;
use std::path::Path as FilePath;

use axum::extract::{Path, State};
use axum::http::header::{CONTENT_DISPOSITION, CONTENT_TYPE};
use axum::http::{HeaderMap, HeaderName, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::{Extension, Json};
use easyimmerse_anki::{AnkiNote, CardScheduling, PackageMedia, render_note, write_package};
use easyimmerse_core::flashcard::FlashcardId;
use easyimmerse_core::project::{Project, ProjectId};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::anki_media::{render_media, without_skipped_media};
use crate::anki_selection::{Selection, deck_spec, load_selection};
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

/// Writes the flashcards into a legacy Anki deck package (.apkg) with their audio clips and screenshots.
/// A clip or screenshot the server cannot render, as from a file the browser holds, is left out and counted.
/// Once the package has been saved, or sent to the client in full, the flashcards are marked exported.
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
    let selection = load_selection(&state, project_id, request.flashcard_ids).await?;
    if selection.flashcards.is_empty() {
        return Err(not_found("none of the named flashcards is in the project"));
    }
    let package = build_package(&state, token, selection).await?;
    match request.save_path {
        Some(path) => save_package(&state, package, &path).await,
        None => Ok(package_download(state, package)),
    }
}

/// A package built in memory, with what is recorded once it has been delivered.
struct BuiltPackage {
    bytes: Vec<u8>,
    file_name: String,
    skipped_media_count: u64,
    export: ExportRecord,
}

/// The flashcards a package holds, and the time they were read, which marks them exported.
struct ExportRecord {
    project_id: ProjectId,
    flashcard_ids: Vec<FlashcardId>,
    exported_at_ms: u64,
}

/// Builds the package, dating its notes at the time it is written, since Anki updates a note it already has only from a newer one.
async fn build_package(
    state: &AppState,
    token: TokenKind,
    selection: Selection,
) -> Result<BuiltPackage, ApiFailure> {
    let Selection {
        project,
        flashcards,
        read_at_ms,
    } = selection;
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
        bytes: write_package_bytes(&project, notes, media.files, now_ms()).await?,
        file_name: format!("{}.apkg", safe_file_name(&project.settings.name)),
        skipped_media_count: media.skipped.len() as u64,
        export: ExportRecord {
            project_id: project.id,
            flashcard_ids: flashcards
                .into_iter()
                .map(|flashcard| flashcard.id)
                .collect(),
            exported_at_ms: read_at_ms,
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
        flashcard_count: package.export.flashcard_ids.len() as u64,
        skipped_media_count: package.skipped_media_count,
    };
    record_export(state, package.export).await?;
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
    let BuiltPackage { bytes, export, .. } = package;
    let body = body_then(bytes, async move {
        if let Err(failure) = record_export(&state, export).await {
            tracing::error!("could not record the export: {}", failure.error.message);
        }
    });
    (StatusCode::OK, headers, body).into_response()
}

async fn record_export(state: &AppState, export: ExportRecord) -> Result<(), ApiFailure> {
    state
        .with_storage(move |storage| {
            storage.record_anki_export(
                &export.project_id,
                &export.flashcard_ids,
                export.exported_at_ms,
            )
        })
        .await
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

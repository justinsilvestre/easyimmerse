//! Routes that read a dictionary from the server's own file system, which only a token allowed to read local paths may use.

use std::path::PathBuf;

use axum::extract::State;
use axum::http::StatusCode;
use axum::{Extension, Json};
use easyimmerse_core::dictionary::{
    DictionarySource, SourceFile, TableLayout, TablePreview, preview_table_in,
};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure, bad_request, internal, not_found};
use crate::auth::token_kind::TokenKind;
use crate::local_dictionary_files::read_dictionary_files;
use crate::local_path::ensure_local_paths_allowed;
use crate::local_table_file::{PREVIEW_BYTES, is_table_file, read_table_file};
use crate::routes::dictionary_imports::{ImportJobStarted, start_import};
use crate::state::AppState;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ImportLocalDictionaryRequest {
    /// A dictionary file, imported with its siblings of the same stem, or a directory of dictionary files.
    /// A CSV, TSV or Tabfile table file is imported on its own.
    pub path: String,
    /// Replaces the detected layout of a CSV, TSV or Tabfile table.
    #[serde(
        default,
        rename = "tableLayout",
        skip_serializing_if = "Option::is_none"
    )]
    #[ts(optional)]
    pub table_layout: Option<TableLayout>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct PreviewLocalDictionaryTableRequest {
    /// A CSV, TSV or Tabfile table, or a directory holding one, read as an import of the same path would read it.
    pub path: String,
}

/// Reads the files at the path, then starts importing them and answers with the job to poll
/// at `/dictionaries/imports/{id}`.
#[utoipa::path(
    post,
    path = "/dictionaries/import-local",
    tag = "dictionaries",
    operation_id = "importLocalDictionary",
    security(("bearer_token" = [])),
    request_body = ImportLocalDictionaryRequest,
    responses(
        (status = 202, description = "The import was started", body = ImportJobStarted),
        (status = 400, description = "The files could not be read", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "The token may not read local paths", body = ApiError),
        (status = 404, description = "Nothing at the given path", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn import_local_dictionary(
    State(state): State<AppState>,
    Extension(token): Extension<TokenKind>,
    Json(request): Json<ImportLocalDictionaryRequest>,
) -> Result<(StatusCode, Json<ImportJobStarted>), ApiFailure> {
    ensure_local_paths_allowed(token, &state.config)?;
    let files = read_local_dictionary(request.path, None).await?;
    Ok(start_import(&state, files, request.table_layout))
}

/// Detects what each column of a table at a local path holds and returns that layout with the table's first rows,
/// so that the user can check it before importing the same path. Of a table file, only the start is read.
#[utoipa::path(
    post,
    path = "/dictionaries/preview-local",
    tag = "dictionaries",
    operation_id = "previewLocalDictionaryTable",
    security(("bearer_token" = [])),
    request_body = PreviewLocalDictionaryTableRequest,
    responses(
        (status = 200, description = "The detected layout and the first rows", body = TablePreview),
        (status = 400, description = "The files could not be read as a table", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "The token may not read local paths", body = ApiError),
        (status = 404, description = "Nothing at the given path", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn preview_local_dictionary_table(
    State(state): State<AppState>,
    Extension(token): Extension<TokenKind>,
    Json(request): Json<PreviewLocalDictionaryTableRequest>,
) -> Result<Json<TablePreview>, ApiFailure> {
    ensure_local_paths_allowed(token, &state.config)?;
    let files = read_local_dictionary(request.path, Some(PREVIEW_BYTES)).await?;
    let preview =
        tokio::task::spawn_blocking(move || preview_table_in(DictionarySource::new(files)?))
            .await
            .map_err(|error| internal(error.to_string()))??;
    Ok(Json(preview))
}

/// Reads the dictionary at a local path on the blocking pool: a table file on its own, only its first `limit` bytes when given;
/// any other file with its siblings of the same stem; or every file beneath a directory, whatever its name.
async fn read_local_dictionary(
    path: String,
    limit: Option<u64>,
) -> Result<Vec<SourceFile>, ApiFailure> {
    let path_buf = PathBuf::from(&path);
    tokio::task::spawn_blocking(move || {
        if is_table_file(&path_buf) && path_buf.is_file() {
            read_table_file(&path_buf, limit).map(|file| vec![file])
        } else {
            read_dictionary_files(&path_buf)
        }
    })
    .await
    .map_err(|error| internal(error.to_string()))?
    .map_err(|error| describe_read_error(&path, error))
}

fn describe_read_error(path: &str, error: std::io::Error) -> ApiFailure {
    match error.kind() {
        std::io::ErrorKind::NotFound => not_found(format!("nothing at {path:?}")),
        _ => bad_request(format!("could not read {path:?}: {error}")),
    }
}

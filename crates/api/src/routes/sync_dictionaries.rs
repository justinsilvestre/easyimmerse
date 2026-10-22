//! The content of whole dictionaries, which a device downloads and uploads while syncing,
//! since their content tables do not sync row by row.

use std::io::{self, BufReader};

use axum::Json;
use axum::body::Body;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::http::header::CONTENT_TYPE;
use axum::response::Response;
use easyimmerse_core::sync::DictionaryStored;
use easyimmerse_storage::{DictionaryId, StorageError};
use tokio::sync::mpsc;

use crate::auth::error_body::{ApiError, ApiFailure, internal};
use crate::auth::owner::Owner;
use crate::body_files::{BodyFileError, write_body_to_file};
use crate::dictionary_dumps::{DumpChunks, DumpFeed, DumpImportError};
use crate::state::AppState;

/// The largest dump a device may upload, the same as any other upload of the protected routes.
const MAX_DUMP_BYTES: u64 = 1024 * 1024 * 1024;
pub const NDJSON: &str = "application/x-ndjson";

/// Streams one of the principal's dictionaries as NDJSON: a `begin` line with its metadata and import time,
/// a line for each entry, frequency, tag, kanji and media file, and an `end` line.
#[utoipa::path(
    get,
    path = "/sync/dictionaries/{id}/content",
    tag = "sync",
    operation_id = "getDictionaryContent",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The dictionary id")),
    responses(
        (status = 200, description = "The dictionary, one JSON object per line", body = String, content_type = "application/x-ndjson"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "The principal has no dictionary with this id", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_dictionary_content(
    State(state): State<AppState>,
    Owner(owner): Owner,
    Path(id): Path<String>,
) -> Result<Response, ApiFailure> {
    let storage = state.storage.clone();
    let id = DictionaryId(id);
    let mut chunks = tokio::task::spawn_blocking(move || DumpChunks::start(storage, &owner, &id))
        .await
        .map_err(|error| internal(error.to_string()))??;
    let (sender, receiver) = mpsc::channel::<Result<Vec<u8>, io::Error>>(4);
    tokio::task::spawn_blocking(move || {
        loop {
            let chunk = match chunks.next_chunk() {
                Ok(Some(chunk)) => Ok(chunk),
                Ok(None) => return,
                Err(error) => Err(io::Error::other(error)),
            };
            let failed = chunk.is_err();
            if sender.blocking_send(chunk).is_err() || failed {
                return;
            }
        }
    });
    let stream = futures_util::stream::unfold(receiver, |mut receiver| async move {
        receiver.recv().await.map(|chunk| (chunk, receiver))
    });
    Response::builder()
        .header(CONTENT_TYPE, NDJSON)
        .body(Body::from_stream(stream))
        .map_err(|error| internal(error.to_string()))
}

/// Imports a dictionary that a device uploads as the principal's, under the id it has there,
/// from the NDJSON that `GET /sync/dictionaries/{id}/content` writes.
#[utoipa::path(
    put,
    path = "/sync/dictionaries/{id}/content",
    tag = "sync",
    operation_id = "putDictionaryContent",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The dictionary id")),
    request_body(
        description = "The dictionary, one JSON object per line",
        content(("application/x-ndjson")),
    ),
    responses(
        (status = 201, description = "The dictionary was stored", body = DictionaryStored),
        (status = 400, description = "The body is not a whole dump (code `bad_dump`)", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 409, description = "A dictionary with this id or title is stored already (code `dictionary_exists`)", body = ApiError),
        (status = 413, description = "The body is larger than 1 GiB", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn put_dictionary_content(
    State(state): State<AppState>,
    Owner(owner): Owner,
    Path(id): Path<String>,
    body: Body,
) -> Result<(StatusCode, Json<DictionaryStored>), ApiFailure> {
    let id = DictionaryId(id);
    let checked_id = id.clone();
    let is_stored = state
        .with_storage(move |storage| match storage.get_dictionary(&checked_id) {
            Ok(_) => Ok(true),
            Err(StorageError::DictionaryNotFound(_)) => Ok(false),
            Err(error) => Err(error),
        })
        .await?;
    if is_stored {
        return Err(dictionary_exists());
    }
    let file = tempfile::tempfile().map_err(|error| internal(error.to_string()))?;
    let (file, _) = write_body_to_file(body, file, Some(MAX_DUMP_BYTES))
        .await
        .map_err(body_failure)?;
    let storage = state.storage.clone();
    let stored = tokio::task::spawn_blocking(move || {
        let mut feed = DumpFeed::open(BufReader::new(file))?;
        let imported_at = feed.imported_at;
        let stored =
            storage.store_synced_dictionary(&owner, &id, imported_at, |sink| feed.feed(sink));
        feed.finish(stored)
    })
    .await
    .map_err(|error| internal(error.to_string()))?;
    match stored {
        Ok(updated_at_ms) => Ok((
            StatusCode::CREATED,
            Json(DictionaryStored { updated_at_ms }),
        )),
        Err(DumpImportError::BadDump(message)) => Err(bad_dump(message)),
        Err(DumpImportError::Storage(
            StorageError::DictionaryExists(_) | StorageError::DictionaryAlreadyImported(_),
        )) => Err(dictionary_exists()),
        Err(DumpImportError::Storage(error)) => Err(error.into()),
    }
}

fn dictionary_exists() -> ApiFailure {
    ApiFailure::new(
        StatusCode::CONFLICT,
        "dictionary_exists",
        "this server already has a dictionary with this id or title",
    )
}

fn bad_dump(message: impl Into<String>) -> ApiFailure {
    ApiFailure::new(StatusCode::BAD_REQUEST, "bad_dump", message)
}

fn body_failure(error: BodyFileError) -> ApiFailure {
    match error {
        BodyFileError::TooLarge => ApiFailure::new(
            StatusCode::PAYLOAD_TOO_LARGE,
            "payload_too_large",
            "a dictionary may hold at most 1 GiB",
        ),
        BodyFileError::Body(message) => bad_dump(format!("the body broke off: {message}")),
        BodyFileError::Io(error) => internal(error.to_string()),
    }
}

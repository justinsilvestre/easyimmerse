//! The files of library items: uploading an item's file and serving it,
//! and the clips and screenshots that a publish rendered for the item's cues.

use std::fs::File;

use axum::Json;
use axum::body::Body;
use axum::extract::{Path, Query, Request, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::Response;
use easyimmerse_core::document::parse_document;
use easyimmerse_core::library::{
    LibraryCover, LibraryItem, LibraryItemId, LibraryItemKind, LibrarySegment,
};
use serde::Deserialize;
use utoipa::IntoParams;

use crate::auth::error_body::{ApiError, ApiFailure, bad_request, internal};
use crate::auth::library_manager::LibraryManager;
use crate::auth::principal::Principal;
use crate::body_files::{BodyFileError, write_body_to_file};
use crate::library_covers::{refresh_cover, remove_cover};
use crate::library_paths::LibraryItemPaths;
use crate::library_segments::text_of_document;
use crate::routes::library_support::{
    item_paths, load_editable_item, load_item, load_published_item, load_visible_item, source_path,
};
use crate::routes::media_stream::serve_file;
use crate::routes::stored_copies::{content_length, length_required};
use crate::state::AppState;

/// The matched path of the file route, which the bearer middleware lets authenticate with a `token` query parameter.
pub const LIBRARY_FILE_ROUTE_PATH: &str = "/library/items/{item_id}/file";

#[derive(Debug, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct LibraryFileQuery {
    /// The uploaded file's original name, whose extension tells its type.
    pub file_name: String,
}

#[derive(Debug, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct LibraryMediaQuery {
    /// The bearer token, for media and image elements, which cannot send headers.
    #[allow(dead_code)]
    pub token: Option<String>,
}

/// Stores the request body as the item's file, replacing any earlier one. `Content-Length` is required.
/// A document item's file is parsed at once into one segment per paragraph, which replace the item's text.
/// Unless a cover was uploaded, the cover of the old file goes, and an EPUB file's own cover takes its place.
#[utoipa::path(
    put,
    path = "/library/items/{item_id}/file",
    tag = "library",
    operation_id = "uploadLibraryFile",
    security(("bearer_token" = [])),
    params(("item_id" = String, Path, description = "The library item id"), LibraryFileQuery),
    request_body(description = "The file's bytes", content(("application/octet-stream"))),
    responses(
        (status = 200, description = "The item with its new file", body = LibraryItem),
        (status = 400, description = "The file name is empty, the body was not as long as its `Content-Length`, or a document could not be parsed", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`forbidden`: the principal does not manage the library", body = ApiError),
        (status = 404, description = "No such item", body = ApiError),
        (status = 409, description = "`item_published` or `item_processing`: the item is published or being published; or `uploads_unavailable`: this server keeps no library files", body = ApiError),
        (status = 411, description = "`length_required`: the request has no `Content-Length`", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn upload_library_file(
    _: LibraryManager,
    State(state): State<AppState>,
    Path(item_id): Path<LibraryItemId>,
    Query(query): Query<LibraryFileQuery>,
    headers: HeaderMap,
    body: Body,
) -> Result<Json<LibraryItem>, ApiFailure> {
    let file_name = query.file_name.trim().to_string();
    if file_name.is_empty() {
        return Err(bad_request("the file needs a name"));
    }
    let length = content_length(&headers).ok_or_else(length_required)?;
    let item = load_editable_item(&state, &item_id).await?;
    let paths = item_paths(&state, &item_id)?;
    let upload = paths.upload();
    let stored = store_upload(&state, &item, &paths, body, length, &file_name).await;
    if stored.is_err() {
        let _ = tokio::fs::remove_file(&upload).await;
    }
    stored.map(Json)
}

async fn store_upload(
    state: &AppState,
    item: &LibraryItem,
    paths: &LibraryItemPaths,
    body: Body,
    length: u64,
    file_name: &str,
) -> Result<LibraryItem, ApiFailure> {
    let file = create_upload_file(paths).await?;
    write_upload(body, file, length).await?;
    let text = match item.kind {
        LibraryItemKind::Document => Some(read_document(paths).await?),
        LibraryItemKind::Video | LibraryItemKind::Audio => None,
    };
    replace_source(paths, item, file_name).await?;
    let (item_id, file_name) = (item.id.clone(), file_name.to_string());
    let stored = state
        .with_storage(move |storage| {
            if let Some(text) = &text {
                storage.replace_library_segments(&item_id, text)?;
            }
            storage.set_library_file(&item_id, &file_name, length)
        })
        .await?;
    match (stored.cover, stored.kind) {
        (LibraryCover::Uploaded, _) => Ok(stored),
        (_, LibraryItemKind::Document) => refresh_cover(state, &stored).await,
        (_, LibraryItemKind::Video | LibraryItemKind::Audio) => remove_cover(state, &stored).await,
    }
}

async fn create_upload_file(paths: &LibraryItemPaths) -> Result<File, ApiFailure> {
    tokio::fs::create_dir_all(&paths.dir)
        .await
        .map_err(|error| internal(format!("the library directory could not be made: {error}")))?;
    let file = tokio::fs::File::create(paths.upload())
        .await
        .map_err(|error| internal(format!("the file could not be written: {error}")))?;
    Ok(file.into_std().await)
}

async fn write_upload(body: Body, file: File, length: u64) -> Result<(), ApiFailure> {
    match write_body_to_file(body, file, Some(length)).await {
        Ok((_, written)) if written == length => Ok(()),
        Ok(_) | Err(BodyFileError::TooLarge) => Err(bad_request(
            "the body was not as long as its Content-Length header said",
        )),
        Err(BodyFileError::Body(message)) => {
            Err(bad_request(format!("the body broke off: {message}")))
        }
        Err(BodyFileError::Io(error)) => Err(internal(error.to_string())),
    }
}

async fn read_document(
    paths: &LibraryItemPaths,
) -> Result<easyimmerse_core::library::LibraryText, ApiFailure> {
    let bytes = tokio::fs::read(paths.upload())
        .await
        .map_err(|error| internal(format!("the uploaded file could not be read: {error}")))?;
    Ok(text_of_document(&parse_document(&bytes, None)?))
}

/// Moves the upload into the place of the source, removing an earlier source of another extension.
async fn replace_source(
    paths: &LibraryItemPaths,
    item: &LibraryItem,
    file_name: &str,
) -> Result<(), ApiFailure> {
    if let Some(previous) = &item.file_name {
        let _ = tokio::fs::remove_file(paths.source(previous)).await;
    }
    tokio::fs::rename(paths.upload(), paths.source(file_name))
        .await
        .map_err(|error| internal(format!("the file could not be stored: {error}")))
}

/// Serves the item's file with range requests, for the manager's preview.
#[utoipa::path(
    get,
    path = "/library/items/{item_id}/file",
    tag = "library",
    operation_id = "getLibraryFile",
    security(("bearer_token" = [])),
    params(("item_id" = String, Path, description = "The library item id"), LibraryMediaQuery),
    responses(
        (status = 200, description = "The whole file", body = Vec<u8>, content_type = "application/octet-stream"),
        (status = 206, description = "The requested byte range", body = Vec<u8>, content_type = "application/octet-stream"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`forbidden`: the principal does not manage the library", body = ApiError),
        (status = 404, description = "No such item, or no file uploaded for it", body = ApiError),
        (status = 409, description = "`uploads_unavailable`: this server keeps no library files", body = ApiError),
        (status = 416, description = "The range lies outside the file"),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_library_file(
    _: LibraryManager,
    State(state): State<AppState>,
    Path(item_id): Path<LibraryItemId>,
    request: Request,
) -> Result<Response, ApiFailure> {
    let item = load_item(&state, &item_id).await?;
    let path = source_path(&item_paths(&state, &item_id)?, &item)?;
    Ok(serve_file(&path, request).await)
}

/// The uploaded file of an item the principal may see, which media files of the item play:
/// a published item's for anyone, and an unpublished item's for a library manager preparing it.
pub async fn visible_source_path(
    state: &AppState,
    principal: &Principal,
    item_id: &LibraryItemId,
) -> Result<String, ApiFailure> {
    let item = load_visible_item(state, principal, item_id).await?;
    source_path(&item_paths(state, item_id)?, &item)
}

/// The clip a publish rendered for the cue of the item that runs exactly from `start_ms` to `end_ms`.
pub async fn preprocessed_clip(
    state: &AppState,
    item_id: &LibraryItemId,
    start_ms: u64,
    end_ms: u64,
) -> Result<Vec<u8>, ApiFailure> {
    let is_window = |segment: &LibrarySegment| {
        segment.start_ms == Some(start_ms) && segment.end_ms == Some(end_ms)
    };
    let index = preprocessed_segment(state, item_id, is_window).await?;
    read_preprocessed(&item_paths(state, item_id)?.clip(index)).await
}

/// The screenshot a publish rendered for the cue of the item whose screenshot time is `at_ms`.
pub async fn preprocessed_frame(
    state: &AppState,
    item_id: &LibraryItemId,
    at_ms: u64,
) -> Result<Vec<u8>, ApiFailure> {
    let is_moment = |segment: &LibrarySegment| segment.screenshot_at_ms == Some(at_ms);
    let index = preprocessed_segment(state, item_id, is_moment).await?;
    read_preprocessed(&item_paths(state, item_id)?.screenshot(index)).await
}

async fn preprocessed_segment(
    state: &AppState,
    item_id: &LibraryItemId,
    matches: impl Fn(&LibrarySegment) -> bool,
) -> Result<u32, ApiFailure> {
    load_published_item(state, item_id).await?;
    let id = item_id.clone();
    let text = state
        .with_storage(move |storage| storage.get_library_text(&id))
        .await?;
    text.segments
        .iter()
        .find(|segment| matches(segment))
        .map(|segment| segment.index)
        .ok_or_else(not_preprocessed)
}

async fn read_preprocessed(path: &std::path::Path) -> Result<Vec<u8>, ApiFailure> {
    tokio::fs::read(path).await.map_err(|_| not_preprocessed())
}

fn not_preprocessed() -> ApiFailure {
    ApiFailure::new(
        StatusCode::NOT_FOUND,
        "not_preprocessed",
        "the library prepared no clip or screenshot for that time",
    )
}

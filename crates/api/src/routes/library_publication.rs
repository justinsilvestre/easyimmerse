//! Publishing a library item to learners, and taking it back.

use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use easyimmerse_core::library::{LibraryItem, LibraryItemId, LibraryItemStatus};

use crate::auth::error_body::{ApiError, ApiFailure, bad_request};
use crate::auth::library_manager::LibraryManager;
use crate::library_publish::start_library_publish;
use crate::routes::library_support::{item_processing, load_editable_item, load_item};
use crate::state::AppState;

/// Starts preparing the clip and screenshot of every cue, and the cover, in the background.
/// The item is shown to learners once that is done; until then its status is `processing`.
/// The item needs a file and at least one segment.
#[utoipa::path(
    post,
    path = "/library/items/{item_id}/publish",
    tag = "library",
    operation_id = "publishLibraryItem",
    security(("bearer_token" = [])),
    params(("item_id" = String, Path, description = "The library item id")),
    responses(
        (status = 202, description = "The item, now being published", body = LibraryItem),
        (status = 400, description = "The item has no file or no segments", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`forbidden`: the principal does not manage the library", body = ApiError),
        (status = 404, description = "No such item", body = ApiError),
        (status = 409, description = "`item_published` or `item_processing`: the item is already published or being published; or `uploads_unavailable`: this server keeps no library files", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 503, description = "A video or audio item, and this server has no ffmpeg (code `conversion_unavailable`)", body = ApiError),
    ),
)]
pub async fn publish_library_item(
    _: LibraryManager,
    State(state): State<AppState>,
    Path(item_id): Path<LibraryItemId>,
) -> Result<(StatusCode, Json<LibraryItem>), ApiFailure> {
    let item = load_editable_item(&state, &item_id).await?;
    if item.file_name.is_none() {
        return Err(bad_request("the item needs a file before it is published"));
    }
    if item.segment_count == 0 {
        return Err(bad_request(
            "the item needs some text before it is published",
        ));
    }
    let item = start_library_publish(&state, item).await?;
    Ok((StatusCode::ACCEPTED, Json(item)))
}

/// Hides the item from learners. The flashcards they made from it are kept.
#[utoipa::path(
    post,
    path = "/library/items/{item_id}/unpublish",
    tag = "library",
    operation_id = "unpublishLibraryItem",
    security(("bearer_token" = [])),
    params(("item_id" = String, Path, description = "The library item id")),
    responses(
        (status = 200, description = "The item, now a draft", body = LibraryItem),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`forbidden`: the principal does not manage the library", body = ApiError),
        (status = 404, description = "No such item", body = ApiError),
        (status = 409, description = "`item_processing`: the item is being published", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn unpublish_library_item(
    _: LibraryManager,
    State(state): State<AppState>,
    Path(item_id): Path<LibraryItemId>,
) -> Result<Json<LibraryItem>, ApiFailure> {
    let item = load_item(&state, &item_id).await?;
    if item.status == LibraryItemStatus::Processing {
        return Err(item_processing());
    }
    let item = state
        .with_storage(move |storage| {
            storage.set_library_status(&item_id, &LibraryItemStatus::Draft)
        })
        .await?;
    Ok(Json(item))
}

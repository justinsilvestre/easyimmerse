//! The items of the server's library: listing and reading them, and creating, changing and deleting them.

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::{Extension, Json};
use easyimmerse_core::library::{
    LibraryItem, LibraryItemDraft, LibraryItemId, LibraryItemKind, LibraryItemStatus,
    LibraryListing,
};

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::auth::library_manager::LibraryManager;
use crate::auth::principal::Principal;
use crate::library_publish::{cover_time, render_cover};
use crate::routes::library_support::{
    item_paths, load_item, load_visible_item, require_editable, source_path,
};
use crate::state::AppState;

/// Lists the published items, or every item for a library manager, by title.
#[utoipa::path(
    get,
    path = "/library/items",
    tag = "library",
    operation_id = "listLibraryItems",
    security(("bearer_token" = [])),
    responses(
        (status = 200, description = "The items the principal may see", body = LibraryListing),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn list_library_items(
    State(state): State<AppState>,
    Extension(principal): Extension<Principal>,
) -> Result<Json<LibraryListing>, ApiFailure> {
    let include_unpublished = principal.can_manage_library();
    let items = state
        .with_storage(move |storage| storage.list_library_items(include_unpublished))
        .await?;
    Ok(Json(LibraryListing { items }))
}

#[utoipa::path(
    get,
    path = "/library/items/{item_id}",
    tag = "library",
    operation_id = "getLibraryItem",
    security(("bearer_token" = [])),
    params(("item_id" = String, Path, description = "The library item id")),
    responses(
        (status = 200, description = "The item", body = LibraryItem),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such item, or one that is not published and the principal does not manage the library", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_library_item(
    State(state): State<AppState>,
    Extension(principal): Extension<Principal>,
    Path(item_id): Path<LibraryItemId>,
) -> Result<Json<LibraryItem>, ApiFailure> {
    Ok(Json(load_visible_item(&state, &principal, &item_id).await?))
}

/// Creates a draft item with no file and no text.
#[utoipa::path(
    post,
    path = "/library/items",
    tag = "library",
    operation_id = "createLibraryItem",
    security(("bearer_token" = [])),
    request_body = LibraryItemDraft,
    responses(
        (status = 201, description = "The new draft item", body = LibraryItem),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`forbidden`: the principal does not manage the library", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn create_library_item(
    _: LibraryManager,
    State(state): State<AppState>,
    Json(draft): Json<LibraryItemDraft>,
) -> Result<(StatusCode, Json<LibraryItem>), ApiFailure> {
    let item = state
        .with_storage(move |storage| storage.create_library_item(&draft))
        .await?;
    Ok((StatusCode::CREATED, Json(item)))
}

/// Changes an item's metadata in any status, except its kind once it is published.
/// Changing the cover time of a published video item renders its cover again.
#[utoipa::path(
    put,
    path = "/library/items/{item_id}",
    tag = "library",
    operation_id = "updateLibraryItem",
    security(("bearer_token" = [])),
    params(("item_id" = String, Path, description = "The library item id")),
    request_body = LibraryItemDraft,
    responses(
        (status = 200, description = "The item as it now stands", body = LibraryItem),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`forbidden`: the principal does not manage the library", body = ApiError),
        (status = 404, description = "No such item", body = ApiError),
        (status = 409, description = "`item_published` or `item_processing`: the kind of an item that is published or being published cannot change", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 503, description = "The cover must be rendered again, and this server has no ffmpeg (code `conversion_unavailable`)", body = ApiError),
    ),
)]
pub async fn update_library_item(
    _: LibraryManager,
    State(state): State<AppState>,
    Path(item_id): Path<LibraryItemId>,
    Json(draft): Json<LibraryItemDraft>,
) -> Result<Json<LibraryItem>, ApiFailure> {
    let item = load_item(&state, &item_id).await?;
    let is_published = item.status == LibraryItemStatus::Published;
    if draft.kind != item.kind {
        require_editable(&item)?;
    }
    if is_published && item.kind == LibraryItemKind::Video && draft.cover_at_ms != item.cover_at_ms
    {
        render_new_cover(&state, &item, draft.cover_at_ms).await?;
    }
    let item = state
        .with_storage(move |storage| storage.update_library_item(&item_id, &draft))
        .await?;
    Ok(Json(item))
}

async fn render_new_cover(
    state: &AppState,
    item: &LibraryItem,
    cover_at_ms: Option<u64>,
) -> Result<(), ApiFailure> {
    let paths = item_paths(state, &item.id)?;
    let source = source_path(&paths, item)?;
    let item_id = item.id.clone();
    let text = state
        .with_storage(move |storage| storage.get_library_text(&item_id))
        .await?;
    match cover_time(cover_at_ms, &text) {
        Some(at_ms) => render_cover(state, &paths, &source, at_ms).await,
        None => Ok(()),
    }
}

/// Deletes an item with its text and files. Learners' media files of the item stay, but can no longer be played.
#[utoipa::path(
    delete,
    path = "/library/items/{item_id}",
    tag = "library",
    operation_id = "deleteLibraryItem",
    security(("bearer_token" = [])),
    params(("item_id" = String, Path, description = "The library item id")),
    responses(
        (status = 204, description = "The item was deleted"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`forbidden`: the principal does not manage the library", body = ApiError),
        (status = 404, description = "No such item", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn delete_library_item(
    _: LibraryManager,
    State(state): State<AppState>,
    Path(item_id): Path<LibraryItemId>,
) -> Result<StatusCode, ApiFailure> {
    let deleted = item_id.clone();
    state
        .with_storage(move |storage| storage.delete_library_item(&deleted))
        .await?;
    if let Ok(paths) = item_paths(&state, &item_id) {
        remove_dir(&paths.dir).await;
    }
    Ok(StatusCode::NO_CONTENT)
}

async fn remove_dir(dir: &std::path::Path) {
    match tokio::fs::remove_dir_all(dir).await {
        Ok(()) => {}
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => tracing::warn!(
            "the library files in {} could not be deleted: {error}",
            dir.display()
        ),
    }
}

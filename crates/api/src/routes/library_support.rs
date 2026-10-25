//! What the library routes share: loading an item as the principal may see it, refusing changes the item's status does not allow,
//! and finding the item's files.

use axum::http::StatusCode;
use easyimmerse_core::library::{LibraryItem, LibraryItemId, LibraryItemStatus};

use crate::auth::error_body::{ApiFailure, not_found};
use crate::auth::principal::Principal;
use crate::library_paths::LibraryItemPaths;
use crate::state::AppState;

/// Loads an item whatever its status; callers check whether the principal may see it.
pub async fn load_item(
    state: &AppState,
    item_id: &LibraryItemId,
) -> Result<LibraryItem, ApiFailure> {
    let item_id = item_id.clone();
    state
        .with_storage(move |storage| storage.get_library_item(&item_id))
        .await
}

/// Loads an item, answering 404 for an unpublished item to anyone who cannot manage the library.
pub async fn load_visible_item(
    state: &AppState,
    principal: &Principal,
    item_id: &LibraryItemId,
) -> Result<LibraryItem, ApiFailure> {
    let item = load_item(state, item_id).await?;
    if is_visible_to(&item, principal) {
        Ok(item)
    } else {
        Err(not_found(format!(
            "no library item has the id {:?}",
            item_id.0
        )))
    }
}

fn is_visible_to(item: &LibraryItem, principal: &Principal) -> bool {
    item.status == LibraryItemStatus::Published || principal.can_manage_library()
}

/// Loads an item, answering 404 when it is not published, whoever asks.
pub async fn load_published_item(
    state: &AppState,
    item_id: &LibraryItemId,
) -> Result<LibraryItem, ApiFailure> {
    let item = load_item(state, item_id).await?;
    if item.status == LibraryItemStatus::Published {
        Ok(item)
    } else {
        Err(not_found("the library item is not published"))
    }
}

/// Loads an item whose file, text or words may change: any item that is not being published.
pub async fn load_editable_item(
    state: &AppState,
    item_id: &LibraryItemId,
) -> Result<LibraryItem, ApiFailure> {
    let item = load_item(state, item_id).await?;
    require_editable(&item)?;
    Ok(item)
}

/// Refuses a change to the file, text or words of an item that is being published.
pub fn require_editable(item: &LibraryItem) -> Result<(), ApiFailure> {
    match item.status {
        LibraryItemStatus::Processing => Err(item_processing()),
        LibraryItemStatus::Draft
        | LibraryItemStatus::Failed { .. }
        | LibraryItemStatus::Published => Ok(()),
    }
}

/// Refuses to publish an item that is already published or being published.
pub fn require_publishable(item: &LibraryItem) -> Result<(), ApiFailure> {
    match item.status {
        LibraryItemStatus::Published => Err(item_published()),
        LibraryItemStatus::Processing => Err(item_processing()),
        LibraryItemStatus::Draft | LibraryItemStatus::Failed { .. } => Ok(()),
    }
}

/// Refuses to change the kind or translation language of an item that is published or being published,
/// since learners' projects of the item were made for them.
pub fn require_unfixed(item: &LibraryItem) -> Result<(), ApiFailure> {
    match item.status {
        LibraryItemStatus::Published => Err(ApiFailure::new(
            StatusCode::CONFLICT,
            "fixed_while_published",
            "the kind and translation language of a published item cannot change",
        )),
        LibraryItemStatus::Processing => Err(item_processing()),
        LibraryItemStatus::Draft | LibraryItemStatus::Failed { .. } => Ok(()),
    }
}

pub fn item_published() -> ApiFailure {
    ApiFailure::new(
        StatusCode::CONFLICT,
        "item_published",
        "the item is already published",
    )
}

pub fn item_processing() -> ApiFailure {
    ApiFailure::new(
        StatusCode::CONFLICT,
        "item_processing",
        "the item is being published; wait until that finishes",
    )
}

/// The files of the item; 409 `uploads_unavailable` when the server has no uploads directory to keep them in,
/// and 404 for an id not of the form the server makes.
pub fn item_paths(
    state: &AppState,
    item_id: &LibraryItemId,
) -> Result<LibraryItemPaths, ApiFailure> {
    let uploads = state.config.uploads.as_ref().ok_or_else(|| {
        ApiFailure::new(
            StatusCode::CONFLICT,
            "uploads_unavailable",
            "this server has no uploads directory, so it keeps no library files",
        )
    })?;
    LibraryItemPaths::new(&uploads.dir, item_id)
        .ok_or_else(|| not_found(format!("no library item has the id {:?}", item_id.0)))
}

/// The uploaded file of the item; 404 when none has been uploaded.
pub fn source_path(paths: &LibraryItemPaths, item: &LibraryItem) -> Result<String, ApiFailure> {
    let file_name = item
        .file_name
        .as_deref()
        .ok_or_else(|| not_found("no file has been uploaded for the library item"))?;
    Ok(paths.source(file_name).to_string_lossy().into_owned())
}

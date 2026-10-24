//! The cover picture of a library item: serving it, and choosing where it comes from.
//! The cover can change whatever the item's status, except while the item is being published.

use axum::body::Body;
use axum::extract::{Path, Request, State};
use axum::http::StatusCode;
use axum::response::Response;
use axum::{Extension, Json};
use easyimmerse_core::image_media_type::image_media_type;
use easyimmerse_core::library::{
    LibraryCover, LibraryCoverFrame, LibraryItem, LibraryItemId, LibraryItemKind, LibraryItemStatus,
};

use crate::auth::error_body::{ApiError, ApiFailure, bad_request, not_found};
use crate::auth::library_manager::LibraryManager;
use crate::auth::principal::Principal;
use crate::library_covers::{find_cover_file, refresh_cover, store_cover};
use crate::routes::library_files::LibraryMediaQuery;
use crate::routes::library_support::{item_paths, item_processing, load_item, load_visible_item};
use crate::routes::media_stream::serve_file;
use crate::state::AppState;

/// The matched path of the cover route, which the bearer middleware lets authenticate with a `token` query parameter.
pub const LIBRARY_COVER_ROUTE_PATH: &str = "/library/items/{item_id}/cover";

/// The largest cover picture a manager may upload.
const MAX_COVER_BYTES: usize = 10 * 1024 * 1024;

#[utoipa::path(
    get,
    path = "/library/items/{item_id}/cover",
    tag = "library",
    operation_id = "getLibraryCover",
    security(("bearer_token" = [])),
    params(("item_id" = String, Path, description = "The library item id"), LibraryMediaQuery),
    responses(
        (status = 200, description = "The cover picture, a JPEG, PNG, GIF or WebP image", body = Vec<u8>, content_type = "image/*"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such item, one the principal may not see, or an item without a cover", body = ApiError),
        (status = 409, description = "`uploads_unavailable`: this server keeps no library files", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_library_cover(
    State(state): State<AppState>,
    Extension(principal): Extension<Principal>,
    Path(item_id): Path<LibraryItemId>,
    request: Request,
) -> Result<Response, ApiFailure> {
    let item = load_visible_item(&state, &principal, &item_id).await?;
    let paths = item_paths(&state, &item_id)?;
    let no_cover = || not_found("the library item has no cover");
    if !item.has_cover {
        return Err(no_cover());
    }
    let path = find_cover_file(&paths).await.ok_or_else(no_cover)?;
    Ok(serve_file(&path.to_string_lossy(), request).await)
}

/// Makes the request body, a JPEG, PNG, GIF or WebP picture, the item's cover, in place of any other.
#[utoipa::path(
    put,
    path = "/library/items/{item_id}/cover",
    tag = "library",
    operation_id = "uploadLibraryCover",
    security(("bearer_token" = [])),
    params(("item_id" = String, Path, description = "The library item id")),
    request_body(description = "The picture's bytes", content(("application/octet-stream"))),
    responses(
        (status = 200, description = "The item with its new cover", body = LibraryItem),
        (status = 400, description = "The body is not a JPEG, PNG, GIF or WebP picture", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`forbidden`: the principal does not manage the library", body = ApiError),
        (status = 404, description = "No such item", body = ApiError),
        (status = 409, description = "`item_processing`: the item is being published; or `uploads_unavailable`: this server keeps no library files", body = ApiError),
        (status = 413, description = "`cover_too_large`: the picture is larger than 10 MiB", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn upload_library_cover(
    _: LibraryManager,
    State(state): State<AppState>,
    Path(item_id): Path<LibraryItemId>,
    body: Body,
) -> Result<Json<LibraryItem>, ApiFailure> {
    let item = load_cover_changeable_item(&state, &item_id).await?;
    let bytes = axum::body::to_bytes(body, MAX_COVER_BYTES)
        .await
        .map_err(|_| cover_too_large())?;
    let media_type = image_media_type(&bytes)
        .ok_or_else(|| bad_request("the cover must be a JPEG, PNG, GIF or WebP picture"))?;
    store_cover(&state, &item, &bytes, media_type).await?;
    Ok(Json(
        choose_cover(&state, &item, LibraryCover::Uploaded).await?,
    ))
}

/// Takes a video item's cover from the frame at the given time, rendering it at once when the video's file is uploaded.
#[utoipa::path(
    put,
    path = "/library/items/{item_id}/cover/frame",
    tag = "library",
    operation_id = "setLibraryCoverFrame",
    security(("bearer_token" = [])),
    params(("item_id" = String, Path, description = "The library item id")),
    request_body = LibraryCoverFrame,
    responses(
        (status = 200, description = "The item with its new cover", body = LibraryItem),
        (status = 400, description = "The item is not a video", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`forbidden`: the principal does not manage the library", body = ApiError),
        (status = 404, description = "No such item, or the video has no frame at that time", body = ApiError),
        (status = 409, description = "`item_processing`: the item is being published; or `uploads_unavailable`: this server keeps no library files", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 503, description = "This server has no ffmpeg to render the frame (code `conversion_unavailable`)", body = ApiError),
    ),
)]
pub async fn set_library_cover_frame(
    _: LibraryManager,
    State(state): State<AppState>,
    Path(item_id): Path<LibraryItemId>,
    Json(frame): Json<LibraryCoverFrame>,
) -> Result<Json<LibraryItem>, ApiFailure> {
    let item = load_cover_changeable_item(&state, &item_id).await?;
    if item.kind != LibraryItemKind::Video {
        return Err(bad_request(
            "only a video's cover can be taken from a frame",
        ));
    }
    let cover = LibraryCover::Frame { at_ms: frame.at_ms };
    Ok(Json(change_cover(&state, item, cover).await?))
}

/// Gives the item its automatic cover again: a video's first cue, rendered at once when the video's file is uploaded,
/// or an EPUB file's own cover. Other items are left without a cover.
#[utoipa::path(
    delete,
    path = "/library/items/{item_id}/cover",
    tag = "library",
    operation_id = "resetLibraryCover",
    security(("bearer_token" = [])),
    params(("item_id" = String, Path, description = "The library item id")),
    responses(
        (status = 200, description = "The item with its automatic cover", body = LibraryItem),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`forbidden`: the principal does not manage the library", body = ApiError),
        (status = 404, description = "No such item", body = ApiError),
        (status = 409, description = "`item_processing`: the item is being published; or `uploads_unavailable`: this server keeps no library files", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 503, description = "This server has no ffmpeg to render a video's frame (code `conversion_unavailable`)", body = ApiError),
    ),
)]
pub async fn reset_library_cover(
    _: LibraryManager,
    State(state): State<AppState>,
    Path(item_id): Path<LibraryItemId>,
) -> Result<Json<LibraryItem>, ApiFailure> {
    let item = load_cover_changeable_item(&state, &item_id).await?;
    Ok(Json(
        change_cover(&state, item, LibraryCover::Automatic).await?,
    ))
}

/// Loads an item whose cover may change: one that is not being published, since a publish renders the cover.
async fn load_cover_changeable_item(
    state: &AppState,
    item_id: &LibraryItemId,
) -> Result<LibraryItem, ApiFailure> {
    let item = load_item(state, item_id).await?;
    if item.status == LibraryItemStatus::Processing {
        return Err(item_processing());
    }
    item_paths(state, item_id)?;
    Ok(item)
}

/// Puts the cover the choice calls for in place, and then records the choice, so that a cover that cannot be made changes nothing.
async fn change_cover(
    state: &AppState,
    item: LibraryItem,
    cover: LibraryCover,
) -> Result<LibraryItem, ApiFailure> {
    let item = LibraryItem { cover, ..item };
    refresh_cover(state, &item).await?;
    choose_cover(state, &item, cover).await
}

async fn choose_cover(
    state: &AppState,
    item: &LibraryItem,
    cover: LibraryCover,
) -> Result<LibraryItem, ApiFailure> {
    let id = item.id.clone();
    state
        .with_storage(move |storage| storage.set_library_cover_choice(&id, cover))
        .await
}

fn cover_too_large() -> ApiFailure {
    ApiFailure::new(
        StatusCode::PAYLOAD_TOO_LARGE,
        "cover_too_large",
        "the cover picture is larger than 10 MiB",
    )
}

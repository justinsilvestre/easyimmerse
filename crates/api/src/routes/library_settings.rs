//! What holds for the whole library: the language its media are in.

use axum::Json;
use axum::extract::State;
use easyimmerse_core::library::LibrarySettings;

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::auth::library_manager::LibraryManager;
use crate::state::AppState;

#[utoipa::path(
    get,
    path = "/library/settings",
    tag = "library",
    operation_id = "getLibrarySettings",
    security(("bearer_token" = [])),
    responses(
        (status = 200, description = "The library's settings", body = LibrarySettings),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_library_settings(
    State(state): State<AppState>,
) -> Result<Json<LibrarySettings>, ApiFailure> {
    let settings = state
        .with_storage(|storage| storage.get_library_settings())
        .await?;
    Ok(Json(settings))
}

/// Replaces the library's settings. The language can change only while the library has no items,
/// since their texts and words are in the language they were made for.
#[utoipa::path(
    put,
    path = "/library/settings",
    tag = "library",
    operation_id = "putLibrarySettings",
    security(("bearer_token" = [])),
    request_body = LibrarySettings,
    responses(
        (status = 200, description = "The library's settings as they now stand", body = LibrarySettings),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`forbidden`: the principal does not manage the library", body = ApiError),
        (status = 409, description = "`library_has_items`: the library has items, so its language cannot change", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn put_library_settings(
    _: LibraryManager,
    State(state): State<AppState>,
    Json(settings): Json<LibrarySettings>,
) -> Result<Json<LibrarySettings>, ApiFailure> {
    let settings = state
        .with_storage(move |storage| storage.set_library_settings(&settings))
        .await?;
    Ok(Json(settings))
}

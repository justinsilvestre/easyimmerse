//! How much of the principal's upload allowance their stored media copies take.

use axum::extract::State;
use axum::{Extension, Json};
use easyimmerse_core::media_copy::StorageStatus;

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::auth::principal::Principal;
use crate::media_copy_files::quota_of;
use crate::state::AppState;

/// Lists the principal's stored copies with their sizes, and the quota they count against.
/// A server without an uploads directory reports a quota of 0, since it keeps no copies.
#[utoipa::path(
    get,
    path = "/storage",
    tag = "media",
    operation_id = "getStorageStatus",
    security(("bearer_token" = [])),
    responses(
        (status = 200, description = "The principal's copies and quota", body = StorageStatus),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_storage_status(
    State(state): State<AppState>,
    Extension(principal): Extension<Principal>,
) -> Result<Json<StorageStatus>, ApiFailure> {
    let quota_bytes = match &state.config.uploads {
        Some(uploads) => quota_of(uploads, &principal),
        None => Some(0),
    };
    let owner = principal.owner_id();
    let (used_bytes, copies) = state
        .with_storage(move |storage| {
            Ok((
                storage.media_copies_size(&owner)?,
                storage.list_media_copies(&owner)?,
            ))
        })
        .await?;
    Ok(Json(StorageStatus {
        quota_bytes,
        used_bytes,
        copies,
    }))
}

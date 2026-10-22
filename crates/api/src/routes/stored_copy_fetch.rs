//! Downloading the linked remote's copy of a media file's bytes to this device, on the person's request.

use axum::extract::{Path, State};
use axum::{Extension, Json};
use easyimmerse_core::media_copy::StoredCopy;
use easyimmerse_core::media_file::MediaFileId;
use easyimmerse_core::project::ProjectId;
use easyimmerse_storage::{OwnerId, RemoteKind};

use crate::auth::error_body::{ApiError, ApiFailure, internal};
use crate::auth::principal::Principal;
use crate::media_copy_files::{copy_file_name, release_copies};
use crate::routes::media::load_media_file;
use crate::routes::stored_copies::{no_stored_copy, uploads_of};
use crate::state::AppState;
use crate::sync::failures::{not_linked, remote_failure, remote_logged_out, require_launch};
use crate::sync::media_transfer::{FetchError, fetch_stored_copy};

/// Downloads the linked remote's copy of the media file into this server's uploads directory,
/// so that the media file plays here although its original is elsewhere. The request lasts as long as the download.
#[utoipa::path(
    post,
    path = "/projects/{id}/media/{media_id}/stored-copy/fetch",
    tag = "sync",
    operation_id = "fetchStoredCopy",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
    ),
    responses(
        (status = 200, description = "The copy is stored here", body = StoredCopy),
        (status = 401, description = "`remote_logged_out`: the linked server ended this device's session", body = ApiError),
        (status = 403, description = "`forbidden`: only the launch token may fetch", body = ApiError),
        (status = 404, description = "No such media file, `not_linked`, or `no_stored_copy` on the remote", body = ApiError),
        (status = 409, description = "`uploads_unavailable`: this server keeps no copies", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 502, description = "`remote_unreachable` or `remote_failed`", body = ApiError),
    ),
)]
pub async fn fetch_stored_copy_route(
    State(state): State<AppState>,
    Extension(principal): Extension<Principal>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
) -> Result<Json<StoredCopy>, ApiFailure> {
    require_launch(&principal)?;
    let uploads = uploads_of(&state)?;
    let media_file = load_media_file(&state, project_id, media_id).await?;
    let remote = state
        .with_storage(|storage| storage.get_sync_remote(&OwnerId::launch(), RemoteKind::Account))
        .await?
        .ok_or_else(not_linked)?;
    let file_name = copy_file_name(&media_file);
    let storage = state.storage.clone();
    let fetched = tokio::task::spawn_blocking(move || {
        fetch_stored_copy(&storage, &remote, &media_file, &uploads.dir, &file_name)
    })
    .await
    .map_err(|error| internal(error.to_string()))?;
    release_copies(&state).await;
    match fetched {
        Ok(copy) => Ok(Json(copy)),
        Err(FetchError::NoToken) => Err(remote_logged_out()),
        Err(FetchError::NoCopy) => Err(no_stored_copy()),
        Err(FetchError::Remote(error)) => Err(remote_failure(error)),
        Err(FetchError::Storage(error)) => Err(error.into()),
        Err(FetchError::Local(error)) => Err(internal(error.to_string())),
    }
}

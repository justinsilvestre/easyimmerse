//! Copies of media bytes that this server keeps for a media file, so that it plays where the original is missing.

use std::fs::File;

use axum::body::Body;
use axum::extract::{Path, Request, State};
use axum::http::header::CONTENT_LENGTH;
use axum::http::{HeaderMap, StatusCode};
use axum::response::Response;
use axum::{Extension, Json};
use easyimmerse_core::media_copy::{StoredCopy, UploadChoiceRequest};
use easyimmerse_core::media_file::{MediaFile, MediaFileId};
use easyimmerse_core::project::ProjectId;
use easyimmerse_storage::NewMediaCopy;
use tower::ServiceExt;
use tower_http::services::ServeFile;

use crate::auth::error_body::{ApiError, ApiFailure, bad_request, internal};
use crate::auth::principal::Principal;
use crate::body_files::{BodyFileError, write_body_to_file};
use crate::config::UploadsConfig;
use crate::media_copy_files::{copy_file_name, quota_of, release_copies};
use crate::now_ms::now_ms;
use crate::routes::media::load_media_file;
use crate::state::AppState;

/// Stores the request body as this server's copy of the media file's bytes, replacing any earlier copy,
/// and records the choice to keep a copy. `Content-Length` is required, so that the quota is checked before the upload.
#[utoipa::path(
    put,
    path = "/projects/{id}/media/{media_id}/stored-copy",
    tag = "media",
    operation_id = "putStoredCopy",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
    ),
    request_body(description = "The media file's bytes", content(("application/octet-stream"))),
    responses(
        (status = 200, description = "The copy was stored", body = StoredCopy),
        (status = 400, description = "The body was shorter or longer than its `Content-Length`, or broke off", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such media file in the project", body = ApiError),
        (status = 409, description = "`uploads_unavailable`: this server keeps no copies", body = ApiError),
        (status = 411, description = "`length_required`: the request has no `Content-Length`", body = ApiError),
        (status = 413, description = "`quota_exceeded`: the copy would take the principal past their quota", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn put_stored_copy(
    State(state): State<AppState>,
    Extension(principal): Extension<Principal>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
    headers: HeaderMap,
    body: Body,
) -> Result<Json<StoredCopy>, ApiFailure> {
    let uploads = uploads_of(&state)?;
    let length = content_length(&headers).ok_or_else(length_required)?;
    let media_file = load_media_file(&state, project_id, media_id).await?;
    let quota = quota_of(&uploads, &principal);
    if let Some(quota) = quota {
        check_room(&state, &principal, &media_file.id, length, quota).await?;
    }
    let file_name = copy_file_name(&media_file);
    let path = uploads.dir.join(&file_name);
    let file = create_copy_file(&uploads, &path).await?;
    let written = write_body_to_file(body, file, Some(length)).await;
    let copy = NewMediaCopy {
        media_file_id: media_file.id.clone(),
        file_name,
        size_bytes: length,
        stored_at_ms: now_ms(),
        quota_bytes: quota,
    };
    let stored = match written {
        Ok((_, written)) if written == length => {
            state
                .with_storage(move |storage| storage.record_media_copy(&copy))
                .await
        }
        Ok(_) | Err(BodyFileError::TooLarge) => Err(bad_request(
            "the body was not as long as its Content-Length header said",
        )),
        Err(BodyFileError::Body(message)) => {
            Err(bad_request(format!("the body broke off: {message}")))
        }
        Err(BodyFileError::Io(error)) => Err(internal(error.to_string())),
    };
    if stored.is_err() {
        let _ = tokio::fs::remove_file(&path).await;
    }
    release_copies(&state).await;
    stored.map(Json)
}

/// Serves this server's copy of the media file's bytes, with range requests.
#[utoipa::path(
    get,
    path = "/projects/{id}/media/{media_id}/stored-copy",
    tag = "media",
    operation_id = "getStoredCopy",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
    ),
    responses(
        (status = 200, description = "The copy's bytes", body = Vec<u8>, content_type = "application/octet-stream"),
        (status = 206, description = "The requested byte range", body = Vec<u8>, content_type = "application/octet-stream"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such media file, or `no_stored_copy`: this server keeps no copy of it", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_stored_copy(
    State(state): State<AppState>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
    request: Request,
) -> Result<Response, ApiFailure> {
    let media_file = load_media_file(&state, project_id, media_id).await?;
    let path = stored_copy_path(&state, &media_file)
        .await?
        .ok_or_else(no_stored_copy)?;
    let Ok(response) = ServeFile::new(path).oneshot(request).await;
    Ok(response.map(Body::new))
}

/// Records whether the person wants a copy of the media file kept on a server, and returns the media file.
/// Turning it off deletes this server's copy; a device that syncs passes the choice on, and the remote then deletes its copy too.
#[utoipa::path(
    put,
    path = "/projects/{id}/media/{media_id}/upload-choice",
    tag = "media",
    operation_id = "setUploadChoice",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
    ),
    request_body = UploadChoiceRequest,
    responses(
        (status = 200, description = "The media file with the choice recorded", body = MediaFile),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such media file in the project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn set_upload_choice(
    State(state): State<AppState>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
    Json(request): Json<UploadChoiceRequest>,
) -> Result<Json<MediaFile>, ApiFailure> {
    load_media_file(&state, project_id, media_id.clone()).await?;
    let media_file = state
        .with_storage(move |storage| storage.set_upload_choice(&media_id, request.is_upload_chosen))
        .await?;
    release_copies(&state).await;
    Ok(Json(media_file))
}

/// The local path of this server's copy of the media file, when it keeps one.
pub async fn stored_copy_path(
    state: &AppState,
    media_file: &MediaFile,
) -> Result<Option<std::path::PathBuf>, ApiFailure> {
    let Some(uploads) = state.config.uploads.clone() else {
        return Ok(None);
    };
    if !media_file.has_stored_copy {
        return Ok(None);
    }
    let media_id = media_file.id.clone();
    let copy = state
        .with_storage(move |storage| storage.get_media_copy(&media_id))
        .await?;
    Ok(copy.map(|copy| uploads.dir.join(copy.file_name)))
}

/// Fails with 413 when the copy would take the principal past their quota, counting the copy it replaces as freed.
async fn check_room(
    state: &AppState,
    principal: &Principal,
    media_id: &MediaFileId,
    length: u64,
    quota: u64,
) -> Result<(), ApiFailure> {
    let owner = principal.owner_id();
    let media_id = media_id.clone();
    let (used, replaced) = state
        .with_storage(move |storage| {
            let used = storage.media_copies_size(&owner)?;
            let replaced = storage
                .get_media_copy(&media_id)?
                .map_or(0, |copy| copy.size_bytes);
            Ok((used, replaced))
        })
        .await?;
    let used = used.saturating_sub(replaced);
    if used + length > quota {
        return Err(quota_exceeded(used, quota, length));
    }
    Ok(())
}

async fn create_copy_file(
    uploads: &UploadsConfig,
    path: &std::path::Path,
) -> Result<File, ApiFailure> {
    tokio::fs::create_dir_all(&uploads.dir)
        .await
        .map_err(|error| internal(format!("the uploads directory could not be made: {error}")))?;
    let file = tokio::fs::File::create(path)
        .await
        .map_err(|error| internal(format!("the copy could not be written: {error}")))?;
    Ok(file.into_std().await)
}

pub fn uploads_of(state: &AppState) -> Result<UploadsConfig, ApiFailure> {
    state.config.uploads.clone().ok_or_else(|| {
        ApiFailure::new(
            StatusCode::CONFLICT,
            "uploads_unavailable",
            "this server has no uploads directory, so it keeps no copies of media files",
        )
    })
}

pub fn content_length(headers: &HeaderMap) -> Option<u64> {
    headers
        .get(CONTENT_LENGTH)?
        .to_str()
        .ok()?
        .trim()
        .parse()
        .ok()
}

pub fn length_required() -> ApiFailure {
    ApiFailure::new(
        StatusCode::LENGTH_REQUIRED,
        "length_required",
        "an upload must say its size in a Content-Length header",
    )
}

pub fn no_stored_copy() -> ApiFailure {
    ApiFailure::new(
        StatusCode::NOT_FOUND,
        "no_stored_copy",
        "this server keeps no copy of the media file",
    )
}

pub fn quota_exceeded(used: u64, quota: u64, size: u64) -> ApiFailure {
    ApiFailure::new(
        StatusCode::PAYLOAD_TOO_LARGE,
        "quota_exceeded",
        format!(
            "the copy takes {size} bytes, and {used} of the {quota} bytes you may keep are taken"
        ),
    )
}

use axum::Extension;
use axum::body::Body;
use axum::extract::{Path, Request, State};
use axum::response::Response;
use tower_http::services::ServeFile;

use crate::auth::error_body::{ApiError, ApiFailure, internal, not_found};
use crate::auth::token_kind::TokenKind;
use crate::local_path::ensure_local_paths_allowed;
use crate::media_source::{load_media_file, local_source_path};
use crate::state::AppState;

/// Serves the bytes of a media file on the server, honoring `Range` requests so that media
/// elements can seek. A `<video>` element cannot send headers, so it passes the token as
/// the `token` query parameter.
#[utoipa::path(
    get,
    path = "/projects/{id}/media/{media_id}/stream",
    tag = "media",
    operation_id = "streamMedia",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
        ("token" = Option<String>, Query, description = "The bearer token, for clients that cannot send headers"),
    ),
    responses(
        (status = 200, description = "The whole file", content_type = "application/octet-stream"),
        (status = 206, description = "The requested byte range", content_type = "application/octet-stream"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "The token may not read local paths", body = ApiError),
        (status = 404, description = "No such media file, or the browser holds it", body = ApiError),
        (status = 416, description = "The requested range lies outside the file"),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn stream_media(
    State(state): State<AppState>,
    Extension(token): Extension<TokenKind>,
    Path((id, media_id)): Path<(String, String)>,
    request: Request,
) -> Result<Response, ApiFailure> {
    let media = load_media_file(&state, id, media_id).await?;
    let path = local_source_path(&media.source)?;
    ensure_local_paths_allowed(token, &state.config)?;
    ensure_file_exists(path).await?;
    let response = ServeFile::new(path)
        .try_call(request)
        .await
        .map_err(|error| internal(format!("could not read {path:?}: {error}")))?;
    Ok(response.map(Body::new))
}

/// Checks for the file first, so that a missing file gets the usual error body rather than
/// an empty 404.
async fn ensure_file_exists(path: &str) -> Result<(), ApiFailure> {
    match tokio::fs::metadata(path).await {
        Ok(metadata) if metadata.is_file() => Ok(()),
        _ => Err(not_found(format!("no file at {path:?}"))),
    }
}

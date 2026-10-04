//! Serves the bytes of a media file to media elements, with range requests.

use axum::Extension;
use axum::body::Body;
use axum::extract::{Path, Request, State};
use axum::http::StatusCode;
use axum::response::Response;
use easyimmerse_core::media_file::{MediaFileId, MediaFileSource};
use easyimmerse_core::project::ProjectId;
use tower::ServiceExt;
use tower_http::services::ServeFile;
use utoipa::IntoParams;

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::auth::token_kind::TokenKind;
use crate::local_path::ensure_local_file_exists;
use crate::routes::media::load_media_file;
use crate::state::AppState;

/// The matched path of the stream route, which the bearer middleware lets authenticate
/// with a `token` query parameter.
pub const STREAM_ROUTE_PATH: &str = "/projects/{id}/media/{media_id}/stream";

#[derive(Debug, serde::Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct StreamQuery {
    /// The bearer token, for media elements, which cannot send headers.
    #[allow(dead_code)]
    pub token: Option<String>,
}

/// Streams the file's bytes. Honors `Range` with 206 and 416 responses and advertises
/// `Accept-Ranges: bytes`. The content type is guessed from the file extension.
#[utoipa::path(
    get,
    path = "/projects/{id}/media/{media_id}/stream",
    tag = "media",
    operation_id = "streamMediaFile",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
        StreamQuery,
    ),
    responses(
        (status = 200, description = "The whole file", body = Vec<u8>, content_type = "application/octet-stream"),
        (status = 206, description = "The requested byte range", body = Vec<u8>, content_type = "application/octet-stream"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "The token may not read local paths", body = ApiError),
        (status = 404, description = "No such media file, no file at its path, or a source the server cannot read (code `not_resolvable`)", body = ApiError),
        (status = 416, description = "The range lies outside the file"),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn stream_media_file(
    State(state): State<AppState>,
    Extension(token): Extension<TokenKind>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
    request: Request,
) -> Result<Response, ApiFailure> {
    let media_file = load_media_file(&state, project_id, media_id).await?;
    let path = match media_file.source {
        MediaFileSource::Path { path } => path,
        MediaFileSource::BrowserFile { .. } => return Err(not_resolvable()),
    };
    ensure_local_file_exists(token, &state.config, &path).await?;
    Ok(serve_file(&path, request).await)
}

/// Lets tower-http read the file and answer the range and conditional headers of the request.
async fn serve_file(path: &str, request: Request) -> Response {
    let Ok(response) = ServeFile::new(path).oneshot(request).await;
    response.map(Body::new)
}

fn not_resolvable() -> ApiFailure {
    ApiFailure::new(
        StatusCode::NOT_FOUND,
        "not_resolvable",
        "the browser holds this file; the server cannot stream it",
    )
}

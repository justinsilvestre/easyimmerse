//! Serves the images and other files stored with dictionaries.

use axum::extract::{Path, State};
use axum::http::header::{
    CACHE_CONTROL, CONTENT_SECURITY_POLICY, CONTENT_TYPE, X_CONTENT_TYPE_OPTIONS,
};
use axum::response::{IntoResponse, Response};
use easyimmerse_storage::DictionaryId;
use serde::Deserialize;
use utoipa::IntoParams;

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::state::AppState;

/// The matched path of the media route, which the bearer middleware lets authenticate with a `token` query parameter.
pub const DICTIONARY_MEDIA_ROUTE_PATH: &str = "/dictionaries/{id}/media/{path}";

#[derive(Debug, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct DictionaryMediaQuery {
    /// The bearer token, for image elements, which cannot send headers.
    #[allow(dead_code)]
    pub token: Option<String>,
}

/// A dictionary's files never change, and may hold scripts, as SVG images can.
/// The response may be cached for good, and is sandboxed if opened as a page.
const MEDIA_HEADERS: [(axum::http::HeaderName, &str); 3] = [
    (CACHE_CONTROL, "private, max-age=31536000, immutable"),
    (
        CONTENT_SECURITY_POLICY,
        "sandbox; default-src 'none'; style-src 'unsafe-inline'",
    ),
    (X_CONTENT_TYPE_OPTIONS, "nosniff"),
];

#[utoipa::path(
    get,
    path = "/dictionaries/{id}/media/{path}",
    tag = "dictionaries",
    operation_id = "getDictionaryMedia",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The dictionary id"),
        ("path" = String, Path, description = "The file's path within the dictionary, percent-encoded as one segment, so that `/` is written `%2F`"),
        DictionaryMediaQuery,
    ),
    responses(
        (status = 200, description = "The file, with its media type", body = Vec<u8>, content_type = "application/octet-stream"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such dictionary, or no file at the path", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_dictionary_media(
    State(state): State<AppState>,
    Path((id, path)): Path<(String, String)>,
) -> Result<Response, ApiFailure> {
    let media = state
        .with_storage(move |storage| storage.get_dictionary_media(&DictionaryId(id), &path))
        .await?;
    Ok((
        [(CONTENT_TYPE, media.media_type)],
        MEDIA_HEADERS,
        media.bytes,
    )
        .into_response())
}

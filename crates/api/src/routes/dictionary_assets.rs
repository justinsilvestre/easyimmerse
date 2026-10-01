use axum::extract::{Path, Query, State};
use axum::http::HeaderValue;
use axum::http::header::{
    CACHE_CONTROL, CONTENT_SECURITY_POLICY, CONTENT_TYPE, X_CONTENT_TYPE_OPTIONS,
};
use axum::response::{IntoResponse, Response};
use easyimmerse_storage::DictionaryId;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::{IntoParams, ToSchema};

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::state::AppState;

/// A dictionary's files never change after import, since a new import gets a new id.
const IMMUTABLE: &str = "private, max-age=31536000, immutable";

/// Keeps an SVG image from running scripts or loading other resources.
/// This matters when the image is opened directly rather than through an `<img>` element.
const ASSET_POLICY: &str = "default-src 'none'; style-src 'unsafe-inline'; sandbox";

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema, IntoParams)]
#[into_params(parameter_in = Query)]
#[ts(export)]
pub struct DictionaryAssetQuery {
    /// The file's path inside the dictionary archive, as a glossary item states it.
    pub path: String,
}

/// Serves a file from the dictionary archive, such as an image that a glossary item refers to.
/// An `<img>` element cannot send headers, so it passes the token as the `token` query parameter.
#[utoipa::path(
    get,
    path = "/dictionaries/{id}/asset",
    tag = "dictionaries",
    operation_id = "getDictionaryAsset",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The dictionary id"),
        DictionaryAssetQuery,
        ("token" = Option<String>, Query, description = "The bearer token, for clients that cannot send headers"),
    ),
    responses(
        (status = 200, description = "The file, with a content type guessed from its extension", content_type = "application/octet-stream"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No dictionary has the id, or it has no file at the path", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_dictionary_asset(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Query(query): Query<DictionaryAssetQuery>,
) -> Result<Response, ApiFailure> {
    let asset = state
        .with_storage(move |storage| storage.get_dictionary_asset(&DictionaryId(id), &query.path))
        .await?;
    let content_type = HeaderValue::from_str(&asset.media_type)
        .unwrap_or(HeaderValue::from_static("application/octet-stream"));
    let headers = [
        (CONTENT_TYPE, content_type),
        (CACHE_CONTROL, HeaderValue::from_static(IMMUTABLE)),
        (
            CONTENT_SECURITY_POLICY,
            HeaderValue::from_static(ASSET_POLICY),
        ),
        (X_CONTENT_TYPE_OPTIONS, HeaderValue::from_static("nosniff")),
    ];
    Ok((headers, asset.bytes).into_response())
}

/// Serves the dictionary's stylesheet, which styles structured content through its `data-sc-*` attributes.
/// A dictionary without one gets an empty stylesheet.
#[utoipa::path(
    get,
    path = "/dictionaries/{id}/stylesheet",
    tag = "dictionaries",
    operation_id = "getDictionaryStylesheet",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The dictionary id"),
        ("token" = Option<String>, Query, description = "The bearer token, for clients that cannot send headers"),
    ),
    responses(
        (status = 200, description = "The stylesheet", body = String, content_type = "text/css"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No dictionary has the id", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_dictionary_stylesheet(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Response, ApiFailure> {
    let stylesheet = state
        .with_storage(move |storage| storage.get_dictionary_stylesheet(&DictionaryId(id)))
        .await?;
    let headers = [
        (
            CONTENT_TYPE,
            HeaderValue::from_static("text/css; charset=utf-8"),
        ),
        (CACHE_CONTROL, HeaderValue::from_static(IMMUTABLE)),
    ];
    Ok((headers, stylesheet.unwrap_or_default()).into_response())
}

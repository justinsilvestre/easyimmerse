use std::sync::Arc;

use axum::{Extension, Json};
use utoipa::openapi::OpenApi;

use crate::auth::error_body::ApiError;

/// Serves the OpenAPI document. The router attaches the document as a request extension
/// once it has been assembled.
#[utoipa::path(
    get,
    path = "/openapi.json",
    tag = "meta",
    operation_id = "getOpenApiDocument",
    security(("bearer_token" = [])),
    responses(
        (status = 200, description = "The OpenAPI document", body = Object),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_openapi_document(Extension(document): Extension<Arc<OpenApi>>) -> Json<OpenApi> {
    Json(OpenApi::clone(&document))
}

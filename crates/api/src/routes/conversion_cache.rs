//! The size of the conversion cache, and clearing it.

use axum::Json;
use axum::extract::State;
use easyimmerse_media::ConversionCacheStatus;

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::routes::media_support::{conversion_failure, require_conversion};
use crate::state::AppState;

#[utoipa::path(
    get,
    path = "/conversion-cache",
    tag = "conversions",
    operation_id = "getConversionCache",
    security(("bearer_token" = [])),
    responses(
        (status = 200, description = "The cache's usage and limits", body = ConversionCacheStatus),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 503, description = "This server does not convert media (code `conversion_unavailable`)", body = ApiError),
    ),
)]
pub async fn get_conversion_cache(
    State(state): State<AppState>,
) -> Result<Json<ConversionCacheStatus>, ApiFailure> {
    let status = require_conversion(&state)?
        .cache_status()
        .await
        .map_err(conversion_failure)?;
    Ok(Json(status))
}

/// Removes every cached conversion that is not in use right now.
#[utoipa::path(
    post,
    path = "/conversion-cache/clear",
    tag = "conversions",
    operation_id = "clearConversionCache",
    security(("bearer_token" = [])),
    responses(
        (status = 200, description = "The cache's usage and limits after clearing", body = ConversionCacheStatus),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 503, description = "This server does not convert media (code `conversion_unavailable`)", body = ApiError),
    ),
)]
pub async fn clear_conversion_cache(
    State(state): State<AppState>,
) -> Result<Json<ConversionCacheStatus>, ApiFailure> {
    let status = require_conversion(&state)?
        .clear_cache()
        .await
        .map_err(conversion_failure)?;
    Ok(Json(status))
}

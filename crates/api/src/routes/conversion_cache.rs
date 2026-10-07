//! The size of the conversion cache, its budget, and clearing it.

use axum::Json;
use axum::extract::State;
use easyimmerse_conversion::ConversionService;
use easyimmerse_media::ConversionCacheStatus;
use easyimmerse_storage::Storage;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::routes::media_support::{conversion_failure, require_conversion};
use crate::state::AppState;

/// The preference that keeps the chosen cache budget between runs: a number of bytes, or "auto".
pub const CACHE_BUDGET_PREFERENCE: &str = "conversionCacheBudgetBytes";

/// How large the conversion cache may grow. `null` lets the budget follow the disk's size.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ConversionCacheBudget {
    pub budget_bytes: Option<u64>,
}

/// Applies the budget stored in the preferences, if any, when the server starts.
pub fn restore_cache_budget(conversion: &ConversionService, storage: &Storage) {
    match storage.get_preference(CACHE_BUDGET_PREFERENCE) {
        Ok(value) => conversion.set_cache_budget(value.as_deref().and_then(parse_budget)),
        Err(error) => tracing::warn!("the conversion cache budget could not be read: {error}"),
    }
}

fn parse_budget(value: &str) -> Option<u64> {
    value.parse().ok()
}

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

/// Sets how large the cache may grow, keeps the choice for later runs, and answers with the status under it.
#[utoipa::path(
    put,
    path = "/conversion-cache/budget",
    tag = "conversions",
    operation_id = "setConversionCacheBudget",
    security(("bearer_token" = [])),
    request_body = ConversionCacheBudget,
    responses(
        (status = 200, description = "The cache's usage and limits under the new budget", body = ConversionCacheStatus),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 503, description = "This server does not convert media (code `conversion_unavailable`)", body = ApiError),
    ),
)]
pub async fn set_conversion_cache_budget(
    State(state): State<AppState>,
    Json(budget): Json<ConversionCacheBudget>,
) -> Result<Json<ConversionCacheStatus>, ApiFailure> {
    let conversion = require_conversion(&state)?.clone();
    let stored = budget
        .budget_bytes
        .map_or_else(|| "auto".to_string(), |bytes| bytes.to_string());
    state
        .with_storage(move |storage| storage.set_preference(CACHE_BUDGET_PREFERENCE, &stored))
        .await?;
    conversion.set_cache_budget(budget.budget_bytes);
    let status = conversion
        .cache_status()
        .await
        .map_err(conversion_failure)?;
    Ok(Json(status))
}

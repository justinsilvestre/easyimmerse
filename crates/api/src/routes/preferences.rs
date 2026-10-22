use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::{Extension, Json};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure, bad_request};
use crate::auth::principal::Principal;
use crate::state::AppState;

/// A preference value. `null` means the preference has not been set.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct PreferenceValue {
    pub value: Option<String>,
}

#[utoipa::path(
    get,
    path = "/preferences/{key}",
    tag = "preferences",
    operation_id = "getPreference",
    security(("bearer_token" = [])),
    params(("key" = String, Path, description = "The preference key")),
    responses(
        (status = 200, description = "The stored value, or null when unset", body = PreferenceValue),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_preference(
    State(state): State<AppState>,
    Extension(principal): Extension<Principal>,
    Path(key): Path<String>,
) -> Result<Json<PreferenceValue>, ApiFailure> {
    let owner = principal.owner_id();
    let value = state
        .with_storage(move |storage| storage.get_preference(&owner, &key))
        .await?;
    Ok(Json(PreferenceValue { value }))
}

#[utoipa::path(
    put,
    path = "/preferences/{key}",
    tag = "preferences",
    operation_id = "setPreference",
    security(("bearer_token" = [])),
    params(("key" = String, Path, description = "The preference key")),
    request_body = PreferenceValue,
    responses(
        (status = 204, description = "The value was stored"),
        (status = 400, description = "The value was null", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn set_preference(
    State(state): State<AppState>,
    Extension(principal): Extension<Principal>,
    Path(key): Path<String>,
    Json(body): Json<PreferenceValue>,
) -> Result<StatusCode, ApiFailure> {
    let value = body
        .value
        .ok_or_else(|| bad_request("a preference value must not be null"))?;
    let owner = principal.owner_id();
    state
        .with_storage(move |storage| storage.set_preference(&owner, &key, &value))
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

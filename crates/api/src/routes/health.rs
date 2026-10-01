use axum::Json;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::ApiError;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct HealthResponse {
    pub status: String,
}

/// Reports that the server is up. The only route that needs no token.
#[utoipa::path(
    get,
    path = "/health",
    tag = "health",
    operation_id = "getHealth",
    responses(
        (status = 200, description = "The server is running", body = HealthResponse),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
    })
}

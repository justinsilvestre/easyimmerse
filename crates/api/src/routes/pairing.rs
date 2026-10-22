//! Pairing another device on the local network with the server's launch token.

use std::net::SocketAddr;

use axum::extract::{ConnectInfo, State};
use axum::http::StatusCode;
use axum::{Extension, Json};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::auth::principal::Principal;
use crate::now_ms::now_ms;
use crate::pairing_codes::{PairingError, generate_pairing_code};
use crate::state::AppState;

/// A pairing code that another device can exchange for the launch token once.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct PairingCode {
    /// Six decimal digits.
    pub code: String,
    /// When the code stops being valid, in milliseconds since the Unix epoch.
    pub expires_at: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct PairingClaim {
    pub code: String,
}

/// The token to present as `Authorization: Bearer <token>` from now on.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct PairingGrant {
    pub token: String,
}

/// Issues a pairing code valid for ten minutes, replacing any earlier one.
/// Only the launch token may do so, and only on a server without accounts.
#[utoipa::path(
    post,
    path = "/pairing/code",
    tag = "pairing",
    operation_id = "issuePairingCode",
    security(("bearer_token" = [])),
    responses(
        (status = 200, description = "The new pairing code", body = PairingCode),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 409, description = "`pairing_needs_launch_token`: the server has accounts, or the token is an account's", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn issue_pairing_code(
    State(state): State<AppState>,
    Extension(principal): Extension<Principal>,
) -> Result<Json<PairingCode>, ApiFailure> {
    if principal != Principal::Launch || state.config.accounts.is_some() {
        return Err(needs_launch_token());
    }
    let issued = state.pairing_codes.issue(generate_pairing_code(), now_ms());
    Ok(Json(PairingCode {
        code: issued.code,
        expires_at: issued.expires_at_ms,
    }))
}

/// Exchanges the active pairing code for the launch token. Needs no token.
#[utoipa::path(
    post,
    path = "/pairing/claim",
    tag = "pairing",
    operation_id = "claimPairingCode",
    request_body = PairingClaim,
    responses(
        (status = 200, description = "The code was used up", body = PairingGrant),
        (status = 404, description = "`pairing_code_invalid`: the code is wrong, used up or expired", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 429, description = "`too_many_attempts`: ten failed claims from this peer within fifteen minutes", body = ApiError,
            headers(("Retry-After" = u64, description = "The seconds to wait before trying again"))),
    ),
)]
pub async fn claim_pairing_code(
    State(state): State<AppState>,
    peer: Option<Extension<ConnectInfo<SocketAddr>>>,
    Json(claim): Json<PairingClaim>,
) -> Result<Json<PairingGrant>, ApiFailure> {
    let peer = peer.map(|Extension(ConnectInfo(address))| address.ip());
    let token = state.config.launch_token.clone();
    let Some(token) = token.filter(|_| state.config.accounts.is_none()) else {
        return Err(PairingError::InvalidCode.into());
    };
    state.pairing_codes.claim(&claim.code, peer, now_ms())?;
    Ok(Json(PairingGrant { token }))
}

fn needs_launch_token() -> ApiFailure {
    ApiFailure::new(
        StatusCode::CONFLICT,
        "pairing_needs_launch_token",
        "pairing codes exist only on a server without accounts, and only the launch token may issue them",
    )
}

impl From<PairingError> for ApiFailure {
    fn from(error: PairingError) -> Self {
        let message = error.to_string();
        match error {
            PairingError::InvalidCode => {
                ApiFailure::new(StatusCode::NOT_FOUND, "pairing_code_invalid", message)
            }
            PairingError::TooManyAttempts { retry_after_secs } => {
                ApiFailure::new(StatusCode::TOO_MANY_REQUESTS, "too_many_attempts", message)
                    .with_retry_after(retry_after_secs)
            }
        }
    }
}

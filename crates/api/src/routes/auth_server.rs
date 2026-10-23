use axum::Json;
use axum::extract::State;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::ApiError;
use crate::state::AppState;

/// What a server offers to clients that want to log in.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ServerAuthInfo {
    /// Whether the server has accounts that a client can log in to.
    pub accounts: bool,
    /// Whether anyone may create an account on the server.
    pub open_signup: bool,
    /// Whether the server sends email, so that accounts can confirm their address and reset a forgotten password.
    pub sends_email: bool,
    /// The name of the desktop app's computer, which paired devices show. Absent for every other server.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub device_name: Option<String>,
}

/// Tells whether the server has accounts, whether sign-up is open, whether it sends email, and the desktop app's device name. Needs no token.
#[utoipa::path(
    get,
    path = "/auth/server",
    tag = "auth",
    operation_id = "getServerAuthInfo",
    responses(
        (status = 200, description = "What the server offers", body = ServerAuthInfo),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_server_auth_info(State(state): State<AppState>) -> Json<ServerAuthInfo> {
    let accounts = state.config.accounts.as_ref();
    Json(ServerAuthInfo {
        accounts: accounts.is_some(),
        open_signup: accounts.is_some_and(|accounts| accounts.open_signup),
        sends_email: state.mail.is_some(),
        device_name: state.config.device_name.clone(),
    })
}

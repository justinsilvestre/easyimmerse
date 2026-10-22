use std::net::SocketAddr;

use axum::extract::{ConnectInfo, State};
use axum::http::{HeaderMap, StatusCode};
use axum::{Extension, Json};
use easyimmerse_storage::Storage;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::account_mail::send_password_reset_mail;
use crate::accounts::{AccountsError, ensure_credentials_bounded, reset_password};
use crate::auth::error_body::{ApiError, ApiFailure, mail_unavailable};
use crate::now_ms::now_ms;
use crate::routes::sessions::{
    SessionCreated, ensure_accounts_enabled, open_session, peer_address, user_agent_of,
};
use crate::state::AppState;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct PasswordResetRequest {
    pub email: String,
}

/// A new password, chosen through the link mailed for a reset.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct NewPasswordRequest {
    /// The token that the mailed link carries.
    pub token: String,
    /// At least eight characters.
    pub password: String,
}

/// Mails a link to choose a new password to the account with the email address. Needs no token.
/// The answer is the same whether or not an account has the address, so that it reveals none.
#[utoipa::path(
    post,
    path = "/auth/password-reset",
    tag = "auth",
    operation_id = "requestPasswordReset",
    request_body = PasswordResetRequest,
    responses(
        (status = 202, description = "If an account has the address, a mail is on its way to it"),
        (status = 400, description = "`invalid_email`: the email address is longer than 254 characters", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 429, description = "`too_many_attempts`: too many login or reset attempts at this email address from this peer, from this peer, or at this email address within fifteen minutes", body = ApiError,
            headers(("Retry-After" = u64, description = "The seconds to wait before trying again"))),
        (status = 503, description = "`mail_unavailable`: the server does not send email", body = ApiError),
    ),
)]
pub async fn request_password_reset(
    State(state): State<AppState>,
    peer: Option<Extension<ConnectInfo<SocketAddr>>>,
    Json(request): Json<PasswordResetRequest>,
) -> Result<StatusCode, ApiFailure> {
    if state.mail.is_none() {
        return Err(mail_unavailable());
    }
    ensure_credentials_bounded(&request.email, "")?;
    let peer = peer_address(peer);
    state
        .login_throttle
        .begin_attempt(&request.email, peer, now_ms())?;
    send_password_reset_mail(&state, request.email);
    Ok(StatusCode::ACCEPTED)
}

/// Gives an account a new password with the token of the link mailed for a reset, and logs it in on this device.
/// Every other session of the account ends. Needs no token.
#[utoipa::path(
    post,
    path = "/auth/password",
    tag = "auth",
    operation_id = "chooseNewPassword",
    request_body = NewPasswordRequest,
    responses(
        (status = 200, description = "The password was changed and the account logged in", body = SessionCreated),
        (status = 400, description = "`invalid_link`: the token is unknown, used or expired, or `password_too_short` or `password_too_long`", body = ApiError),
        (status = 403, description = "`accounts_disabled`: the server has no accounts", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn choose_new_password(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<NewPasswordRequest>,
) -> Result<Json<SessionCreated>, ApiFailure> {
    ensure_accounts_enabled(&state.config)?;
    let user_agent = user_agent_of(&headers);
    let session = state
        .with_accounts(move |storage| reset_and_open_session(storage, &request, &user_agent))
        .await?;
    Ok(Json(session))
}

fn reset_and_open_session(
    storage: &Storage,
    request: &NewPasswordRequest,
    user_agent: &str,
) -> Result<SessionCreated, AccountsError> {
    let user_id = reset_password(storage, &request.token, &request.password, now_ms())?;
    let user = storage.get_user(&user_id)?;
    open_session(storage, user, user_agent)
}

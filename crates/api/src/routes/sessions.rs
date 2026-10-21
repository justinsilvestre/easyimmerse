use std::net::{IpAddr, SocketAddr};

use axum::extract::{ConnectInfo, State};
use axum::http::{HeaderMap, StatusCode};
use axum::{Extension, Json};
use easyimmerse_core::account::{AccountRole, AccountUser};
use easyimmerse_storage::Storage;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::accounts::{
    AccountsError, authenticate, create_account, end_session, ensure_credentials_bounded,
    start_session,
};
use crate::auth::bearer_token::header_token;
use crate::auth::error_body::{ApiError, ApiFailure};
use crate::auth::principal::Principal;
use crate::config::ApiConfig;
use crate::now_ms::now_ms;
use crate::state::AppState;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct SignupRequest {
    pub email: String,
    /// At least eight characters.
    pub password: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

/// A new session: the token to present as `Authorization: Bearer <token>`, and its account.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct SessionCreated {
    pub token: String,
    pub user: AccountUser,
}

/// Creates an account with the `library_user` role and logs it in. Needs no token.
#[utoipa::path(
    post,
    path = "/auth/signup",
    tag = "auth",
    operation_id = "signUp",
    request_body = SignupRequest,
    responses(
        (status = 201, description = "The account was created and logged in", body = SessionCreated),
        (status = 400, description = "`invalid_email`, `password_too_short` or `password_too_long`", body = ApiError),
        (status = 403, description = "`signup_closed`: the server has no accounts or does not let anyone sign up", body = ApiError),
        (status = 409, description = "`email_taken`: an account already has this email address", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 429, description = "`too_many_attempts`: too many login attempts at this email address from this peer, from this peer, or at this email address within fifteen minutes", body = ApiError,
            headers(("Retry-After" = u64, description = "The seconds to wait before trying again"))),
    ),
)]
pub async fn sign_up(
    State(state): State<AppState>,
    peer: Option<Extension<ConnectInfo<SocketAddr>>>,
    Json(request): Json<SignupRequest>,
) -> Result<(StatusCode, Json<SessionCreated>), ApiFailure> {
    ensure_signup_open(&state.config)?;
    ensure_credentials_bounded(&request.email, &request.password)?;
    let peer = peer_address(peer);
    state
        .login_throttle
        .ensure_allowed(&request.email, peer, now_ms())?;
    let session = state
        .with_accounts(move |storage| {
            let role = AccountRole::LibraryUser;
            let user = create_account(storage, &request.email, &request.password, role)?;
            open_session(storage, user)
        })
        .await?;
    Ok((StatusCode::CREATED, Json(session)))
}

/// Logs in to an account. Needs no token.
#[utoipa::path(
    post,
    path = "/auth/login",
    tag = "auth",
    operation_id = "logIn",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "The account was logged in", body = SessionCreated),
        (status = 400, description = "`invalid_email`: the email address is longer than 254 characters, or `password_too_long`: the password is longer than 1024 bytes", body = ApiError),
        (status = 401, description = "`invalid_credentials`: no account has this email address and password", body = ApiError),
        (status = 403, description = "`accounts_disabled`: the server has no accounts", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 429, description = "`too_many_attempts`: too many login attempts at this email address from this peer, from this peer, or at this email address within fifteen minutes", body = ApiError,
            headers(("Retry-After" = u64, description = "The seconds to wait before trying again"))),
    ),
)]
pub async fn log_in(
    State(state): State<AppState>,
    peer: Option<Extension<ConnectInfo<SocketAddr>>>,
    Json(request): Json<LoginRequest>,
) -> Result<Json<SessionCreated>, ApiFailure> {
    ensure_accounts_enabled(&state.config)?;
    ensure_credentials_bounded(&request.email, &request.password)?;
    let throttle = &state.login_throttle;
    let attempt = throttle.begin_attempt(&request.email, peer_address(peer), now_ms())?;
    let session = state
        .with_accounts(move |storage| log_in_and_open_session(storage, &request))
        .await?;
    throttle.succeeded(&attempt);
    Ok(Json(session))
}

/// Ends the session that authenticated the request. With the launch token it does nothing.
#[utoipa::path(
    post,
    path = "/auth/logout",
    tag = "auth",
    operation_id = "logOut",
    security(("bearer_token" = [])),
    responses(
        (status = 204, description = "The session was ended"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn log_out(
    State(state): State<AppState>,
    Extension(principal): Extension<Principal>,
    headers: HeaderMap,
) -> Result<StatusCode, ApiFailure> {
    if let (Principal::Account { .. }, Some(token)) = (&principal, header_token(&headers)) {
        let token = token.to_string();
        state
            .with_storage(move |storage| end_session(storage, &token))
            .await?;
    }
    Ok(StatusCode::NO_CONTENT)
}

fn log_in_and_open_session(
    storage: &Storage,
    request: &LoginRequest,
) -> Result<SessionCreated, AccountsError> {
    let user = authenticate(storage, &request.email, &request.password)?;
    open_session(storage, user)
}

fn peer_address(peer: Option<Extension<ConnectInfo<SocketAddr>>>) -> Option<IpAddr> {
    peer.map(|Extension(ConnectInfo(address))| address.ip())
}

fn open_session(storage: &Storage, user: AccountUser) -> Result<SessionCreated, AccountsError> {
    let token = start_session(storage, &user.id, now_ms())?;
    Ok(SessionCreated { token, user })
}

fn ensure_signup_open(config: &ApiConfig) -> Result<(), ApiFailure> {
    if config
        .accounts
        .as_ref()
        .is_some_and(|accounts| accounts.open_signup)
    {
        Ok(())
    } else {
        Err(ApiFailure::new(
            StatusCode::FORBIDDEN,
            "signup_closed",
            "this server does not let anyone create an account",
        ))
    }
}

fn ensure_accounts_enabled(config: &ApiConfig) -> Result<(), ApiFailure> {
    if config.accounts.is_some() {
        Ok(())
    } else {
        Err(ApiFailure::new(
            StatusCode::FORBIDDEN,
            "accounts_disabled",
            "this server has no accounts",
        ))
    }
}

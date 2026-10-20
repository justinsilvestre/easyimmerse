use axum::Json;
use axum::http::StatusCode;
use easyimmerse_core::account::AccountUser;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure, not_implemented};

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
        (status = 400, description = "`invalid_email` or `password_too_short`", body = ApiError),
        (status = 403, description = "`signup_closed`: the server has no accounts or does not let anyone sign up", body = ApiError),
        (status = 409, description = "`email_taken`: an account already has this email address", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn sign_up(
    Json(_request): Json<SignupRequest>,
) -> Result<(StatusCode, Json<SessionCreated>), ApiFailure> {
    Err(not_implemented())
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
        (status = 401, description = "`invalid_credentials`: no account has this email address and password", body = ApiError),
        (status = 403, description = "`accounts_disabled`: the server has no accounts", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn log_in(
    Json(_request): Json<LoginRequest>,
) -> Result<Json<SessionCreated>, ApiFailure> {
    Err(not_implemented())
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
pub async fn log_out() -> Result<StatusCode, ApiFailure> {
    Err(not_implemented())
}

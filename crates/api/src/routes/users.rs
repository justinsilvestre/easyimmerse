//! Account management. Only the launch token and administrators may use these routes.

use axum::Json;
use axum::extract::Path;
use axum::http::StatusCode;
use easyimmerse_core::account::{AccountRole, AccountUser};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure, not_implemented};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct CreateUserRequest {
    pub email: String,
    /// At least eight characters.
    pub password: String,
    pub role: AccountRole,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct SetUserRoleRequest {
    pub role: AccountRole,
}

/// Lists every account, oldest first.
#[utoipa::path(
    get,
    path = "/users",
    tag = "users",
    operation_id = "listUsers",
    security(("bearer_token" = [])),
    responses(
        (status = 200, description = "Every account", body = Vec<AccountUser>),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`forbidden`: the token is not an administrator's", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn list_users() -> Result<Json<Vec<AccountUser>>, ApiFailure> {
    Err(not_implemented())
}

/// Creates an account with the given role.
#[utoipa::path(
    post,
    path = "/users",
    tag = "users",
    operation_id = "createUser",
    security(("bearer_token" = [])),
    request_body = CreateUserRequest,
    responses(
        (status = 201, description = "The account was created", body = AccountUser),
        (status = 400, description = "`invalid_email` or `password_too_short`", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`forbidden`: the token is not an administrator's", body = ApiError),
        (status = 409, description = "`email_taken`: an account already has this email address", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn create_user(
    Json(_request): Json<CreateUserRequest>,
) -> Result<(StatusCode, Json<AccountUser>), ApiFailure> {
    Err(not_implemented())
}

/// Changes an account's role.
#[utoipa::path(
    put,
    path = "/users/{id}/role",
    tag = "users",
    operation_id = "setUserRole",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The account id")),
    request_body = SetUserRoleRequest,
    responses(
        (status = 200, description = "The account with its new role", body = AccountUser),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`forbidden`: the token is not an administrator's", body = ApiError),
        (status = 404, description = "No account has this id", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn set_user_role(
    Path(_id): Path<String>,
    Json(_request): Json<SetUserRoleRequest>,
) -> Result<Json<AccountUser>, ApiFailure> {
    Err(not_implemented())
}

/// Deletes an account together with its sessions.
#[utoipa::path(
    delete,
    path = "/users/{id}",
    tag = "users",
    operation_id = "deleteUser",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The account id")),
    responses(
        (status = 204, description = "The account was deleted"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`forbidden`: the token is not an administrator's", body = ApiError),
        (status = 404, description = "No account has this id", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn delete_user(Path(_id): Path<String>) -> Result<StatusCode, ApiFailure> {
    Err(not_implemented())
}

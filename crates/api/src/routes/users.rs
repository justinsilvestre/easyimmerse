//! Account management. Only the launch token and administrators may use these routes.

use axum::Json;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use easyimmerse_core::account::{AccountRole, AccountUser, SetLibraryManager, UsersPage};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::{IntoParams, ToSchema};

use crate::accounts::create_account;
use crate::auth::administrator::Administrator;
use crate::auth::error_body::{ApiError, ApiFailure};
use crate::state::AppState;

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

/// How many accounts a page holds when the request does not say.
const DEFAULT_PAGE_SIZE: u64 = 50;
/// The most accounts a page may hold.
const MAX_PAGE_SIZE: u64 = 200;

#[derive(Debug, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct ListUsersQuery {
    /// Text that the email addresses of the listed accounts contain, in any letter case. Every account matches when it is missing or blank.
    pub search: Option<String>,
    /// How many of the matching accounts to skip. Zero when missing.
    pub offset: Option<u64>,
    /// How many accounts the page holds at most: 50 when missing, and never more than 200.
    pub limit: Option<u64>,
}

/// Lists a page of the accounts whose email address contains a search, oldest first.
#[utoipa::path(
    get,
    path = "/users",
    tag = "users",
    operation_id = "listUsers",
    security(("bearer_token" = [])),
    params(ListUsersQuery),
    responses(
        (status = 200, description = "A page of the matching accounts and how many match in all", body = UsersPage),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`forbidden`: the token is not an administrator's", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn list_users(
    _: Administrator,
    State(state): State<AppState>,
    Query(query): Query<ListUsersQuery>,
) -> Result<Json<UsersPage>, ApiFailure> {
    let search = query.search.unwrap_or_default().trim().to_string();
    let offset = query.offset.unwrap_or(0);
    let limit = page_size(query.limit);
    let page = state
        .with_storage(move |storage| storage.list_users_page(&search, offset, limit))
        .await?;
    Ok(Json(page))
}

fn page_size(limit: Option<u64>) -> u64 {
    limit.unwrap_or(DEFAULT_PAGE_SIZE).clamp(1, MAX_PAGE_SIZE)
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
        (status = 400, description = "`invalid_email`, `password_too_short` or `password_too_long`", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`forbidden`: the token is not an administrator's", body = ApiError),
        (status = 409, description = "`email_taken`: an account already has this email address", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn create_user(
    _: Administrator,
    State(state): State<AppState>,
    Json(request): Json<CreateUserRequest>,
) -> Result<(StatusCode, Json<AccountUser>), ApiFailure> {
    let user = state
        .with_accounts(move |storage| {
            create_account(storage, &request.email, &request.password, request.role)
        })
        .await?;
    Ok((StatusCode::CREATED, Json(user)))
}

/// Changes an account's role. The last administrator account keeps its role.
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
        (status = 409, description = "`last_administrator`: the change would leave the server without an administrator account", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn set_user_role(
    _: Administrator,
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(request): Json<SetUserRoleRequest>,
) -> Result<Json<AccountUser>, ApiFailure> {
    let user = state
        .with_storage(move |storage| storage.set_user_role(&id, request.role))
        .await?;
    Ok(Json(user))
}

/// Lets an account manage the server's library, or stops it. Administrators manage it whatever this says.
#[utoipa::path(
    put,
    path = "/users/{user_id}/library-manager",
    tag = "users",
    operation_id = "setLibraryManager",
    security(("bearer_token" = [])),
    params(("user_id" = String, Path, description = "The account id")),
    request_body = SetLibraryManager,
    responses(
        (status = 200, description = "The account with its new permission", body = AccountUser),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`forbidden`: the token is not an administrator's", body = ApiError),
        (status = 404, description = "No account has this id", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn set_library_manager(
    _: Administrator,
    State(state): State<AppState>,
    Path(user_id): Path<String>,
    Json(request): Json<SetLibraryManager>,
) -> Result<Json<AccountUser>, ApiFailure> {
    let user = state
        .with_storage(move |storage| storage.set_library_manager(&user_id, request.manages_library))
        .await?;
    Ok(Json(user))
}

/// Deletes an account together with its sessions. The last administrator account cannot be deleted.
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
        (status = 409, description = "`last_administrator`: the change would leave the server without an administrator account", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn delete_user(
    _: Administrator,
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<StatusCode, ApiFailure> {
    state
        .with_storage(move |storage| storage.delete_user(&id))
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_page_holds_fifty_accounts_when_the_request_does_not_say() {
        assert_eq!(page_size(None), 50);
    }

    #[test]
    fn a_page_holds_at_most_two_hundred_accounts() {
        assert_eq!(page_size(Some(10_000)), 200);
    }

    #[test]
    fn a_page_holds_at_least_one_account() {
        assert_eq!(page_size(Some(0)), 1);
    }
}

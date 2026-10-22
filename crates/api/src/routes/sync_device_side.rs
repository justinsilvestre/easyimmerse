//! The device side of syncing: a built-in server links its own data to an account on a remote and reports how syncing goes.

use std::sync::Arc;

use axum::extract::rejection::QueryRejection;
use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::{Extension, Json};
use easyimmerse_core::sync::{LinkRemoteRequest, SyncStatus};
use easyimmerse_storage::{OwnerId, RemoteKind};
use serde::Deserialize;
use utoipa::IntoParams;

use crate::auth::error_body::{ApiError, ApiFailure, internal};
use crate::auth::principal::Principal;
use crate::routes::auth_server::ServerAuthInfo;
use crate::state::AppState;
use crate::sync::SyncEngine;
use crate::sync::failures::{
    checked_server_url, invalid_server_url, not_linked, remote_failure, require_launch,
};
use crate::sync::remote_client::RemoteClient;
use crate::sync::status::account_status;

/// Reports the link of the device's own data and how syncing with it goes. An account gets no link.
#[utoipa::path(
    get,
    path = "/sync/status",
    tag = "sync",
    operation_id = "getSyncStatus",
    security(("bearer_token" = [])),
    responses(
        (status = 200, description = "The link and its state", body = SyncStatus),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_sync_status(
    State(state): State<AppState>,
    Extension(principal): Extension<Principal>,
) -> Result<Json<SyncStatus>, ApiFailure> {
    if !matches!(principal, Principal::Launch) {
        return Ok(Json(account_status()));
    }
    let status = with_engine(&state, |engine| engine.status().map_err(ApiFailure::from)).await?;
    Ok(Json(status))
}

#[derive(Debug, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct RemoteAuthInfoQuery {
    /// The remote's address, such as `https://cloud.example.com`.
    pub server_url: String,
}

/// Asks a remote what it offers to clients that want to log in, on behalf of the app, which may not reach it directly.
#[utoipa::path(
    get,
    path = "/sync/remote-auth-info",
    tag = "sync",
    operation_id = "getRemoteAuthInfo",
    security(("bearer_token" = [])),
    params(RemoteAuthInfoQuery),
    responses(
        (status = 200, description = "What the remote offers", body = ServerAuthInfo),
        (status = 400, description = "`invalid_server_url`", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`forbidden`: only the launch token may link", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 502, description = "`remote_unreachable` or `remote_failed`", body = ApiError),
    ),
)]
pub async fn get_remote_auth_info(
    Extension(principal): Extension<Principal>,
    query: Result<Query<RemoteAuthInfoQuery>, QueryRejection>,
) -> Result<Json<ServerAuthInfo>, ApiFailure> {
    require_launch(&principal)?;
    let Query(query) = query.map_err(|_| invalid_server_url("the server address is missing"))?;
    let server_url = checked_server_url(&query.server_url)?;
    let info =
        tokio::task::spawn_blocking(move || RemoteClient::new(&server_url, None).auth_info())
            .await
            .map_err(|error| internal(format!("the request task failed: {error}")))?
            .map_err(remote_failure)?;
    Ok(Json(info))
}

/// Logs in to an account on a remote, or signs up there, and keeps a copy of the device's own data on it from now on.
/// A logged-out link to the same account resumes where it stopped; a link to another account starts over.
#[utoipa::path(
    post,
    path = "/sync/link",
    tag = "sync",
    operation_id = "linkSyncRemote",
    security(("bearer_token" = [])),
    request_body = LinkRemoteRequest,
    responses(
        (status = 200, description = "Linked; the first round has started", body = SyncStatus),
        (status = 400, description = "`invalid_server_url`, or the remote's own 400 such as `invalid_email`", body = ApiError),
        (status = 401, description = "Missing or invalid token, or the remote's `invalid_credentials`", body = ApiError),
        (status = 403, description = "`forbidden` for an account, or the remote's 403 such as `signup_closed` or `accounts_disabled`", body = ApiError),
        (status = 409, description = "`already_linked`, or the remote's 409 such as `email_taken`", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 429, description = "The remote's `too_many_attempts`, with its Retry-After", body = ApiError),
        (status = 502, description = "`remote_unreachable` or `remote_failed`", body = ApiError),
    ),
)]
pub async fn link_sync_remote(
    State(state): State<AppState>,
    Extension(principal): Extension<Principal>,
    Json(request): Json<LinkRemoteRequest>,
) -> Result<Json<SyncStatus>, ApiFailure> {
    require_launch(&principal)?;
    let status = with_engine(&state, move |engine| {
        engine.link(&request)?;
        engine.status().map_err(ApiFailure::from)
    })
    .await?;
    Ok(Json(status))
}

/// Logs out of the linked remote and stops syncing with it. The device's own data stays as it is.
#[utoipa::path(
    delete,
    path = "/sync/link",
    tag = "sync",
    operation_id = "unlinkSyncRemote",
    security(("bearer_token" = [])),
    responses(
        (status = 204, description = "Unlinked"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`forbidden`: only the launch token may unlink", body = ApiError),
        (status = 404, description = "`not_linked`", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn unlink_sync_remote(
    State(state): State<AppState>,
    Extension(principal): Extension<Principal>,
) -> Result<StatusCode, ApiFailure> {
    require_launch(&principal)?;
    with_engine(&state, |engine| engine.unlink()).await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Starts a round of syncing now rather than when the next one is due.
#[utoipa::path(
    post,
    path = "/sync/run",
    tag = "sync",
    operation_id = "runSync",
    security(("bearer_token" = [])),
    responses(
        (status = 202, description = "A round will start shortly"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`forbidden`: only the launch token may sync", body = ApiError),
        (status = 404, description = "`not_linked`", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn run_sync(
    State(state): State<AppState>,
    Extension(principal): Extension<Principal>,
) -> Result<StatusCode, ApiFailure> {
    require_launch(&principal)?;
    state
        .with_storage(|storage| storage.get_sync_remote(&OwnerId::launch(), RemoteKind::Account))
        .await?
        .ok_or_else(not_linked)?;
    state.sync.request_round();
    Ok(StatusCode::ACCEPTED)
}

/// Forgets the conflicts of the link, once the person has read of them.
#[utoipa::path(
    delete,
    path = "/sync/conflicts",
    tag = "sync",
    operation_id = "dismissSyncConflicts",
    security(("bearer_token" = [])),
    responses(
        (status = 204, description = "The conflicts were forgotten"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`forbidden`: only the launch token may sync", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn dismiss_sync_conflicts(
    State(state): State<AppState>,
    Extension(principal): Extension<Principal>,
) -> Result<StatusCode, ApiFailure> {
    require_launch(&principal)?;
    state
        .with_storage(|storage| {
            match storage.get_sync_remote(&OwnerId::launch(), RemoteKind::Account)? {
                Some(remote) => storage.clear_sync_conflicts(&remote.id),
                None => Ok(()),
            }
        })
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Runs blocking engine work, which talks to the remote and the database, on the blocking thread pool.
async fn with_engine<T: Send + 'static>(
    state: &AppState,
    operation: impl FnOnce(&SyncEngine) -> Result<T, ApiFailure> + Send + 'static,
) -> Result<T, ApiFailure> {
    let engine = Arc::clone(&state.sync);
    tokio::task::spawn_blocking(move || operation(&engine))
        .await
        .map_err(|error| internal(format!("the sync task failed: {error}")))?
}

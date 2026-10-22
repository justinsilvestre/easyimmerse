use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use easyimmerse_storage::StoredSession;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::account_principal::AccountPrincipal;
use crate::auth::error_body::{ApiError, ApiFailure};
use crate::state::AppState;

/// A device that the account is logged in on.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct SessionSummary {
    pub id: String,
    /// When the device logged in, in milliseconds since the Unix epoch.
    pub created_at_ms: u64,
    /// When the device last sent a request, in milliseconds since the Unix epoch, to within an hour.
    pub last_used_at_ms: u64,
    /// The User-Agent header that the device sent when it logged in, which may be empty.
    pub user_agent: String,
    /// Whether this is the session that asked for the list.
    pub is_current: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct SessionList {
    /// Most recently used first.
    pub sessions: Vec<SessionSummary>,
}

/// Lists the devices that the account is logged in on.
#[utoipa::path(
    get,
    path = "/auth/sessions",
    tag = "auth",
    operation_id = "listSessions",
    security(("bearer_token" = [])),
    responses(
        (status = 200, description = "The account's sessions", body = SessionList),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`not_an_account`: the launch token belongs to no account", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn list_sessions(
    State(state): State<AppState>,
    account: AccountPrincipal,
) -> Result<Json<SessionList>, ApiFailure> {
    let user_id = account.user_id.clone();
    let stored = state
        .with_storage(move |storage| storage.list_sessions(&user_id))
        .await?;
    let sessions = stored
        .into_iter()
        .map(|session| summary_of(session, &account.session_id))
        .collect();
    Ok(Json(SessionList { sessions }))
}

/// Logs the account out on one of its devices. Deleting the current session logs out like `/auth/logout`.
#[utoipa::path(
    delete,
    path = "/auth/sessions/{id}",
    tag = "auth",
    operation_id = "deleteSession",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The session's id")),
    responses(
        (status = 204, description = "The session was ended"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`not_an_account`: the launch token belongs to no account", body = ApiError),
        (status = 404, description = "`not_found`: the account has no session with this id", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn delete_session(
    State(state): State<AppState>,
    account: AccountPrincipal,
    Path(id): Path<String>,
) -> Result<StatusCode, ApiFailure> {
    state
        .with_storage(move |storage| storage.delete_session_by_id(&account.user_id, &id))
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

fn summary_of(session: StoredSession, current_session_id: &str) -> SessionSummary {
    SessionSummary {
        is_current: session.id == current_session_id,
        id: session.id,
        created_at_ms: session.created_at_ms,
        last_used_at_ms: session.last_used_at_ms,
        user_agent: session.user_agent,
    }
}

//! The remote side of syncing: a device pulls the owner's changes from this server and pushes its own.

use axum::Json;
use axum::body::{Body, to_bytes};
use axum::extract::rejection::QueryRejection;
use axum::extract::{Query, State};
use axum::http::StatusCode;
use easyimmerse_core::sync::{
    PushOutcome, PushOutcomeKind, PushedRow, SyncChangesPage, SyncPushBatch, SyncPushOutcomes,
    SyncRow, SyncTable,
};
use easyimmerse_storage::{PushVerdict, PushedChange, SyncChange};
use serde::Deserialize;
use serde_json::Value;
use utoipa::IntoParams;

use crate::auth::error_body::{ApiError, ApiFailure, bad_request};
use crate::auth::owner::Owner;
use crate::now_ms::now_ms;
use crate::state::AppState;

const DEFAULT_PAGE_ROWS: u32 = 500;
const MAX_PAGE_ROWS: u32 = 2_000;
/// The most rows one push may hold.
pub const MAX_PUSHED_ROWS: usize = 500;
const MAX_PUSH_BODY_BYTES: usize = 16 * 1024 * 1024;

#[derive(Debug, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct SyncChangesQuery {
    /// The `next_cursor` of the previous page; 0 or absent for the first page.
    pub since: Option<u64>,
    /// The most rows to return: 500 when absent, at most 2,000.
    pub limit: Option<u32>,
}

/// Lists the principal's changes after a cursor, oldest first, each with the row's data or as a tombstone.
#[utoipa::path(
    get,
    path = "/sync/changes",
    tag = "sync",
    operation_id = "listSyncChanges",
    security(("bearer_token" = [])),
    params(SyncChangesQuery),
    responses(
        (status = 200, description = "One page of the principal's changes", body = SyncChangesPage),
        (status = 400, description = "The cursor or the limit is not a number, or the limit is 0 or above 2,000", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn list_sync_changes(
    State(state): State<AppState>,
    Owner(owner): Owner,
    query: Result<Query<SyncChangesQuery>, QueryRejection>,
) -> Result<Json<SyncChangesPage>, ApiFailure> {
    let Query(query) = query.map_err(|rejection| bad_query(rejection.body_text()))?;
    let limit = query.limit.unwrap_or(DEFAULT_PAGE_ROWS);
    if limit == 0 || limit > MAX_PAGE_ROWS {
        return Err(bad_query(format!(
            "the limit must lie between 1 and {MAX_PAGE_ROWS}"
        )));
    }
    let since = query.since.unwrap_or(0);
    let page = state
        .with_storage(move |storage| storage.changes_since(&owner, since, limit))
        .await?;
    Ok(Json(SyncChangesPage {
        rows: page.changes.into_iter().map(sync_row_of).collect(),
        next_cursor: page.next_cursor,
        has_more: page.has_more,
    }))
}

/// Applies a device's changed rows as the principal's, and answers each in the order sent.
/// Of two changes made to a row at once, the one with the later `updated_at_ms` is kept;
/// a time more than a minute ahead of the server's clock counts as the server's time.
#[utoipa::path(
    post,
    path = "/sync/changes",
    tag = "sync",
    operation_id = "pushSyncChanges",
    security(("bearer_token" = [])),
    request_body = SyncPushBatch,
    responses(
        (status = 200, description = "What the server did with each row", body = SyncPushOutcomes),
        (status = 400, description = "More than 500 rows, a table that does not sync, or a malformed body", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 413, description = "The body is larger than 16 MiB", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn push_sync_changes(
    State(state): State<AppState>,
    Owner(owner): Owner,
    body: Body,
) -> Result<Json<SyncPushOutcomes>, ApiFailure> {
    let batch = read_push_batch(body).await?;
    let keys: Vec<(SyncTable, String)> = batch
        .rows
        .iter()
        .map(|pushed| (pushed.row.table, pushed.row.key.clone()))
        .collect();
    let changes: Vec<PushedChange> = batch.rows.into_iter().map(pushed_change_of).collect();
    let verdicts = state
        .with_storage(move |storage| storage.apply_pushed_batch(&owner, &changes, now_ms()))
        .await?;
    let outcomes = keys
        .into_iter()
        .zip(verdicts)
        .map(|((table, key), verdict)| outcome_of(table, key, verdict))
        .collect();
    Ok(Json(SyncPushOutcomes { outcomes }))
}

/// Reads the body of a push, checking its size, its number of rows and its tables before the rows themselves.
async fn read_push_batch(body: Body) -> Result<SyncPushBatch, ApiFailure> {
    let bytes = to_bytes(body, MAX_PUSH_BODY_BYTES).await.map_err(|_| {
        ApiFailure::new(
            StatusCode::PAYLOAD_TOO_LARGE,
            "payload_too_large",
            "a push may hold at most 16 MiB",
        )
    })?;
    let value: Value = serde_json::from_slice(&bytes)
        .map_err(|error| bad_request(format!("the body is not JSON: {error}")))?;
    let rows = value["rows"].as_array().map_or(&[][..], Vec::as_slice);
    if rows.len() > MAX_PUSHED_ROWS {
        return Err(ApiFailure::new(
            StatusCode::BAD_REQUEST,
            "too_many_rows",
            format!("a push may hold at most {MAX_PUSHED_ROWS} rows"),
        ));
    }
    if let Some(table) = rows
        .iter()
        .find_map(|row| unknown_table(&row["row"]["table"]))
    {
        return Err(ApiFailure::new(
            StatusCode::BAD_REQUEST,
            "unknown_sync_table",
            format!("the table {table:?} does not sync"),
        ));
    }
    serde_json::from_value(value).map_err(|error| bad_request(error.to_string()))
}

/// The name of a table that does not sync, when the value names one.
fn unknown_table(table: &Value) -> Option<String> {
    let name = table.as_str()?;
    serde_json::from_value::<SyncTable>(table.clone())
        .is_err()
        .then(|| name.to_string())
}

fn bad_query(message: impl Into<String>) -> ApiFailure {
    ApiFailure::new(StatusCode::BAD_REQUEST, "bad_query", message)
}

fn sync_row_of(change: SyncChange) -> SyncRow {
    SyncRow {
        table: change.table.into(),
        key: change.key,
        updated_at_ms: change.updated_at_ms,
        is_deleted: change.is_deleted,
        data: change.data,
    }
}

fn pushed_change_of(pushed: PushedRow) -> PushedChange {
    PushedChange {
        table: pushed.row.table.into(),
        key: pushed.row.key,
        updated_at_ms: pushed.row.updated_at_ms,
        is_deleted: pushed.row.is_deleted,
        data: pushed.row.data,
        base_updated_at_ms: pushed.base_updated_at_ms,
    }
}

fn outcome_of(table: SyncTable, key: String, verdict: PushVerdict) -> PushOutcome {
    let (kind, remote_updated_at_ms, current) = match verdict {
        PushVerdict::Applied { updated_at_ms } => {
            (PushOutcomeKind::Applied, Some(updated_at_ms), None)
        }
        PushVerdict::AppliedOverConcurrent { updated_at_ms } => (
            PushOutcomeKind::AppliedOverConcurrent,
            Some(updated_at_ms),
            None,
        ),
        PushVerdict::Unchanged { updated_at_ms } => {
            (PushOutcomeKind::Unchanged, Some(updated_at_ms), None)
        }
        PushVerdict::Superseded { current } => (
            PushOutcomeKind::Superseded,
            None,
            Some(sync_row_of(current)),
        ),
        PushVerdict::ParentDeleted { tombstone } => (
            PushOutcomeKind::ParentDeleted,
            None,
            Some(sync_row_of(tombstone)),
        ),
        PushVerdict::Rejected(reason) => {
            tracing::debug!(?table, %key, ?reason, "a pushed row was rejected");
            (PushOutcomeKind::Rejected, None, None)
        }
    };
    PushOutcome {
        table,
        key,
        kind,
        remote_updated_at_ms,
        current,
    }
}

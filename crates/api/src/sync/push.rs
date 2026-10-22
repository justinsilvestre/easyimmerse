//! Pushing this server's changes to the remote and recording its answers.

use easyimmerse_core::sync::{PushOutcome, PushOutcomeKind, PushedRow, SyncPushBatch, SyncRow};
use easyimmerse_storage::{
    AnsweredPush, PendingRow, PushAnswer, StoredRemote, SyncChange, SyncTable,
};
use serde_json::Value;

use super::SyncEngine;
use super::pull::{log_dropped_rows, pulled_row_of};
use super::remote_client::{RemoteClient, RemoteError};
use super::round::RoundError;
use crate::now_ms::now_ms;
use crate::routes::sync_changes::MAX_PUSHED_ROWS;

/// Pushes every change up to the current change sequence, in batches, and then records that the remote holds them all.
///
/// A media file that names its translation media file is rejected when that file reaches the remote only in a later batch.
/// Such rows are sent once more after every batch has gone, rather than taken as finally rejected.
pub fn push(
    engine: &SyncEngine,
    client: &RemoteClient,
    remote: &StoredRemote,
) -> Result<(), RoundError> {
    let through_seq = engine.storage.local_change_seq()?;
    let pending = engine
        .storage
        .pending_pushes(&remote.owner_id, &remote.id, through_seq)?;
    let mut retries = Vec::new();
    for batch in pending.chunks(MAX_PUSHED_ROWS) {
        retries.extend(push_batch(engine, client, remote, batch, true)?);
    }
    for batch in retries.chunks(MAX_PUSHED_ROWS) {
        push_batch(engine, client, remote, batch, false)?;
    }
    engine
        .storage
        .set_sync_pushed_through(&remote.id, through_seq)?;
    Ok(())
}

/// Sends one batch with each row as it is now, records the answers, and returns the rows to send again.
fn push_batch(
    engine: &SyncEngine,
    client: &RemoteClient,
    remote: &StoredRemote,
    batch: &[PendingRow],
    may_retry: bool,
) -> Result<Vec<PendingRow>, RoundError> {
    let keys: Vec<(SyncTable, String)> = batch
        .iter()
        .map(|row| (row.table, row.key.clone()))
        .collect();
    let currents = engine.storage.sync_changes_of(&remote.owner_id, &keys)?;
    let rows: Vec<PushedRow> = batch
        .iter()
        .zip(currents)
        .map(|(pending, current)| pushed_row_of(pending, current))
        .collect();
    let outcomes = client.push(&SyncPushBatch { rows: rows.clone() })?.outcomes;
    if outcomes.len() != rows.len() {
        return Err(protocol("the remote answered a different number of rows"));
    }
    let mut answers = Vec::new();
    let mut retries = Vec::new();
    for ((pending, sent), outcome) in batch.iter().zip(rows).zip(outcomes) {
        if outcome.table != sent.row.table || outcome.key != sent.row.key {
            return Err(protocol("the remote answered rows out of order"));
        }
        if may_retry && outcome.kind == PushOutcomeKind::Rejected && names_translation(&sent.row) {
            retries.push(pending.clone());
            continue;
        }
        answers.push(AnsweredPush {
            table: pending.table,
            key: pending.key.clone(),
            sent_updated_at_ms: sent.row.updated_at_ms,
            answer: answer_of(outcome)?,
        });
    }
    let applied = engine
        .storage
        .record_sync_push_answers(remote, &answers, now_ms())?;
    log_dropped_rows(&applied);
    if applied.applied_count > 0 {
        engine.note_pulled_rows();
    }
    Ok(retries)
}

/// The row as it stands now; a row gone from the registry altogether goes out as a tombstone.
fn pushed_row_of(pending: &PendingRow, current: Option<SyncChange>) -> PushedRow {
    let row = match current {
        Some(change) => SyncRow {
            table: change.table.into(),
            key: change.key,
            updated_at_ms: change.updated_at_ms,
            is_deleted: change.is_deleted,
            data: change.data,
        },
        None => SyncRow {
            table: pending.table.into(),
            key: pending.key.clone(),
            updated_at_ms: pending.updated_at_ms,
            is_deleted: true,
            data: None,
        },
    };
    PushedRow {
        row,
        base_updated_at_ms: pending.base_updated_at_ms,
    }
}

fn names_translation(row: &SyncRow) -> bool {
    row.table == easyimmerse_core::sync::SyncTable::MediaFiles
        && row.data.as_ref().is_some_and(|data| {
            matches!(
                data.get("translation_media_file_id"),
                Some(Value::String(_))
            )
        })
}

fn answer_of(outcome: PushOutcome) -> Result<PushAnswer, RoundError> {
    match outcome.kind {
        PushOutcomeKind::Applied
        | PushOutcomeKind::AppliedOverConcurrent
        | PushOutcomeKind::Unchanged => {
            let remote_updated_at_ms = outcome
                .remote_updated_at_ms
                .ok_or_else(|| protocol("an accepted row came without its time"))?;
            Ok(PushAnswer::Accepted {
                remote_updated_at_ms,
            })
        }
        PushOutcomeKind::Superseded => {
            let current = outcome
                .current
                .ok_or_else(|| protocol("a superseded row came without the remote's version"))?;
            Ok(PushAnswer::Superseded {
                current: pulled_row_of(current),
            })
        }
        PushOutcomeKind::ParentDeleted => Ok(PushAnswer::ParentDeleted),
        PushOutcomeKind::Rejected => Ok(PushAnswer::Rejected),
    }
}

fn protocol(message: &str) -> RoundError {
    RoundError::Remote(RemoteError::Protocol(message.to_string()))
}

//! Recording what a remote did with the rows this server pushed to it.

use easyimmerse_core::sync::ConflictKept;
use rusqlite::{Connection, TransactionBehavior};

use super::changes::change_of;
use super::codec::stamp;
use super::inbox::{AppliedInbox, PulledRow};
use super::pulled_rows::{Puller, apply_remote_version};
use super::remotes::{StoredRemote, record_base};
use super::tables::SyncTable;
use crate::error::StorageError;

/// A row this server pushed, with the modification time it had when sent and the remote's answer.
#[derive(Debug, Clone, PartialEq)]
pub struct AnsweredPush {
    pub table: SyncTable,
    pub key: String,
    pub sent_updated_at_ms: u64,
    pub answer: PushAnswer,
}

/// What the remote did with a pushed row.
#[derive(Debug, Clone, PartialEq)]
pub enum PushAnswer {
    /// The remote holds the row as sent, with this modification time.
    Accepted { remote_updated_at_ms: u64 },
    /// The remote kept a newer version of its own.
    Superseded { current: PulledRow },
    /// A parent of the row was deleted on the remote, so the remote dropped the row.
    ParentDeleted,
    /// The remote cannot store the row.
    Rejected,
}

/// Records the remote's answers to one batch in one transaction:
/// what the remote now holds of each row, the remote's newer versions, and the conflicts.
pub fn record_push_answers(
    conn: &mut Connection,
    remote: &StoredRemote,
    answers: &[AnsweredPush],
    now_ms: u64,
) -> Result<AppliedInbox, StorageError> {
    let mut transaction = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
    transaction.execute_batch("PRAGMA defer_foreign_keys = ON")?;
    let mut puller = Puller::new(&remote.owner_id, &remote.id, now_ms);
    for answered in answers {
        match &answered.answer {
            PushAnswer::Accepted {
                remote_updated_at_ms,
            } => accept(&transaction, remote, answered, *remote_updated_at_ms)?,
            PushAnswer::Superseded { current } => {
                apply_remote_version(&mut transaction, &mut puller, current)?;
            }
            PushAnswer::ParentDeleted => {
                let row = sent_row(answered);
                puller.conflict(&transaction, &row, ConflictKept::Deletion)?;
                puller.settle(&transaction, &row)?;
            }
            PushAnswer::Rejected => {
                puller.drop_row(&transaction, &sent_row(answered), "the remote rejected it")?;
            }
        }
    }
    transaction.commit()?;
    Ok(puller.applied)
}

/// Records the remote's time for the row. When the remote changed the time, as it does with a time ahead of its clock,
/// this server takes it too, unless the row changed here since it was sent.
fn accept(
    conn: &Connection,
    remote: &StoredRemote,
    answered: &AnsweredPush,
    remote_updated_at_ms: u64,
) -> Result<(), StorageError> {
    let local = change_of(conn, &remote.owner_id, answered.table, &answered.key)?;
    if remote_updated_at_ms != answered.sent_updated_at_ms
        && local.is_some_and(|local| local.updated_at_ms == answered.sent_updated_at_ms)
    {
        stamp(
            conn,
            &remote.owner_id,
            answered.table,
            &answered.key,
            remote_updated_at_ms,
        )?;
    }
    record_base(
        conn,
        &remote.id,
        answered.table,
        &answered.key,
        remote_updated_at_ms,
    )
}

/// The row as sent, for settling it at the time it was sent.
fn sent_row(answered: &AnsweredPush) -> PulledRow {
    PulledRow {
        table: answered.table,
        key: answered.key.clone(),
        updated_at_ms: answered.sent_updated_at_ms,
        is_deleted: false,
        data: None,
    }
}

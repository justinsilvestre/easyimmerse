//! Writing and deleting rows pulled from a remote, after checking that their parents are here.

use easyimmerse_core::flashcard::FlashcardId;
use easyimmerse_core::sync::ConflictKept;
use rusqlite::{Connection, Transaction, params};
use serde_json::Value;

use super::apply_pushed::{owner_of_row, parents_of, rejection_of, text_of};
use super::changes::change_of;
use super::codec::{delete_row, read_row, stamp, write_row};
use super::conflict_descriptions::describe_row;
use super::conflicts::{NewConflict, record_conflict};
use super::inbox::{AppliedInbox, PulledRow, keep_in_inbox};
use super::plain_keys::unplain_key_reason;
use super::remotes::record_base;
use super::tables::SyncTable;
use crate::error::StorageError;
use crate::owners::OwnerId;
use crate::review_rows::refresh_review_card;

/// Applies pulled rows for one owner and remote, and tallies what it changed.
pub(crate) struct Puller<'a> {
    pub owner: &'a OwnerId,
    pub remote_id: &'a str,
    pub now_ms: u64,
    pub applied: AppliedInbox,
}

impl<'a> Puller<'a> {
    pub fn new(owner: &'a OwnerId, remote_id: &'a str, now_ms: u64) -> Self {
        Self {
            owner,
            remote_id,
            now_ms,
            applied: AppliedInbox::default(),
        }
    }

    /// Records that the remote holds the row as pulled, and takes the row out of the inbox.
    pub fn settle(&self, conn: &Connection, row: &PulledRow) -> Result<(), StorageError> {
        record_base(conn, self.remote_id, row.table, &row.key, row.updated_at_ms)?;
        conn.execute(
            "DELETE FROM sync_inbox WHERE remote_id = ?1 AND table_name = ?2 AND row_key = ?3",
            params![self.remote_id, row.table.as_str(), row.key],
        )?;
        Ok(())
    }

    /// Settles a row that cannot be stored here, noting why.
    pub fn drop_row(
        &mut self,
        conn: &Connection,
        row: &PulledRow,
        reason: &str,
    ) -> Result<(), StorageError> {
        self.applied
            .dropped_rows
            .push(format!("{} {}: {reason}", row.table.as_str(), row.key));
        self.settle(conn, row)
    }

    /// Names the row for a conflict notice, while its project is still here to name it.
    pub fn describe(&self, conn: &Connection, row: &PulledRow) -> Result<String, StorageError> {
        describe_row(conn, self.owner, row.table, &row.key, row.data.as_ref())
    }

    pub fn conflict(
        &mut self,
        conn: &Connection,
        row: &PulledRow,
        kept: ConflictKept,
    ) -> Result<(), StorageError> {
        let description = self.describe(conn, row)?;
        self.record(conn, row, kept, description)
    }

    pub fn record(
        &mut self,
        conn: &Connection,
        row: &PulledRow,
        kept: ConflictKept,
        description: String,
    ) -> Result<(), StorageError> {
        let conflict = NewConflict {
            table: row.table,
            key: row.key.clone(),
            kept,
            description,
            detected_at_ms: self.now_ms,
        };
        record_conflict(conn, self.remote_id, &conflict)?;
        self.applied.conflict_count += 1;
        Ok(())
    }
}

/// Whether the rows a pulled upsert refers to are here.
pub(crate) enum ParentState {
    /// Every parent is here, except possibly rows of the same table, whose keys are listed.
    Present { pending_same_table: Vec<String> },
    /// A parent was deleted here and the deletion wins.
    Deleted,
    /// A parent has not arrived yet.
    Missing,
    /// The row cannot be written here, for the reason given.
    Unusable(String),
}

pub(crate) fn parent_state(
    conn: &Connection,
    owner: &OwnerId,
    row: &PulledRow,
) -> Result<ParentState, StorageError> {
    let Some(data) = &row.data else {
        return Ok(ParentState::Unusable("the row has no data".into()));
    };
    let mut pending_same_table = Vec::new();
    for (parent_table, column, is_optional) in parents_of(row.table) {
        let parent_key = match data.get(*column) {
            Some(Value::String(key)) => key,
            Some(Value::Null) | None if *is_optional => continue,
            _ => return Ok(ParentState::Unusable(format!("the row lacks {column}"))),
        };
        match owner_of_row(conn, *parent_table, parent_key)? {
            Some(parent_owner) if parent_owner == owner.0 => continue,
            Some(_) => {
                return Ok(ParentState::Unusable(
                    "a parent belongs to another owner".into(),
                ));
            }
            None => {}
        }
        let tombstone = change_of(conn, owner, *parent_table, parent_key)?;
        if tombstone.is_some_and(|change| change.is_deleted) {
            return Ok(ParentState::Deleted);
        }
        if *parent_table != row.table {
            return Ok(ParentState::Missing);
        }
        pending_same_table.push(parent_key.clone());
    }
    Ok(ParentState::Present { pending_same_table })
}

/// Writes a pulled row whose parents are here, gives it the remote's modification time, and settles it.
/// A row whose data breaks a constraint is dropped with a warning rather than failing the whole pull.
pub(crate) fn write_upsert(
    transaction: &mut Transaction,
    puller: &mut Puller,
    row: &PulledRow,
    conflict: Option<ConflictKept>,
) -> Result<(), StorageError> {
    let Some(data) = &row.data else {
        return puller.settle(transaction, row);
    };
    let description = conflict
        .map(|_| puller.describe(transaction, row))
        .transpose()?;
    let savepoint = transaction.savepoint()?;
    if let Err(error) = write_row(&savepoint, puller.owner, row.table.spec(), data) {
        let reason = rejection_of(error)?;
        drop(savepoint);
        return puller.drop_row(transaction, row, &format!("{reason:?}"));
    }
    stamp(
        &savepoint,
        puller.owner,
        row.table,
        &row.key,
        row.updated_at_ms,
    )?;
    savepoint.commit()?;
    if row.table == SyncTable::ReviewLog
        && let Some(flashcard_id) = text_of(data, "flashcard_id")
    {
        refresh_flashcard(transaction, puller, FlashcardId(flashcard_id))?;
    }
    finish(transaction, puller, row, conflict.zip(description))
}

/// Deletes the row a pulled tombstone names, together with whatever its foreign keys cascade to, and settles it.
pub(crate) fn apply_deletion(
    conn: &Connection,
    puller: &mut Puller,
    row: &PulledRow,
    conflict: Option<ConflictKept>,
) -> Result<(), StorageError> {
    let spec = row.table.spec();
    let description = conflict.map(|_| puller.describe(conn, row)).transpose()?;
    let answered_flashcard = if row.table == SyncTable::ReviewLog {
        read_row(conn, puller.owner, spec, &row.key)?
            .and_then(|data| text_of(&data, "flashcard_id"))
    } else {
        None
    };
    delete_row(conn, puller.owner, spec, &row.key)?;
    stamp(conn, puller.owner, row.table, &row.key, row.updated_at_ms)?;
    if let Some(flashcard_id) = answered_flashcard {
        refresh_flashcard(conn, puller, FlashcardId(flashcard_id))?;
    }
    finish(conn, puller, row, conflict.zip(description))
}

/// Applies a row that the remote kept over this server's change, as a push answered:
/// written or deleted when its parents are here, kept in the inbox when a parent has yet to arrive,
/// and dropped when a parent was deleted here.
pub(crate) fn apply_remote_version(
    transaction: &mut Transaction,
    puller: &mut Puller,
    row: &PulledRow,
) -> Result<(), StorageError> {
    if let Some(reason) = unplain_key_reason(row.table, &row.key, row.data.as_ref()) {
        return puller.drop_row(transaction, row, &reason);
    }
    if row.is_deleted {
        return apply_deletion(transaction, puller, row, Some(ConflictKept::OtherDevice));
    }
    match parent_state(transaction, puller.owner, row)? {
        ParentState::Present { pending_same_table } => {
            if pending_same_table.is_empty() {
                write_upsert(transaction, puller, row, Some(ConflictKept::OtherDevice))
            } else {
                keep_in_inbox(transaction, puller.remote_id, row)
            }
        }
        ParentState::Missing => keep_in_inbox(transaction, puller.remote_id, row),
        ParentState::Deleted => {
            puller.conflict(transaction, row, ConflictKept::Deletion)?;
            puller.settle(transaction, row)
        }
        ParentState::Unusable(reason) => puller.drop_row(transaction, row, &reason),
    }
}

fn refresh_flashcard(
    conn: &Connection,
    puller: &mut Puller,
    flashcard_id: FlashcardId,
) -> Result<(), StorageError> {
    refresh_review_card(conn, &flashcard_id)?;
    puller.applied.refreshed_flashcards.push(flashcard_id);
    Ok(())
}

fn finish(
    conn: &Connection,
    puller: &mut Puller,
    row: &PulledRow,
    conflict: Option<(ConflictKept, String)>,
) -> Result<(), StorageError> {
    if let Some((kept, description)) = conflict {
        puller.record(conn, row, kept, description)?;
    }
    puller.applied.applied_count += 1;
    puller.settle(conn, row)
}

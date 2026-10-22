//! Rows pulled from a remote: kept in an inbox until applied, then applied rank by rank,
//! so that a row's parents are always written before it.

use std::collections::HashSet;

use easyimmerse_core::flashcard::FlashcardId;
use easyimmerse_core::sync::ConflictKept;
use rusqlite::{Connection, Row, TransactionBehavior, params};

use super::changes::change_of;
use super::codec::{RowData, stamp};
use super::plain_keys::unplain_key_reason;
use super::pulled_rows::{ParentState, Puller, apply_deletion, parent_state, write_upsert};
use super::remotes::{StoredRemote, set_pulled_cursor};
use super::tables::SyncTable;
use crate::error::StorageError;
use crate::owners::OwnerId;
use crate::stored_integer::{read_unsigned, to_stored_integer};

/// A row as a remote holds it, or its tombstone.
#[derive(Debug, Clone, PartialEq)]
pub struct PulledRow {
    pub table: SyncTable,
    pub key: String,
    pub updated_at_ms: u64,
    pub is_deleted: bool,
    /// The row's synced columns; None for a deleted row.
    pub data: Option<RowData>,
}

/// What applying pulled rows changed here.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct AppliedInbox {
    /// How many rows were written or deleted here.
    pub applied_count: u64,
    /// How many conflicts were recorded.
    pub conflict_count: u64,
    /// The flashcards whose schedule was rebuilt because their answers changed.
    pub refreshed_flashcards: Vec<FlashcardId>,
    /// Dictionaries that the remote has and this server does not. They stay in the inbox until their content is fetched.
    pub dictionaries_to_fetch: Vec<PulledRow>,
    /// Rows that could not be stored here and were dropped, each named with the reason, for the log.
    pub dropped_rows: Vec<String>,
}

impl AppliedInbox {
    pub fn merge(&mut self, other: AppliedInbox) {
        self.applied_count += other.applied_count;
        self.conflict_count += other.conflict_count;
        self.refreshed_flashcards.extend(other.refreshed_flashcards);
        self.dictionaries_to_fetch
            .extend(other.dictionaries_to_fetch);
        self.dropped_rows.extend(other.dropped_rows);
    }
}

/// Keeps a page of pulled rows in the inbox and moves the pull cursor past it, in one transaction.
/// A row already in the inbox is replaced by its newer version.
pub fn receive_page(
    conn: &mut Connection,
    remote_id: &str,
    rows: &[PulledRow],
    next_cursor: u64,
) -> Result<(), StorageError> {
    let transaction = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
    for row in rows {
        keep_in_inbox(&transaction, remote_id, row)?;
    }
    set_pulled_cursor(&transaction, remote_id, next_cursor)?;
    transaction.commit()?;
    Ok(())
}

pub(crate) fn keep_in_inbox(
    conn: &Connection,
    remote_id: &str,
    row: &PulledRow,
) -> Result<(), StorageError> {
    let data_json = row.data.as_ref().map(serde_json::to_string).transpose()?;
    conn.execute(
        "INSERT INTO sync_inbox (remote_id, table_name, row_key, updated_at_ms, is_deleted, data_json) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6) ON CONFLICT (remote_id, table_name, row_key) DO UPDATE SET \
         updated_at_ms = excluded.updated_at_ms, is_deleted = excluded.is_deleted, data_json = excluded.data_json",
        params![
            remote_id,
            row.table.as_str(),
            row.key,
            to_stored_integer(row.updated_at_ms),
            row.is_deleted,
            data_json
        ],
    )?;
    Ok(())
}

/// How many pulled rows wait in the inbox, such as dictionaries not yet fetched and rows whose parent has not arrived.
pub fn inbox_size(conn: &Connection, remote_id: &str) -> Result<u64, StorageError> {
    Ok(conn.query_row(
        "SELECT COUNT(*) FROM sync_inbox WHERE remote_id = ?1",
        params![remote_id],
        |row| read_unsigned(row, 0),
    )?)
}

/// How a pulled row relates to this server's version of it.
enum Decision {
    /// Both servers hold the same row.
    Agreed,
    /// Both changed the row; this server's change is newer and is kept.
    KeepLocal,
    /// The pulled row is to be applied, with the conflict to record when this server had changed it too.
    Apply(Option<ConflictKept>),
}

/// Applies the inbox rows of one rank as the remote's owner's, in one transaction, and records what the remote now holds.
/// Of two changes made at once, the later is kept and the conflict recorded.
/// A row whose parent is not here yet stays in the inbox.
pub fn apply_inbox(
    conn: &mut Connection,
    remote: &StoredRemote,
    rank: u8,
    now_ms: u64,
) -> Result<AppliedInbox, StorageError> {
    let mut transaction = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
    transaction.execute_batch("PRAGMA defer_foreign_keys = ON")?;
    let mut puller = Puller::new(&remote.owner_id, &remote.id, now_ms);
    let rows = inbox_rows(&transaction, &remote.id, rank)?;
    let mut upserts = Vec::new();
    for row in rows {
        if let Some(reason) = unplain_key_reason(row.table, &row.key, row.data.as_ref()) {
            puller.drop_row(&transaction, &row, &reason)?;
            continue;
        }
        match decide(&transaction, &remote.owner_id, &remote.id, &row)? {
            Decision::Agreed => puller.settle(&transaction, &row)?,
            Decision::KeepLocal => {
                puller.conflict(&transaction, &row, ConflictKept::ThisDevice)?;
                puller.settle(&transaction, &row)?;
            }
            Decision::Apply(conflict) if row.is_deleted => {
                apply_deletion(&transaction, &mut puller, &row, conflict)?;
            }
            Decision::Apply(_) if row.table == SyncTable::Dictionaries => {
                if dictionary_exists(&transaction, &remote.owner_id, &row.key)? {
                    puller.settle(&transaction, &row)?;
                } else {
                    puller.applied.dictionaries_to_fetch.push(row);
                }
            }
            Decision::Apply(conflict) => upserts.push((row, conflict)),
        }
    }
    for (row, conflict) in writable_upserts(&transaction, &mut puller, upserts)? {
        write_upsert(&mut transaction, &mut puller, &row, conflict)?;
    }
    transaction.commit()?;
    Ok(puller.applied)
}

fn decide(
    conn: &Connection,
    owner: &OwnerId,
    remote_id: &str,
    row: &PulledRow,
) -> Result<Decision, StorageError> {
    let Some(local) = change_of(conn, owner, row.table, &row.key)? else {
        return Ok(Decision::Apply(None));
    };
    if local.updated_at_ms == row.updated_at_ms && local.is_deleted == row.is_deleted {
        return Ok(Decision::Agreed);
    }
    let changed_here = base_of(conn, remote_id, row)? != Some(local.updated_at_ms);
    if !changed_here {
        return Ok(Decision::Apply(None));
    }
    if local.is_deleted == row.is_deleted && local.data == row.data {
        // Both made the same change: this server takes the remote's time, so that the row is not pushed back.
        stamp(conn, owner, row.table, &row.key, row.updated_at_ms)?;
        return Ok(Decision::Agreed);
    }
    if row.updated_at_ms > local.updated_at_ms {
        Ok(Decision::Apply(Some(ConflictKept::OtherDevice)))
    } else {
        Ok(Decision::KeepLocal)
    }
}

/// Leaves out the upserts that must wait for a parent, and settles those whose parent was deleted here.
/// A media file may name another media file of the same pull as its translation, so those references
/// count as met when the other row is written too.
fn writable_upserts(
    conn: &Connection,
    puller: &mut Puller,
    upserts: Vec<(PulledRow, Option<ConflictKept>)>,
) -> Result<Vec<(PulledRow, Option<ConflictKept>)>, StorageError> {
    let mut candidates = Vec::new();
    for (row, conflict) in upserts {
        match parent_state(conn, puller.owner, &row)? {
            ParentState::Present { pending_same_table } => {
                candidates.push((row, conflict, pending_same_table));
            }
            ParentState::Deleted => {
                puller.conflict(conn, &row, ConflictKept::Deletion)?;
                puller.settle(conn, &row)?;
            }
            ParentState::Missing => {}
            ParentState::Unusable(reason) => {
                puller.drop_row(conn, &row, &reason)?;
            }
        }
    }
    loop {
        let keys: HashSet<String> = candidates.iter().map(|(row, ..)| row.key.clone()).collect();
        let before = candidates.len();
        candidates.retain(|(_, _, pending)| pending.iter().all(|key| keys.contains(key)));
        if candidates.len() == before {
            break;
        }
    }
    Ok(candidates
        .into_iter()
        .map(|(row, conflict, _)| (row, conflict))
        .collect())
}

fn inbox_rows(
    conn: &Connection,
    remote_id: &str,
    rank: u8,
) -> Result<Vec<PulledRow>, StorageError> {
    let mut statement = conn.prepare(
        "SELECT table_name, row_key, updated_at_ms, is_deleted, data_json FROM sync_inbox \
         WHERE remote_id = ?1 ORDER BY table_name, row_key",
    )?;
    let stored = statement
        .query_map(params![remote_id], read_inbox_row)?
        .collect::<Result<Vec<_>, _>>()?;
    let mut rows = Vec::new();
    for (table_name, key, updated_at_ms, is_deleted, data_json) in stored {
        let table: SyncTable = table_name.parse()?;
        if table.spec().rank != rank {
            continue;
        }
        let data = data_json
            .map(|json| serde_json::from_str::<RowData>(&json))
            .transpose()?;
        rows.push(PulledRow {
            table,
            key,
            updated_at_ms,
            is_deleted,
            data,
        });
    }
    Ok(rows)
}

type StoredInboxRow = (String, String, u64, bool, Option<String>);

fn read_inbox_row(row: &Row) -> rusqlite::Result<StoredInboxRow> {
    Ok((
        row.get(0)?,
        row.get(1)?,
        read_unsigned(row, 2)?,
        row.get(3)?,
        row.get(4)?,
    ))
}

fn base_of(
    conn: &Connection,
    remote_id: &str,
    row: &PulledRow,
) -> Result<Option<u64>, StorageError> {
    use rusqlite::OptionalExtension;
    Ok(conn
        .query_row(
            "SELECT updated_at_ms FROM sync_bases WHERE remote_id = ?1 AND table_name = ?2 AND row_key = ?3",
            params![remote_id, row.table.as_str(), row.key],
            |row| read_unsigned(row, 0),
        )
        .optional()?)
}

fn dictionary_exists(conn: &Connection, owner: &OwnerId, id: &str) -> Result<bool, StorageError> {
    Ok(conn.query_row(
        "SELECT EXISTS (SELECT 1 FROM dictionaries WHERE id = ?1 AND owner_id = ?2)",
        params![id, owner.0],
        |row| row.get(0),
    )?)
}

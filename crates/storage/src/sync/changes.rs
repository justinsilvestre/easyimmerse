//! What changed in an owner's synced rows: a page of changes after a cursor, and the changes a remote has yet to receive.

use rusqlite::{Connection, OptionalExtension, Row, params};

use super::codec::{RowData, read_row};
use super::tables::SyncTable;
use crate::error::StorageError;
use crate::owners::OwnerId;
use crate::stored_integer::{read_optional_unsigned, read_unsigned, to_stored_integer};

/// A synced row as it stands after its latest change, or its tombstone.
#[derive(Debug, Clone, PartialEq)]
pub struct SyncChange {
    pub table: SyncTable,
    pub key: String,
    pub change_seq: u64,
    pub updated_at_ms: u64,
    pub is_deleted: bool,
    /// The row's synced columns; None for a deleted row.
    pub data: Option<RowData>,
}

/// One page of an owner's changes, in the order they were made.
#[derive(Debug, Clone, PartialEq)]
pub struct SyncChangesPage {
    pub changes: Vec<SyncChange>,
    /// The cursor to ask for the next page with: the change sequence of the page's last change.
    pub next_cursor: u64,
    pub has_more: bool,
}

/// A change of this server that a remote has yet to receive, with the modification time the remote last had for the row.
#[derive(Debug, Clone, PartialEq)]
pub struct PendingRow {
    pub table: SyncTable,
    pub key: String,
    pub change_seq: u64,
    pub updated_at_ms: u64,
    pub is_deleted: bool,
    /// None when the remote has never had the row.
    pub base_updated_at_ms: Option<u64>,
}

/// The owner's changes after `cursor`, at most `limit` of them, each with the row's current data.
pub fn changes_since(
    conn: &Connection,
    owner: &OwnerId,
    cursor: u64,
    limit: u32,
) -> Result<SyncChangesPage, StorageError> {
    let mut statement = conn.prepare(
        "SELECT table_name, row_key, change_seq, updated_at_ms, is_deleted FROM sync_rows \
         WHERE owner_id = ?1 AND change_seq > ?2 ORDER BY change_seq LIMIT ?3",
    )?;
    let mut entries = statement
        .query_map(
            params![owner.0, to_stored_integer(cursor), i64::from(limit) + 1],
            read_entry,
        )?
        .collect::<Result<Vec<Entry>, _>>()?;
    let has_more = entries.len() > limit as usize;
    entries.truncate(limit as usize);
    let next_cursor = entries.last().map_or(cursor, |entry| entry.change_seq);
    let changes = entries
        .into_iter()
        .map(|entry| entry.into_change(conn, owner))
        .collect::<Result<_, _>>()?;
    Ok(SyncChangesPage {
        changes,
        next_cursor,
        has_more,
    })
}

/// The owner's registry entry of one row, with the row's current data, or None when the row was never seen here.
pub fn change_of(
    conn: &Connection,
    owner: &OwnerId,
    table: SyncTable,
    key: &str,
) -> Result<Option<SyncChange>, StorageError> {
    let entry = conn
        .query_row(
            "SELECT table_name, row_key, change_seq, updated_at_ms, is_deleted FROM sync_rows \
             WHERE table_name = ?1 AND row_key = ?2 AND owner_id = ?3",
            params![table.as_str(), key, owner.0],
            read_entry,
        )
        .optional()?;
    entry
        .map(|entry| entry.into_change(conn, owner))
        .transpose()
}

/// The last change sequence this server gave out.
pub fn local_change_seq(conn: &Connection) -> Result<u64, StorageError> {
    Ok(
        conn.query_row("SELECT last_seq FROM sync_clock", [], |row| {
            read_unsigned(row, 0)
        })?,
    )
}

/// The owner's changes after the remote's `pushed_through_seq` and up to `through_seq`, in the order to push them:
/// rows to insert or update first, parents before children, then deletions, children before parents.
/// A row whose modification time is the one the remote last had for it came from the remote, and is left out.
pub fn pending_pushes(
    conn: &Connection,
    owner: &OwnerId,
    remote_id: &str,
    through_seq: u64,
) -> Result<Vec<PendingRow>, StorageError> {
    let mut statement = conn.prepare(
        "SELECT s.table_name, s.row_key, s.change_seq, s.updated_at_ms, s.is_deleted, b.updated_at_ms \
         FROM sync_rows s JOIN sync_remotes r ON r.id = ?2 \
         LEFT JOIN sync_bases b ON b.remote_id = r.id AND b.table_name = s.table_name \
             AND b.row_key = s.row_key \
         WHERE s.owner_id = ?1 AND s.change_seq > r.pushed_through_seq AND s.change_seq <= ?3 \
             AND (b.updated_at_ms IS NULL OR b.updated_at_ms <> s.updated_at_ms)",
    )?;
    let mut rows = statement
        .query_map(
            params![owner.0, remote_id, to_stored_integer(through_seq)],
            |row| Ok((read_entry(row)?, read_optional_unsigned(row, 5)?)),
        )?
        .map(|row| {
            let (entry, base_updated_at_ms) = row?;
            entry.into_pending(base_updated_at_ms)
        })
        .collect::<Result<Vec<PendingRow>, StorageError>>()?;
    rows.sort_by_key(push_order);
    Ok(rows)
}

/// Upserts sort before deletions; upserts by rising rank, deletions by falling rank; then by change sequence.
fn push_order(row: &PendingRow) -> (bool, i16, u64) {
    let rank = i16::from(row.table.spec().rank);
    let rank = if row.is_deleted { -rank } else { rank };
    (row.is_deleted, rank, row.change_seq)
}

/// An entry of `sync_rows` as stored, before its table name is checked.
struct Entry {
    table_name: String,
    key: String,
    change_seq: u64,
    updated_at_ms: u64,
    is_deleted: bool,
}

impl Entry {
    fn into_change(self, conn: &Connection, owner: &OwnerId) -> Result<SyncChange, StorageError> {
        let table: SyncTable = self.table_name.parse()?;
        let data = if self.is_deleted {
            None
        } else {
            read_row(conn, owner, table.spec(), &self.key)?
        };
        Ok(SyncChange {
            table,
            key: self.key,
            change_seq: self.change_seq,
            updated_at_ms: self.updated_at_ms,
            is_deleted: self.is_deleted,
            data,
        })
    }

    fn into_pending(self, base_updated_at_ms: Option<u64>) -> Result<PendingRow, StorageError> {
        Ok(PendingRow {
            table: self.table_name.parse()?,
            key: self.key,
            change_seq: self.change_seq,
            updated_at_ms: self.updated_at_ms,
            is_deleted: self.is_deleted,
            base_updated_at_ms,
        })
    }
}

fn read_entry(row: &Row) -> rusqlite::Result<Entry> {
    Ok(Entry {
        table_name: row.get(0)?,
        key: row.get(1)?,
        change_seq: read_unsigned(row, 2)?,
        updated_at_ms: read_unsigned(row, 3)?,
        is_deleted: row.get(4)?,
    })
}

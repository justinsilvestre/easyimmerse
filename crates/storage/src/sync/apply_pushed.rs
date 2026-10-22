//! Applying the rows that a device pushes to this server: the remote side of a sync.
//! Of two changes made to a row at once, the one with the later modification time is kept.

use rusqlite::{Connection, ErrorCode, OptionalExtension, TransactionBehavior, params};
use serde_json::Value;

use super::changes::{SyncChange, change_of};
use super::codec::{RowData, delete_row, read_row, stamp, write_row};
use super::plain_keys::unplain_key_reason;
use super::tables::{SyncTable, SyncTableSpec};
use crate::error::StorageError;
use crate::owners::OwnerId;
use crate::preferences::is_synced_preference;
use crate::review_rows::refresh_review_card;
use easyimmerse_core::flashcard::FlashcardId;

/// How far ahead of this server's clock a pushed modification time may lie before it is taken as now.
const ALLOWED_CLOCK_LEAD_MS: u64 = 60_000;

/// A row as a device pushes it, with the modification time this server had for it when the device last heard of it.
#[derive(Debug, Clone, PartialEq)]
pub struct PushedChange {
    pub table: SyncTable,
    pub key: String,
    pub updated_at_ms: u64,
    pub is_deleted: bool,
    /// The row's synced columns; None for a deletion.
    pub data: Option<RowData>,
    pub base_updated_at_ms: Option<u64>,
}

/// What this server did with a pushed row.
#[derive(Debug, Clone, PartialEq)]
pub enum PushVerdict {
    /// The server had no change of its own since the device's base, and now holds the row with this modification time.
    Applied {
        updated_at_ms: u64,
    },
    /// The server had an older change of its own, which the pushed row replaced.
    AppliedOverConcurrent {
        updated_at_ms: u64,
    },
    /// The server already held the row as pushed, with this modification time.
    Unchanged {
        updated_at_ms: u64,
    },
    /// The server had a newer change of its own and kept it.
    Superseded {
        current: SyncChange,
    },
    /// A parent of the row was deleted here, so the row was dropped; the parent's tombstone comes with it.
    ParentDeleted {
        tombstone: SyncChange,
    },
    Rejected(PushRejection),
}

/// Why a pushed row cannot be stored.
#[derive(Debug, Clone, PartialEq)]
pub enum PushRejection {
    /// The preference belongs to one device and does not sync.
    DeviceBoundPreference,
    /// The data lacks a synced column, holds a list or an object, or breaks a constraint of the table.
    InvalidData(String),
    /// The key differs from the key that the data gives.
    KeyMismatch,
    /// A row with the key, or a parent the row names, belongs to another owner.
    AnotherOwner,
    /// A parent the row names was never seen here.
    ParentNotFound,
    /// A dictionary arrives only with its content, through its own upload; its row alone would leave it empty here.
    DictionaryWithoutContent,
}

/// Applies the pushed rows as the owner's in one transaction, and answers each in order.
/// A modification time more than a minute ahead of `now_ms` is taken as `now_ms`.
pub fn apply_pushed_batch(
    conn: &mut Connection,
    owner: &OwnerId,
    rows: &[PushedChange],
    now_ms: u64,
) -> Result<Vec<PushVerdict>, StorageError> {
    let mut transaction = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
    transaction.execute_batch("PRAGMA defer_foreign_keys = ON")?;
    let mut verdicts = Vec::with_capacity(rows.len());
    for (index, row) in rows.iter().enumerate() {
        let savepoint = transaction.savepoint()?;
        let later_rows = &rows[index + 1..];
        let verdict = match apply_one(&savepoint, owner, row, later_rows, now_ms) {
            Ok(verdict) => verdict,
            Err(error) => PushVerdict::Rejected(rejection_of(error)?),
        };
        // A savepoint dropped without a commit rolls back what a rejected row wrote.
        if !matches!(verdict, PushVerdict::Rejected(_)) {
            savepoint.commit()?;
        }
        verdicts.push(verdict);
    }
    transaction.commit()?;
    Ok(verdicts)
}

fn apply_one(
    conn: &Connection,
    owner: &OwnerId,
    row: &PushedChange,
    later_rows: &[PushedChange],
    now_ms: u64,
) -> Result<PushVerdict, StorageError> {
    let spec = row.table.spec();
    if let Some(rejection) = validate(conn, owner, spec, row)? {
        return Ok(PushVerdict::Rejected(rejection));
    }
    if !row.is_deleted
        && let Some(verdict) = check_parents(conn, owner, row, later_rows)?
    {
        return Ok(verdict);
    }
    let updated_at_ms = clamped(row.updated_at_ms, now_ms);
    let Some(current) = change_of(conn, owner, row.table, &row.key)? else {
        apply(conn, owner, spec, row, updated_at_ms)?;
        return Ok(PushVerdict::Applied { updated_at_ms });
    };
    if current.updated_at_ms == updated_at_ms && current.is_deleted == row.is_deleted {
        return Ok(PushVerdict::Unchanged { updated_at_ms });
    }
    if row.base_updated_at_ms == Some(current.updated_at_ms) {
        apply(conn, owner, spec, row, updated_at_ms)?;
        return Ok(PushVerdict::Applied { updated_at_ms });
    }
    if current.is_deleted == row.is_deleted && current.data == row.data {
        return Ok(PushVerdict::Unchanged {
            updated_at_ms: current.updated_at_ms,
        });
    }
    if updated_at_ms > current.updated_at_ms {
        apply(conn, owner, spec, row, updated_at_ms)?;
        return Ok(PushVerdict::AppliedOverConcurrent { updated_at_ms });
    }
    Ok(PushVerdict::Superseded { current })
}

fn clamped(updated_at_ms: u64, now_ms: u64) -> u64 {
    if updated_at_ms > now_ms.saturating_add(ALLOWED_CLOCK_LEAD_MS) {
        now_ms
    } else {
        updated_at_ms
    }
}

/// Writes or deletes the row with the codec, gives its registry entry the pushed time,
/// and rebuilds the schedule of a flashcard whose answers changed.
fn apply(
    conn: &Connection,
    owner: &OwnerId,
    spec: &SyncTableSpec,
    row: &PushedChange,
    updated_at_ms: u64,
) -> Result<(), StorageError> {
    let answered_flashcard = answered_flashcard(conn, owner, spec, row)?;
    match (&row.data, row.is_deleted) {
        (Some(data), false) => write_row(conn, owner, spec, data)?,
        _ => delete_row(conn, owner, spec, &row.key)?,
    }
    stamp(conn, owner, row.table, &row.key, updated_at_ms)?;
    if let Some(flashcard_id) = answered_flashcard {
        refresh_review_card(conn, &flashcard_id)?;
    }
    Ok(())
}

/// The flashcard whose schedule a review answer decides, read before a deletion removes the answer.
fn answered_flashcard(
    conn: &Connection,
    owner: &OwnerId,
    spec: &SyncTableSpec,
    row: &PushedChange,
) -> Result<Option<FlashcardId>, StorageError> {
    if spec.table != SyncTable::ReviewLog {
        return Ok(None);
    }
    let data = match (&row.data, row.is_deleted) {
        (Some(data), false) => Some(data.clone()),
        _ => read_row(conn, owner, spec, &row.key)?,
    };
    Ok(data
        .as_ref()
        .and_then(|data| text_of(data, "flashcard_id"))
        .map(FlashcardId))
}

/// Refuses a row that is not the owner's to sync, or whose data cannot be written.
fn validate(
    conn: &Connection,
    owner: &OwnerId,
    spec: &SyncTableSpec,
    row: &PushedChange,
) -> Result<Option<PushRejection>, StorageError> {
    if let Some(reason) = unplain_key_reason(row.table, &row.key, row.data.as_ref()) {
        return Ok(Some(PushRejection::InvalidData(reason)));
    }
    if row.table == SyncTable::Preferences && !is_synced_preference(&row.key) {
        return Ok(Some(PushRejection::DeviceBoundPreference));
    }
    if row.table == SyncTable::Dictionaries && !row.is_deleted {
        return Ok(Some(PushRejection::DictionaryWithoutContent));
    }
    if !row.is_deleted {
        let Some(data) = &row.data else {
            return Ok(Some(PushRejection::InvalidData(
                "the row has no data".into(),
            )));
        };
        if let Some(column) = spec
            .columns
            .iter()
            .find(|column| !data.contains_key(**column))
        {
            return Ok(Some(PushRejection::InvalidData(format!(
                "the row lacks the column {column}"
            ))));
        }
        if key_of(spec.table, data).as_deref() != Some(row.key.as_str()) {
            return Ok(Some(PushRejection::KeyMismatch));
        }
    }
    if is_under_another_owner(conn, owner, row.table, &row.key)? {
        return Ok(Some(PushRejection::AnotherOwner));
    }
    Ok(None)
}

/// The key that the row's data gives, as the table's triggers write it into the registry.
fn key_of(table: SyncTable, data: &RowData) -> Option<String> {
    match table {
        SyncTable::ReviewHolds | SyncTable::AnkiPendingDeletions => text_of(data, "flashcard_id"),
        SyncTable::Preferences => text_of(data, "key"),
        SyncTable::ReviewParameters => Some("review_parameters".to_string()),
        SyncTable::ReviewDayAllowances => {
            let project_id = text_of(data, "project_id")?;
            let day_key = data.get("day_key")?.as_i64()?;
            Some(format!("{project_id}:{day_key}"))
        }
        _ => text_of(data, "id"),
    }
}

pub(crate) fn text_of(data: &RowData, column: &str) -> Option<String> {
    data.get(column)?.as_str().map(str::to_string)
}

/// Whether a registry entry or a stored row with the key belongs to another owner.
/// Every owner has rows of their own with the same keys in the tables keyed by owner, so those never belong to another.
fn is_under_another_owner(
    conn: &Connection,
    owner: &OwnerId,
    table: SyncTable,
    key: &str,
) -> Result<bool, StorageError> {
    if matches!(table, SyncTable::Preferences | SyncTable::ReviewParameters) {
        return Ok(false);
    }
    let has_foreign_entry: bool = conn.query_row(
        "SELECT EXISTS (SELECT 1 FROM sync_rows WHERE table_name = ?1 AND row_key = ?2 AND owner_id <> ?3)",
        params![table.as_str(), key, owner.0],
        |row| row.get(0),
    )?;
    let stored_owner = owner_of_row(conn, table, key)?;
    Ok(has_foreign_entry || stored_owner.is_some_and(|stored| stored != owner.0))
}

/// The owner of the stored row with the key, through its project where it has no owner of its own.
/// None when there is no such row, and for the tables whose key already includes the owner.
pub(crate) fn owner_of_row(
    conn: &Connection,
    table: SyncTable,
    key: &str,
) -> Result<Option<String>, StorageError> {
    let sql = match table {
        SyncTable::Projects => "SELECT owner_id FROM projects WHERE id = ?1",
        SyncTable::Dictionaries => "SELECT owner_id FROM dictionaries WHERE id = ?1",
        SyncTable::Preferences | SyncTable::ReviewParameters => return Ok(None),
        SyncTable::MediaFiles => {
            "SELECT p.owner_id FROM media_files t JOIN projects p ON p.id = t.project_id WHERE t.id = ?1"
        }
        SyncTable::SubtitleTracks => {
            "SELECT p.owner_id FROM subtitle_tracks t JOIN media_files m ON m.id = t.media_file_id \
             JOIN projects p ON p.id = m.project_id WHERE t.id = ?1"
        }
        SyncTable::Alignments => {
            "SELECT p.owner_id FROM alignments t JOIN media_files m ON m.id = t.media_file_id \
             JOIN projects p ON p.id = m.project_id WHERE t.id = ?1"
        }
        SyncTable::Flashcards => {
            "SELECT p.owner_id FROM flashcards t JOIN projects p ON p.id = t.project_id WHERE t.id = ?1"
        }
        SyncTable::ReviewLog => {
            "SELECT p.owner_id FROM review_log t JOIN projects p ON p.id = t.project_id WHERE t.id = ?1"
        }
        SyncTable::ReviewHolds => {
            "SELECT p.owner_id FROM review_holds t JOIN projects p ON p.id = t.project_id \
             WHERE t.flashcard_id = ?1"
        }
        SyncTable::AnkiPendingDeletions => {
            "SELECT p.owner_id FROM anki_pending_deletions t JOIN projects p ON p.id = t.project_id \
             WHERE t.flashcard_id = ?1"
        }
        SyncTable::ReviewDayAllowances => {
            "SELECT p.owner_id FROM review_day_allowances t JOIN projects p ON p.id = t.project_id \
             WHERE t.project_id || ':' || t.day_key = ?1"
        }
    };
    Ok(conn
        .query_row(sql, params![key], |row| row.get(0))
        .optional()?)
}

/// The rows a row of the table refers to, as (table, column, whether the reference may be null).
pub(crate) fn parents_of(table: SyncTable) -> &'static [(SyncTable, &'static str, bool)] {
    match table {
        SyncTable::MediaFiles => &[
            (SyncTable::Projects, "project_id", false),
            (SyncTable::MediaFiles, "translation_media_file_id", true),
        ],
        SyncTable::SubtitleTracks => &[(SyncTable::MediaFiles, "media_file_id", false)],
        SyncTable::Alignments => &[
            (SyncTable::MediaFiles, "media_file_id", false),
            (SyncTable::MediaFiles, "counterpart_media_file_id", false),
        ],
        SyncTable::Flashcards => &[
            (SyncTable::Projects, "project_id", false),
            (SyncTable::MediaFiles, "media_file_id", true),
        ],
        SyncTable::ReviewLog | SyncTable::ReviewHolds => &[
            (SyncTable::Projects, "project_id", false),
            (SyncTable::Flashcards, "flashcard_id", false),
        ],
        SyncTable::ReviewDayAllowances | SyncTable::AnkiPendingDeletions => {
            &[(SyncTable::Projects, "project_id", false)]
        }
        SyncTable::Projects
        | SyncTable::Dictionaries
        | SyncTable::Preferences
        | SyncTable::ReviewParameters => &[],
    }
}

/// Checks that every row the pushed row refers to is the owner's.
/// A parent deleted here drops the row; a parent of the same table may also come later in the batch.
fn check_parents(
    conn: &Connection,
    owner: &OwnerId,
    row: &PushedChange,
    later_rows: &[PushedChange],
) -> Result<Option<PushVerdict>, StorageError> {
    let Some(data) = &row.data else {
        return Ok(None);
    };
    for (parent_table, column, is_optional) in parents_of(row.table) {
        let parent_key = match data.get(*column) {
            Some(Value::String(key)) => key,
            Some(Value::Null) | None if *is_optional => continue,
            _ => return Ok(Some(PushVerdict::Rejected(PushRejection::ParentNotFound))),
        };
        match owner_of_row(conn, *parent_table, parent_key)? {
            Some(parent_owner) if parent_owner == owner.0 => continue,
            Some(_) => return Ok(Some(PushVerdict::Rejected(PushRejection::AnotherOwner))),
            None => {}
        }
        if let Some(tombstone) =
            change_of(conn, owner, *parent_table, parent_key)?.filter(|change| change.is_deleted)
        {
            return Ok(Some(PushVerdict::ParentDeleted { tombstone }));
        }
        let comes_later = *parent_table == row.table
            && later_rows.iter().any(|later| {
                later.table == *parent_table && later.key == *parent_key && !later.is_deleted
            });
        if !comes_later {
            return Ok(Some(PushVerdict::Rejected(PushRejection::ParentNotFound)));
        }
    }
    Ok(None)
}

/// Turns an error from writing a row into the rejection of that row, when the row's data caused it.
pub(crate) fn rejection_of(error: StorageError) -> Result<PushRejection, StorageError> {
    match error {
        StorageError::SyncColumnMissing { .. } | StorageError::SyncValueUnsupported { .. } => {
            Ok(PushRejection::InvalidData(error.to_string()))
        }
        StorageError::Sqlite(rusqlite::Error::SqliteFailure(failure, message))
            if failure.code == ErrorCode::ConstraintViolation =>
        {
            Ok(PushRejection::InvalidData(
                message.unwrap_or_else(|| failure.to_string()),
            ))
        }
        other => Err(other),
    }
}

//! The rows that this server and a remote changed at once, of which the more recent change was kept.

use easyimmerse_core::sync::{ConflictKept, SyncConflict};
use rusqlite::{Connection, Row, params};

use super::conflict_descriptions::RowNames;
use super::tables::SyncTable;
use crate::error::StorageError;
use crate::new_row::generate_id;
use crate::stored_integer::{read_unsigned, to_stored_integer};

/// A conflict to record, with the words that name its row for the person.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NewConflict {
    pub table: SyncTable,
    pub key: String,
    pub kept: ConflictKept,
    pub names: RowNames,
    pub detected_at_ms: u64,
}

pub fn record_conflict(
    conn: &Connection,
    remote_id: &str,
    conflict: &NewConflict,
) -> Result<(), StorageError> {
    conn.execute(
        "INSERT INTO sync_conflicts (id, remote_id, table_name, row_key, kept, description, \
         project_name, media_file_name, detected_at_ms) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            generate_id(),
            remote_id,
            conflict.table.as_str(),
            conflict.key,
            kept_name(conflict.kept),
            conflict.names.description,
            conflict.names.project_name,
            conflict.names.media_file_name,
            to_stored_integer(conflict.detected_at_ms),
        ],
    )?;
    Ok(())
}

/// The remote's most recent conflicts, newest first: at most `limit` of them, or all of them when there is no limit.
pub fn list_conflicts(
    conn: &Connection,
    remote_id: &str,
    limit: Option<u32>,
) -> Result<Vec<SyncConflict>, StorageError> {
    let mut statement = conn.prepare(
        "SELECT id, description, project_name, media_file_name, kept, detected_at_ms \
         FROM sync_conflicts WHERE remote_id = ?1 ORDER BY detected_at_ms DESC, rowid DESC LIMIT ?2",
    )?;
    // SQLite reads a negative limit as no limit.
    let limit = limit.map_or(-1, i64::from);
    let conflicts = statement
        .query_map(params![remote_id, limit], read_conflict)?
        .collect::<Result<_, _>>()?;
    Ok(conflicts)
}

pub fn count_conflicts(conn: &Connection, remote_id: &str) -> Result<u64, StorageError> {
    Ok(conn.query_row(
        "SELECT COUNT(*) FROM sync_conflicts WHERE remote_id = ?1",
        params![remote_id],
        |row| read_unsigned(row, 0),
    )?)
}

/// Forgets the remote's conflicts, once the person has read of them.
pub fn clear_conflicts(conn: &Connection, remote_id: &str) -> Result<(), StorageError> {
    conn.execute(
        "DELETE FROM sync_conflicts WHERE remote_id = ?1",
        params![remote_id],
    )?;
    Ok(())
}

fn kept_name(kept: ConflictKept) -> &'static str {
    match kept {
        ConflictKept::ThisDevice => "this_device",
        ConflictKept::OtherDevice => "other_device",
        ConflictKept::Deletion => "deletion",
    }
}

fn parse_kept(name: &str) -> Option<ConflictKept> {
    match name {
        "this_device" => Some(ConflictKept::ThisDevice),
        "other_device" => Some(ConflictKept::OtherDevice),
        "deletion" => Some(ConflictKept::Deletion),
        _ => None,
    }
}

fn read_conflict(row: &Row) -> rusqlite::Result<SyncConflict> {
    let kept: String = row.get(4)?;
    let kept = parse_kept(&kept).ok_or_else(|| {
        rusqlite::Error::FromSqlConversionFailure(
            4,
            rusqlite::types::Type::Text,
            format!("unknown value {kept:?}").into(),
        )
    })?;
    Ok(SyncConflict {
        id: row.get(0)?,
        description: row.get(1)?,
        project_name: row.get(2)?,
        media_file_name: row.get(3)?,
        kept,
        detected_at_ms: read_unsigned(row, 5)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sync::sync_test_support::storage_with_remote;

    fn conflict(description: &str, detected_at_ms: u64) -> NewConflict {
        NewConflict {
            table: SyncTable::Flashcards,
            key: "card".to_string(),
            kept: ConflictKept::OtherDevice,
            names: RowNames {
                description: description.to_string(),
                project_name: Some("Deutsch".to_string()),
                media_file_name: Some("Der Prozess.epub".to_string()),
            },
            detected_at_ms,
        }
    }

    #[test]
    fn lists_a_recorded_conflict() {
        let (storage, remote) = storage_with_remote();
        storage
            .record_sync_conflict(&remote.id, &conflict("a flashcard", 5))
            .unwrap();
        let listed = storage.list_sync_conflicts(&remote.id, 20).unwrap();
        assert_eq!(listed[0].description, "a flashcard");
    }

    #[test]
    fn lists_the_project_of_a_recorded_conflict() {
        let (storage, remote) = storage_with_remote();
        storage
            .record_sync_conflict(&remote.id, &conflict("a flashcard", 5))
            .unwrap();
        let listed = storage.list_sync_conflicts(&remote.id, 20).unwrap();
        assert_eq!(listed[0].project_name.as_deref(), Some("Deutsch"));
    }

    #[test]
    fn lists_the_media_file_of_a_recorded_conflict() {
        let (storage, remote) = storage_with_remote();
        storage
            .record_sync_conflict(&remote.id, &conflict("a flashcard", 5))
            .unwrap();
        let listed = storage.list_sync_conflicts(&remote.id, 20).unwrap();
        assert_eq!(
            listed[0].media_file_name.as_deref(),
            Some("Der Prozess.epub")
        );
    }

    #[test]
    fn lists_the_newest_conflict_first() {
        let (storage, remote) = storage_with_remote();
        storage
            .record_sync_conflict(&remote.id, &conflict("older", 5))
            .unwrap();
        storage
            .record_sync_conflict(&remote.id, &conflict("newer", 6))
            .unwrap();
        let listed = storage.list_sync_conflicts(&remote.id, 20).unwrap();
        assert_eq!(listed[0].description, "newer");
    }

    #[test]
    fn lists_at_most_the_limit() {
        let (storage, remote) = storage_with_remote();
        for at in 0..3 {
            storage
                .record_sync_conflict(&remote.id, &conflict("c", at))
                .unwrap();
        }
        assert_eq!(storage.list_sync_conflicts(&remote.id, 2).unwrap().len(), 2);
    }

    #[test]
    fn lists_every_conflict_without_a_limit() {
        let (storage, remote) = storage_with_remote();
        for at in 0..3 {
            storage
                .record_sync_conflict(&remote.id, &conflict("c", at))
                .unwrap();
        }
        assert_eq!(
            storage.list_every_sync_conflict(&remote.id).unwrap().len(),
            3
        );
    }

    #[test]
    fn counts_every_conflict() {
        let (storage, remote) = storage_with_remote();
        for at in 0..3 {
            storage
                .record_sync_conflict(&remote.id, &conflict("c", at))
                .unwrap();
        }
        assert_eq!(storage.count_sync_conflicts(&remote.id).unwrap(), 3);
    }

    #[test]
    fn clearing_forgets_the_conflicts() {
        let (storage, remote) = storage_with_remote();
        storage
            .record_sync_conflict(&remote.id, &conflict("c", 1))
            .unwrap();
        storage.clear_sync_conflicts(&remote.id).unwrap();
        assert_eq!(storage.count_sync_conflicts(&remote.id).unwrap(), 0);
    }
}

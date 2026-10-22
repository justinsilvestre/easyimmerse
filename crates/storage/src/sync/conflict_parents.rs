//! Finding the project and media file a synced row belongs to, so that a conflict notice can name them.

use rusqlite::{Connection, OptionalExtension, params};

use super::apply_pushed::text_of;
use super::codec::RowData;
use super::tables::SyncTable;
use crate::error::StorageError;
use crate::owners::OwnerId;

/// A media file of the owner's that is here.
pub struct KnownMediaFile {
    pub name: String,
    pub project_id: String,
}

pub fn media_file_of(
    conn: &Connection,
    owner: &OwnerId,
    media_file_id: &str,
) -> Result<Option<KnownMediaFile>, StorageError> {
    Ok(conn
        .query_row(
            "SELECT m.name, m.project_id FROM media_files m JOIN projects p ON p.id = m.project_id \
             WHERE m.id = ?1 AND p.owner_id = ?2",
            params![media_file_id, owner.0],
            |row| {
                Ok(KnownMediaFile {
                    name: row.get(0)?,
                    project_id: row.get(1)?,
                })
            },
        )
        .optional()?)
}

/// The project a row belongs to: from its registry entry here, else from its data.
pub fn project_of(
    conn: &Connection,
    owner: &OwnerId,
    table: SyncTable,
    key: &str,
    data: Option<&RowData>,
) -> Result<Option<String>, StorageError> {
    let registered: Option<Option<String>> = conn
        .query_row(
            "SELECT project_id FROM sync_rows WHERE table_name = ?1 AND row_key = ?2 AND owner_id = ?3",
            params![table.as_str(), key, owner.0],
            |row| row.get(0),
        )
        .optional()?;
    if let Some(Some(project_id)) = registered {
        return Ok(Some(project_id));
    }
    let Some(data) = data else {
        return Ok(None);
    };
    if let Some(project_id) = text_of(data, "project_id") {
        return Ok(Some(project_id));
    }
    let Some(media_file_id) = text_of(data, "media_file_id") else {
        return Ok(None);
    };
    Ok(conn
        .query_row(
            "SELECT project_id FROM media_files WHERE id = ?1",
            params![media_file_id],
            |row| row.get(0),
        )
        .optional()?)
}

pub fn project_name(conn: &Connection, project_id: &str) -> Result<Option<String>, StorageError> {
    Ok(conn
        .query_row(
            "SELECT name FROM projects WHERE id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .optional()?)
}

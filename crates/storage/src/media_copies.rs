//! Copies of media bytes that this server keeps in its uploads directory: uploads on a remote, downloads on a device.
//! The files themselves are the caller's to write and delete; a removed copy's file is listed until the caller takes it.

use easyimmerse_core::media_copy::StoredCopy;
use easyimmerse_core::media_file::{MediaFile, MediaFileId};
use easyimmerse_core::project::ProjectId;
use rusqlite::{Connection, OptionalExtension, Row, TransactionBehavior, params};

use crate::error::StorageError;
use crate::media_files::get_media_file;
use crate::owners::OwnerId;
use crate::stored_integer::{read_unsigned, to_stored_integer};

/// Where a copy's bytes are, and how many there are.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MediaCopy {
    /// The file's name inside the uploads directory.
    pub file_name: String,
    pub size_bytes: u64,
    pub stored_at_ms: u64,
}

/// A copy to record, whose file is already written.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NewMediaCopy {
    pub media_file_id: MediaFileId,
    pub file_name: String,
    pub size_bytes: u64,
    pub stored_at_ms: u64,
    /// The most bytes the owner may keep in copies, counting this one and not the copy it replaces; None for no limit.
    pub quota_bytes: Option<u64>,
}

/// Records a copy of a media file, replacing any earlier one, and records the choice to keep it.
/// Fails with `QuotaExceeded`, recording nothing, when the owner's copies would take more than the quota.
pub fn record_media_copy(
    conn: &mut Connection,
    copy: &NewMediaCopy,
) -> Result<StoredCopy, StorageError> {
    let transaction = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let media_file = get_media_file(&transaction, &copy.media_file_id)?;
    if let Some(quota) = copy.quota_bytes {
        let owner = owner_of_project(&transaction, &media_file.project_id)?;
        let used = size_without(&transaction, &owner, &copy.media_file_id)?;
        if used + copy.size_bytes > quota {
            return Err(StorageError::QuotaExceeded {
                used,
                quota,
                size: copy.size_bytes,
            });
        }
    }
    // Deleting first lets the trigger release the replaced copy's file.
    transaction.execute(
        "DELETE FROM media_copies WHERE media_file_id = ?1",
        params![copy.media_file_id.0],
    )?;
    transaction.execute(
        "INSERT INTO media_copies (media_file_id, file_name, size_bytes, stored_at_ms) VALUES (?1, ?2, ?3, ?4)",
        params![
            copy.media_file_id.0,
            copy.file_name,
            to_stored_integer(copy.size_bytes),
            to_stored_integer(copy.stored_at_ms)
        ],
    )?;
    choose_upload(&transaction, &copy.media_file_id, true)?;
    let stored = stored_copy(&transaction, &copy.media_file_id)?
        .ok_or_else(|| StorageError::MediaFileNotFound(copy.media_file_id.0.clone()))?;
    transaction.commit()?;
    Ok(stored)
}

pub fn get_media_copy(
    conn: &Connection,
    media_file_id: &MediaFileId,
) -> Result<Option<MediaCopy>, StorageError> {
    Ok(conn
        .query_row(
            "SELECT file_name, size_bytes, stored_at_ms FROM media_copies WHERE media_file_id = ?1",
            params![media_file_id.0],
            |row| {
                Ok(MediaCopy {
                    file_name: row.get(0)?,
                    size_bytes: read_unsigned(row, 1)?,
                    stored_at_ms: read_unsigned(row, 2)?,
                })
            },
        )
        .optional()?)
}

/// Removes the record of a copy and returns the name of its file, which is also listed as released.
pub fn remove_media_copy(
    conn: &Connection,
    media_file_id: &MediaFileId,
) -> Result<Option<String>, StorageError> {
    let file_name = get_media_copy(conn, media_file_id)?.map(|copy| copy.file_name);
    conn.execute(
        "DELETE FROM media_copies WHERE media_file_id = ?1",
        params![media_file_id.0],
    )?;
    Ok(file_name)
}

const STORED_COPY_COLUMNS: &str = "c.media_file_id, m.project_id, p.name, m.name, c.size_bytes, c.stored_at_ms \
     FROM media_copies c JOIN media_files m ON m.id = c.media_file_id JOIN projects p ON p.id = m.project_id";

/// Lists the owner's copies, largest first.
pub fn list_media_copies(
    conn: &Connection,
    owner: &OwnerId,
) -> Result<Vec<StoredCopy>, StorageError> {
    let mut statement = conn.prepare(&format!(
        "SELECT {STORED_COPY_COLUMNS} WHERE p.owner_id = ?1 ORDER BY c.size_bytes DESC, m.name"
    ))?;
    let copies = statement
        .query_map(params![owner.0], read_stored_copy)?
        .collect::<Result<_, _>>()?;
    Ok(copies)
}

/// How many bytes the owner's copies take.
pub fn media_copies_size(conn: &Connection, owner: &OwnerId) -> Result<u64, StorageError> {
    size_without(conn, owner, &MediaFileId(String::new()))
}

/// Records the person's choice whether to keep a copy of the media file on a server, and returns the media file.
/// Turning the choice off removes this server's copy, whose file is then listed as released.
pub fn set_upload_choice(
    conn: &Connection,
    media_file_id: &MediaFileId,
    is_upload_chosen: bool,
) -> Result<MediaFile, StorageError> {
    get_media_file(conn, media_file_id)?;
    choose_upload(conn, media_file_id, is_upload_chosen)?;
    get_media_file(conn, media_file_id)
}

/// Takes the names of the files whose copies are gone, for the caller to delete.
pub fn take_released_copy_files(conn: &mut Connection) -> Result<Vec<String>, StorageError> {
    let transaction = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let names = {
        let mut statement = transaction
            .prepare("SELECT file_name FROM released_media_copies ORDER BY file_name")?;
        statement
            .query_map([], |row| row.get(0))?
            .collect::<Result<Vec<String>, _>>()?
    };
    transaction.execute("DELETE FROM released_media_copies", [])?;
    transaction.commit()?;
    Ok(names)
}

/// Changes the choice only when it differs, so that an unchanged choice records no change for syncing.
fn choose_upload(
    conn: &Connection,
    media_file_id: &MediaFileId,
    is_upload_chosen: bool,
) -> Result<(), StorageError> {
    conn.execute(
        "UPDATE media_files SET is_upload_chosen = ?2 WHERE id = ?1 AND is_upload_chosen <> ?2",
        params![media_file_id.0, is_upload_chosen],
    )?;
    Ok(())
}

fn stored_copy(
    conn: &Connection,
    media_file_id: &MediaFileId,
) -> Result<Option<StoredCopy>, StorageError> {
    Ok(conn
        .query_row(
            &format!("SELECT {STORED_COPY_COLUMNS} WHERE c.media_file_id = ?1"),
            params![media_file_id.0],
            read_stored_copy,
        )
        .optional()?)
}

fn read_stored_copy(row: &Row) -> rusqlite::Result<StoredCopy> {
    Ok(StoredCopy {
        media_file_id: MediaFileId(row.get(0)?),
        project_id: ProjectId(row.get(1)?),
        project_name: row.get(2)?,
        name: row.get(3)?,
        size_bytes: read_unsigned(row, 4)?,
        stored_at_ms: read_unsigned(row, 5)?,
    })
}

fn owner_of_project(conn: &Connection, project_id: &ProjectId) -> Result<OwnerId, StorageError> {
    conn.query_row(
        "SELECT owner_id FROM projects WHERE id = ?1",
        params![project_id.0],
        |row| Ok(OwnerId(row.get(0)?)),
    )
    .optional()?
    .ok_or_else(|| StorageError::ProjectNotFound(project_id.0.clone()))
}

/// The bytes the owner's copies take, leaving out the copy of one media file.
fn size_without(
    conn: &Connection,
    owner: &OwnerId,
    left_out: &MediaFileId,
) -> Result<u64, StorageError> {
    Ok(conn.query_row(
        "SELECT COALESCE(SUM(c.size_bytes), 0) FROM media_copies c \
         JOIN media_files m ON m.id = c.media_file_id JOIN projects p ON p.id = m.project_id \
         WHERE p.owner_id = ?1 AND c.media_file_id <> ?2",
        params![owner.0, left_out.0],
        |row| read_unsigned(row, 0),
    )?)
}

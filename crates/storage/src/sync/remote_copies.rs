//! The media bytes a remote is known to hold for this server.

use easyimmerse_core::media_file::MediaFileId;
use rusqlite::{Connection, OptionalExtension, params};

use crate::error::StorageError;
use crate::stored_integer::{read_unsigned, to_stored_integer};

/// Records that the remote holds the media file's bytes, after an upload or a download.
pub fn record_remote_copy(
    conn: &Connection,
    remote_id: &str,
    media_file_id: &MediaFileId,
    size_bytes: u64,
) -> Result<(), StorageError> {
    conn.execute(
        "INSERT INTO remote_copies (remote_id, media_file_id, size_bytes) VALUES (?1, ?2, ?3) \
         ON CONFLICT (remote_id, media_file_id) DO UPDATE SET size_bytes = excluded.size_bytes",
        params![remote_id, media_file_id.0, to_stored_integer(size_bytes)],
    )?;
    Ok(())
}

/// Forgets that the remote holds the media file's bytes, as when the person chose not to keep a copy there.
pub fn forget_remote_copy(
    conn: &Connection,
    remote_id: &str,
    media_file_id: &MediaFileId,
) -> Result<(), StorageError> {
    conn.execute(
        "DELETE FROM remote_copies WHERE remote_id = ?1 AND media_file_id = ?2",
        params![remote_id, media_file_id.0],
    )?;
    Ok(())
}

/// The size of the copy the remote holds of the media file, or None when it holds none.
pub fn remote_copy_size(
    conn: &Connection,
    remote_id: &str,
    media_file_id: &MediaFileId,
) -> Result<Option<u64>, StorageError> {
    Ok(conn
        .query_row(
            "SELECT size_bytes FROM remote_copies WHERE remote_id = ?1 AND media_file_id = ?2",
            params![remote_id, media_file_id.0],
            |row| read_unsigned(row, 0),
        )
        .optional()?)
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::media_file::MediaFileSource;

    use super::*;
    use crate::Storage;
    use crate::review_test_support::project;
    use crate::sync::sync_test_support::storage_with_remote;

    fn media(storage: &Storage) -> MediaFileId {
        let source = MediaFileSource::Path {
            path: "/media/clip.mp4".to_string(),
        };
        storage
            .add_media_file(&project(), "clip.mp4", &source)
            .unwrap()
            .id
    }

    #[test]
    fn knows_the_size_of_a_recorded_copy() {
        let (storage, remote) = storage_with_remote();
        let media = media(&storage);
        storage.record_remote_copy(&remote.id, &media, 42).unwrap();
        assert_eq!(
            storage.remote_copy_size(&remote.id, &media).unwrap(),
            Some(42)
        );
    }

    #[test]
    fn knows_of_no_copy_once_it_is_forgotten() {
        let (storage, remote) = storage_with_remote();
        let media = media(&storage);
        storage.record_remote_copy(&remote.id, &media, 42).unwrap();
        storage.forget_remote_copy(&remote.id, &media).unwrap();
        assert_eq!(storage.remote_copy_size(&remote.id, &media).unwrap(), None);
    }

    #[test]
    fn forgets_the_copy_of_a_deleted_media_file() {
        let (storage, remote) = storage_with_remote();
        let media = media(&storage);
        storage.record_remote_copy(&remote.id, &media, 42).unwrap();
        storage.remove_media_file(&media).unwrap();
        assert_eq!(storage.remote_copy_size(&remote.id, &media).unwrap(), None);
    }
}

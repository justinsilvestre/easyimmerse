use easyimmerse_core::dictionary::DictionaryMedia;
use rusqlite::{Connection, OptionalExtension, params};

use super::DictionaryId;
use crate::error::StorageError;

/// Returns a file stored with a dictionary, by the path its definitions use.
pub fn get_media(
    conn: &Connection,
    id: &DictionaryId,
    path: &str,
) -> Result<DictionaryMedia, StorageError> {
    conn.query_row(
        "SELECT m.media_type, m.bytes
         FROM dictionary_media m JOIN dictionaries d ON d.number = m.dictionary_number
         WHERE d.id = ?1 AND m.path = ?2",
        params![id.0, path],
        |row| {
            Ok(DictionaryMedia {
                path: path.to_string(),
                media_type: row.get(0)?,
                bytes: row.get(1)?,
            })
        },
    )
    .optional()?
    .ok_or_else(|| StorageError::DictionaryMediaNotFound {
        dictionary_id: id.0.clone(),
        path: path.to_string(),
    })
}

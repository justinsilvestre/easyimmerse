use easyimmerse_core::dictionary::DictionaryMetadata;
use rusqlite::{Connection, OptionalExtension, Row, params};

use super::columns::{get_enum, get_optional_enum, get_unsigned};
use super::{DictionaryCounts, DictionaryId, StoredDictionary};
use crate::error::StorageError;

const STORED_DICTIONARY_COLUMNS: &str = "id, title, revision, format, description, author,
    attribution, url, source_language, target_language, frequency_mode, stylesheet, imported_at,
    entry_count, term_meta_count, tag_count, kanji_count, kanji_meta_count, media_count";

/// Lists every stored dictionary in the order they were imported.
pub fn list_dictionaries(conn: &Connection) -> Result<Vec<StoredDictionary>, StorageError> {
    let mut statement = conn.prepare(&format!(
        "SELECT {STORED_DICTIONARY_COLUMNS} FROM dictionaries ORDER BY number"
    ))?;
    let dictionaries = statement
        .query_map([], read_stored_dictionary)?
        .collect::<Result<_, _>>()?;
    Ok(dictionaries)
}

pub fn get_dictionary(
    conn: &Connection,
    id: &DictionaryId,
) -> Result<StoredDictionary, StorageError> {
    conn.query_row(
        &format!("SELECT {STORED_DICTIONARY_COLUMNS} FROM dictionaries WHERE id = ?1"),
        params![id.0],
        read_stored_dictionary,
    )
    .optional()?
    .ok_or_else(|| StorageError::DictionaryNotFound(id.0.clone()))
}

/// Deletes a dictionary with everything it stored.
pub fn delete_dictionary(conn: &Connection, id: &DictionaryId) -> Result<(), StorageError> {
    match conn.execute("DELETE FROM dictionaries WHERE id = ?1", params![id.0])? {
        0 => Err(StorageError::DictionaryNotFound(id.0.clone())),
        _ => Ok(()),
    }
}

fn read_stored_dictionary(row: &Row) -> rusqlite::Result<StoredDictionary> {
    Ok(StoredDictionary {
        id: DictionaryId(row.get(0)?),
        metadata: DictionaryMetadata {
            title: row.get(1)?,
            revision: row.get(2)?,
            format: get_enum(row, 3)?,
            description: row.get(4)?,
            author: row.get(5)?,
            attribution: row.get(6)?,
            url: row.get(7)?,
            source_language: row.get(8)?,
            target_language: row.get(9)?,
            frequency_mode: get_optional_enum(row, 10)?,
            stylesheet: row.get(11)?,
        },
        imported_at: get_unsigned(row, 12)?,
        counts: DictionaryCounts {
            entries: get_unsigned(row, 13)?,
            term_meta: get_unsigned(row, 14)?,
            tags: get_unsigned(row, 15)?,
            kanji: get_unsigned(row, 16)?,
            kanji_meta: get_unsigned(row, 17)?,
            media: get_unsigned(row, 18)?,
        },
    })
}

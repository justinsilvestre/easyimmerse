use easyimmerse_core::dictionary::{Dictionary, DictionaryFileFormat, TermEntry};
use rusqlite::{Connection, OptionalExtension, Row, Transaction, params};

use crate::error::StorageError;
use crate::stored_values::{enum_from_text, enum_to_text, random_id, read_unsigned};

const DICTIONARY_COLUMNS: &str = "d.id, d.title, \
     (SELECT COUNT(*) FROM dictionary_entries e WHERE e.dictionary_id = d.id), \
     d.format, d.source_language, d.target_language, d.is_enabled";

/// The identifier of a stored dictionary: 16 random bytes, hex encoded.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct DictionaryId(pub String);

/// A dictionary as listed, without its entries.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StoredDictionary {
    pub id: DictionaryId,
    pub title: String,
    pub entry_count: u64,
    pub format: DictionaryFileFormat,
    pub source_language: String,
    pub target_language: String,
    pub is_enabled: bool,
}

/// The languages a dictionary is stored under, which the file or the user states.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DictionaryLanguages {
    pub source_language: String,
    pub target_language: String,
}

/// Which neighbour a dictionary trades places with.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MoveDirection {
    Up,
    Down,
}

/// Stores a parsed dictionary and all of its entries in one transaction, enabled and placed
/// after the other dictionaries of its source language.
pub fn insert_dictionary(
    conn: &mut Connection,
    dictionary: &Dictionary,
    languages: &DictionaryLanguages,
) -> Result<StoredDictionary, StorageError> {
    let id = DictionaryId(random_id());
    let transaction = conn.transaction()?;
    transaction.execute(
        "INSERT INTO dictionaries (id, title, revision, format, source_language, target_language, position) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, \
             (SELECT COALESCE(MAX(position) + 1, 0) FROM dictionaries WHERE source_language = ?5))",
        params![
            id.0,
            dictionary.title,
            dictionary.revision,
            enum_to_text(&dictionary.format)?,
            languages.source_language,
            languages.target_language,
        ],
    )?;
    insert_entries(&transaction, &id, &dictionary.entries)?;
    let stored = get_dictionary(&transaction, &id)?;
    transaction.commit()?;
    Ok(stored)
}

fn insert_entries(
    transaction: &Transaction,
    id: &DictionaryId,
    entries: &[TermEntry],
) -> Result<(), StorageError> {
    let mut statement = transaction.prepare(
        "INSERT INTO dictionary_entries (dictionary_id, term, reading, definitions_json, tags_json)
         VALUES (?1, ?2, ?3, ?4, ?5)",
    )?;
    for entry in entries {
        let definitions = serde_json::to_string(&entry.definitions)?;
        let tags = serde_json::to_string(&entry.tags)?;
        statement.execute(params![id.0, entry.term, entry.reading, definitions, tags])?;
    }
    Ok(())
}

/// Lists every stored dictionary by source language, then by position.
pub fn list_dictionaries(conn: &Connection) -> Result<Vec<StoredDictionary>, StorageError> {
    let mut statement = conn.prepare(&format!(
        "SELECT {DICTIONARY_COLUMNS} FROM dictionaries d ORDER BY d.source_language, d.position"
    ))?;
    let rows = statement.query_map([], read_dictionary_row)?;
    rows.map(|row| row?.into_stored_dictionary()).collect()
}

pub fn get_dictionary(
    conn: &Connection,
    id: &DictionaryId,
) -> Result<StoredDictionary, StorageError> {
    conn.query_row(
        &format!("SELECT {DICTIONARY_COLUMNS} FROM dictionaries d WHERE d.id = ?1"),
        params![id.0],
        read_dictionary_row,
    )
    .optional()?
    .ok_or_else(|| StorageError::DictionaryNotFound(id.0.clone()))?
    .into_stored_dictionary()
}

pub fn set_dictionary_enabled(
    conn: &Connection,
    id: &DictionaryId,
    is_enabled: bool,
) -> Result<StoredDictionary, StorageError> {
    let updated = conn.execute(
        "UPDATE dictionaries SET is_enabled = ?2 WHERE id = ?1",
        params![id.0, is_enabled],
    )?;
    ensure_one_row_changed(updated, id)?;
    get_dictionary(conn, id)
}

/// Swaps a dictionary's position with that of its nearest neighbour of the same source
/// language in the given direction. Does nothing when there is no such neighbour.
pub fn move_dictionary(
    conn: &mut Connection,
    id: &DictionaryId,
    direction: MoveDirection,
) -> Result<(), StorageError> {
    let transaction = conn.transaction()?;
    let (language, position) = read_position(&transaction, id)?;
    if let Some((neighbour_id, neighbour_position)) =
        find_neighbour(&transaction, &language, position, direction)?
    {
        set_position(&transaction, &neighbour_id, position)?;
        set_position(&transaction, &id.0, neighbour_position)?;
    }
    transaction.commit()?;
    Ok(())
}

fn read_position(conn: &Connection, id: &DictionaryId) -> Result<(String, i64), StorageError> {
    conn.query_row(
        "SELECT source_language, position FROM dictionaries WHERE id = ?1",
        params![id.0],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )
    .optional()?
    .ok_or_else(|| StorageError::DictionaryNotFound(id.0.clone()))
}

fn find_neighbour(
    conn: &Connection,
    language: &str,
    position: i64,
    direction: MoveDirection,
) -> Result<Option<(String, i64)>, StorageError> {
    let sql = match direction {
        MoveDirection::Up => {
            "SELECT id, position FROM dictionaries WHERE source_language = ?1 AND position < ?2 \
             ORDER BY position DESC LIMIT 1"
        }
        MoveDirection::Down => {
            "SELECT id, position FROM dictionaries WHERE source_language = ?1 AND position > ?2 \
             ORDER BY position LIMIT 1"
        }
    };
    Ok(conn
        .query_row(sql, params![language, position], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })
        .optional()?)
}

fn set_position(conn: &Connection, id: &str, position: i64) -> Result<(), StorageError> {
    conn.execute(
        "UPDATE dictionaries SET position = ?2 WHERE id = ?1",
        params![id, position],
    )?;
    Ok(())
}

pub fn delete_dictionary(conn: &Connection, id: &DictionaryId) -> Result<(), StorageError> {
    let deleted = conn.execute("DELETE FROM dictionaries WHERE id = ?1", params![id.0])?;
    ensure_one_row_changed(deleted, id)
}

fn ensure_one_row_changed(changed: usize, id: &DictionaryId) -> Result<(), StorageError> {
    if changed == 0 {
        Err(StorageError::DictionaryNotFound(id.0.clone()))
    } else {
        Ok(())
    }
}

/// One dictionary row with its format still unparsed, so that the row callback stays within
/// rusqlite's error type.
struct DictionaryRow {
    id: String,
    title: String,
    entry_count: u64,
    format: String,
    source_language: String,
    target_language: String,
    is_enabled: bool,
}

impl DictionaryRow {
    fn into_stored_dictionary(self) -> Result<StoredDictionary, StorageError> {
        Ok(StoredDictionary {
            id: DictionaryId(self.id),
            title: self.title,
            entry_count: self.entry_count,
            format: enum_from_text(self.format)?,
            source_language: self.source_language,
            target_language: self.target_language,
            is_enabled: self.is_enabled,
        })
    }
}

fn read_dictionary_row(row: &Row) -> rusqlite::Result<DictionaryRow> {
    Ok(DictionaryRow {
        id: row.get(0)?,
        title: row.get(1)?,
        entry_count: read_unsigned(row, 2)?,
        format: row.get(3)?,
        source_language: row.get(4)?,
        target_language: row.get(5)?,
        is_enabled: row.get(6)?,
    })
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use easyimmerse_core::dictionary::parse_dictionary;

    use super::*;
    use crate::Storage;

    fn fixture_dictionary() -> Dictionary {
        let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/sample-yomitan.zip");
        parse_dictionary(&std::fs::read(path).unwrap()).unwrap()
    }

    fn languages(source_language: &str) -> DictionaryLanguages {
        DictionaryLanguages {
            source_language: source_language.to_string(),
            target_language: "en".to_string(),
        }
    }

    fn insert(storage: &Storage, source_language: &str) -> DictionaryId {
        storage
            .insert_dictionary(&fixture_dictionary(), &languages(source_language))
            .unwrap()
            .id
    }

    fn listed_ids(storage: &Storage) -> Vec<DictionaryId> {
        storage
            .list_dictionaries()
            .unwrap()
            .into_iter()
            .map(|dictionary| dictionary.id)
            .collect()
    }

    #[test]
    fn lists_the_imported_dictionary_with_its_entry_count() {
        let storage = Storage::open_in_memory().unwrap();
        let id = insert(&storage, "ja");
        assert_eq!(
            storage.list_dictionaries().unwrap(),
            vec![StoredDictionary {
                id,
                title: "Sample Dictionary".to_string(),
                entry_count: 3,
                format: DictionaryFileFormat::Yomitan,
                source_language: "ja".to_string(),
                target_language: "en".to_string(),
                is_enabled: true,
            }]
        );
    }

    #[test]
    fn lists_by_source_language_then_position() {
        let storage = Storage::open_in_memory().unwrap();
        let first_ja = insert(&storage, "ja");
        let es = insert(&storage, "es");
        let second_ja = insert(&storage, "ja");
        assert_eq!(listed_ids(&storage), vec![es, first_ja, second_ja]);
    }

    #[test]
    fn disables_a_dictionary() {
        let storage = Storage::open_in_memory().unwrap();
        let id = insert(&storage, "ja");
        let updated = storage.set_dictionary_enabled(&id, false).unwrap();
        assert!(!updated.is_enabled);
    }

    #[test]
    fn moves_a_dictionary_up_past_its_neighbour() {
        let storage = Storage::open_in_memory().unwrap();
        let first = insert(&storage, "ja");
        let second = insert(&storage, "ja");
        storage.move_dictionary(&second, MoveDirection::Up).unwrap();
        assert_eq!(listed_ids(&storage), vec![second, first]);
    }

    #[test]
    fn moves_past_dictionaries_of_other_languages() {
        let storage = Storage::open_in_memory().unwrap();
        let first = insert(&storage, "ja");
        insert(&storage, "es");
        let second = insert(&storage, "ja");
        storage
            .move_dictionary(&first, MoveDirection::Down)
            .unwrap();
        let japanese: Vec<_> = storage
            .list_dictionaries()
            .unwrap()
            .into_iter()
            .filter(|dictionary| dictionary.source_language == "ja")
            .map(|dictionary| dictionary.id)
            .collect();
        assert_eq!(japanese, vec![second, first]);
    }

    #[test]
    fn moving_the_first_dictionary_up_does_nothing() {
        let storage = Storage::open_in_memory().unwrap();
        let first = insert(&storage, "ja");
        let second = insert(&storage, "ja");
        storage.move_dictionary(&first, MoveDirection::Up).unwrap();
        assert_eq!(listed_ids(&storage), vec![first, second]);
    }

    #[test]
    fn moving_an_unknown_dictionary_fails() {
        let storage = Storage::open_in_memory().unwrap();
        let result =
            storage.move_dictionary(&DictionaryId("missing".to_string()), MoveDirection::Up);
        assert!(matches!(result, Err(StorageError::DictionaryNotFound(_))));
    }

    #[test]
    fn deletes_a_dictionary() {
        let storage = Storage::open_in_memory().unwrap();
        let id = insert(&storage, "ja");
        storage.delete_dictionary(&id).unwrap();
        assert_eq!(listed_ids(&storage), vec![]);
    }

    #[test]
    fn deleting_an_unknown_dictionary_fails() {
        let storage = Storage::open_in_memory().unwrap();
        let result = storage.delete_dictionary(&DictionaryId("missing".to_string()));
        assert!(matches!(result, Err(StorageError::DictionaryNotFound(_))));
    }
}

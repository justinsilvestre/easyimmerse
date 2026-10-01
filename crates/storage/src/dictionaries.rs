use rusqlite::{Connection, OptionalExtension, params};

use crate::dictionary_terms_table::drop_terms_table;
use crate::error::{StorageError, require_changed_row};
use crate::ids::generate_id;

/// The identifier of a stored dictionary: 16 random bytes, hex encoded.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct DictionaryId(pub String);

impl DictionaryId {
    pub fn generate() -> Self {
        Self(generate_id())
    }
}

/// A dictionary as listed, without its entries.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StoredDictionary {
    pub id: DictionaryId,
    pub title: String,
    pub entry_count: u64,
    /// The language of the headwords, as an ISO 639 code, when known.
    pub source_language: Option<String>,
    /// The language of the definitions, as an ISO 639 code, when known.
    pub target_language: Option<String>,
}

const STORED_DICTIONARY_SELECT: &str =
    "SELECT id, title, entry_count, source_language, target_language FROM dictionaries";

/// Lists every stored dictionary in the order they were imported.
pub fn list_dictionaries(conn: &Connection) -> Result<Vec<StoredDictionary>, StorageError> {
    let mut statement = conn.prepare_cached(&format!(
        "{STORED_DICTIONARY_SELECT} WHERE complete = 1 ORDER BY rowid"
    ))?;
    let dictionaries = statement
        .query_map([], read_stored_dictionary)?
        .collect::<Result<_, _>>()?;
    Ok(dictionaries)
}

/// Fails with `DictionaryNotFound` when no dictionary has the id.
pub fn get_dictionary(
    conn: &Connection,
    id: &DictionaryId,
) -> Result<StoredDictionary, StorageError> {
    conn.query_row(
        &format!("{STORED_DICTIONARY_SELECT} WHERE id = ?1 AND complete = 1"),
        params![id.0],
        read_stored_dictionary,
    )
    .optional()?
    .ok_or_else(|| StorageError::DictionaryNotFound(id.0.clone()))
}

fn read_stored_dictionary(row: &rusqlite::Row) -> rusqlite::Result<StoredDictionary> {
    Ok(StoredDictionary {
        id: DictionaryId(row.get(0)?),
        title: row.get(1)?,
        entry_count: row.get(2)?,
        source_language: row.get(3)?,
        target_language: row.get(4)?,
    })
}

/// Records which languages a dictionary translates between, replacing what its archive stated.
pub fn set_dictionary_languages(
    conn: &Connection,
    id: &DictionaryId,
    source_language: Option<&str>,
    target_language: Option<&str>,
) -> Result<StoredDictionary, StorageError> {
    let changed = conn.execute(
        "UPDATE dictionaries SET source_language = ?2, target_language = ?3
         WHERE id = ?1 AND complete = 1",
        params![id.0, source_language, target_language],
    )?;
    require_changed_row(changed, StorageError::DictionaryNotFound(id.0.clone()))?;
    get_dictionary(conn, id)
}

/// Deletes a dictionary together with its terms, glossaries, and assets.
pub fn delete_dictionary(conn: &Connection, id: &DictionaryId) -> Result<(), StorageError> {
    let transaction = conn.unchecked_transaction()?;
    let changed = transaction.execute("DELETE FROM dictionaries WHERE id = ?1", params![id.0])?;
    require_changed_row(changed, StorageError::DictionaryNotFound(id.0.clone()))?;
    drop_terms_table(&transaction, id)?;
    transaction.commit()?;
    Ok(())
}

/// Fails with `DictionaryNotFound` when no dictionary has the id.
pub fn ensure_dictionary_exists(conn: &Connection, id: &DictionaryId) -> Result<(), StorageError> {
    conn.query_row(
        "SELECT 1 FROM dictionaries WHERE id = ?1 AND complete = 1",
        params![id.0],
        |_| Ok(()),
    )
    .optional()?
    .ok_or_else(|| StorageError::DictionaryNotFound(id.0.clone()))
}

/// Deletes the dictionaries whose import never finished, such as one interrupted by a crash.
pub fn delete_incomplete_dictionaries(conn: &Connection) -> Result<(), StorageError> {
    let ids: Vec<String> = conn
        .prepare("SELECT id FROM dictionaries WHERE complete = 0")?
        .query_map([], |row| row.get(0))?
        .collect::<Result<_, _>>()?;
    for id in ids {
        delete_dictionary(conn, &DictionaryId(id))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Storage;
    use crate::test_support::{count_rows, parse_dictionary_fixture};

    fn storage_with_fixture() -> (Storage, DictionaryId) {
        let storage = Storage::open_in_memory().unwrap();
        let id = storage
            .insert_dictionary(&parse_dictionary_fixture("sample-yomitan.zip"))
            .unwrap();
        (storage, id)
    }

    /// Stores both fixtures and returns the id of the English-German one.
    fn storage_with_both_fixtures() -> (Storage, DictionaryId) {
        let (storage, _) = storage_with_fixture();
        let id = storage
            .insert_dictionary(&parse_dictionary_fixture("sample-yomitan-en.zip"))
            .unwrap();
        (storage, id)
    }

    fn missing() -> DictionaryId {
        DictionaryId("missing".to_string())
    }

    #[test]
    fn lists_the_imported_dictionary_with_its_entry_count() {
        let (storage, id) = storage_with_fixture();
        assert_eq!(
            storage.list_dictionaries().unwrap(),
            vec![StoredDictionary {
                id,
                title: "Sample Dictionary".to_string(),
                entry_count: 3,
                source_language: None,
                target_language: None,
            }]
        );
    }

    #[test]
    fn keeps_the_languages_the_archive_states() {
        let (storage, id) = storage_with_both_fixtures();
        let stored = storage.get_dictionary(&id).unwrap();
        assert_eq!(
            (stored.source_language, stored.target_language),
            (Some("en".to_string()), Some("de".to_string()))
        );
    }

    #[test]
    fn getting_an_unknown_dictionary_fails() {
        let (storage, _) = storage_with_fixture();
        assert!(matches!(
            storage.get_dictionary(&missing()),
            Err(StorageError::DictionaryNotFound(_))
        ));
    }

    #[test]
    fn sets_the_languages_of_a_dictionary() {
        let (storage, id) = storage_with_fixture();
        let stored = storage
            .set_dictionary_languages(&id, Some("ja"), Some("en"))
            .unwrap();
        assert_eq!(stored.source_language, Some("ja".to_string()));
    }

    #[test]
    fn setting_the_languages_of_an_unknown_dictionary_fails() {
        let (storage, _) = storage_with_fixture();
        assert!(matches!(
            storage.set_dictionary_languages(&missing(), None, None),
            Err(StorageError::DictionaryNotFound(_))
        ));
    }

    #[test]
    fn deletes_a_dictionary() {
        let (storage, id) = storage_with_fixture();
        storage.delete_dictionary(&id).unwrap();
        assert!(storage.list_dictionaries().unwrap().is_empty());
    }

    #[test]
    fn deleting_a_dictionary_deletes_its_glossaries() {
        let (storage, id) = storage_with_fixture();
        storage.delete_dictionary(&id).unwrap();
        assert_eq!(count_rows(&storage, "dictionary_glossary_blocks"), 0);
    }

    #[test]
    fn deleting_a_dictionary_drops_its_terms_table() {
        let (storage, id) = storage_with_fixture();
        storage.delete_dictionary(&id).unwrap();
        assert_eq!(count_terms_tables(&storage), 0);
    }

    #[test]
    fn opening_the_database_deletes_an_unfinished_import() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("test.sqlite");
        let (storage, id) = (Storage::open(&path).unwrap(), DictionaryId::generate());
        storage
            .with_connection(|conn| {
                conn.execute(
                    "INSERT INTO dictionaries (id, title, complete) VALUES (?1, 't', 0)",
                    params![id.0],
                )?;
                Ok(())
            })
            .unwrap();
        drop(storage);
        let reopened = Storage::open(&path).unwrap();
        assert_eq!(count_rows(&reopened, "dictionaries"), 0);
    }

    fn count_terms_tables(storage: &Storage) -> i64 {
        storage
            .with_connection(|conn| {
                Ok(conn.query_row(
                    "SELECT COUNT(*) FROM sqlite_schema
                     WHERE type = 'table' AND name LIKE 'dictionary_terms_%'",
                    [],
                    |row| row.get(0),
                )?)
            })
            .unwrap()
    }

    #[test]
    fn deleting_an_unknown_dictionary_fails() {
        let (storage, _) = storage_with_fixture();
        assert!(matches!(
            storage.delete_dictionary(&missing()),
            Err(StorageError::DictionaryNotFound(_))
        ));
    }
}

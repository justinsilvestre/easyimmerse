use easyimmerse_core::dictionary::{Dictionary, TermEntry};
use rusqlite::{Connection, OptionalExtension, Transaction, params};

use crate::error::StorageError;

/// The identifier of a stored dictionary: 16 random bytes, hex encoded.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct DictionaryId(pub String);

impl DictionaryId {
    pub fn generate() -> Self {
        Self(crate::new_row::generate_id())
    }
}

/// A dictionary as listed, without its entries.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StoredDictionary {
    pub id: DictionaryId,
    pub title: String,
    pub entry_count: u64,
}

/// Stores a parsed dictionary and all of its entries in one transaction.
pub fn insert_dictionary(
    conn: &mut Connection,
    dictionary: &Dictionary,
) -> Result<DictionaryId, StorageError> {
    let id = DictionaryId::generate();
    let transaction = conn.transaction()?;
    transaction.execute(
        "INSERT INTO dictionaries (id, title, revision) VALUES (?1, ?2, ?3)",
        params![id.0, dictionary.title, dictionary.revision],
    )?;
    insert_entries(&transaction, &id, &dictionary.entries)?;
    transaction.commit()?;
    Ok(id)
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

/// Lists every stored dictionary in the order they were imported.
pub fn list_dictionaries(conn: &Connection) -> Result<Vec<StoredDictionary>, StorageError> {
    let mut statement = conn.prepare(
        "SELECT d.id, d.title, COUNT(e.id)
         FROM dictionaries d LEFT JOIN dictionary_entries e ON e.dictionary_id = d.id
         GROUP BY d.id ORDER BY d.rowid",
    )?;
    let dictionaries = statement
        .query_map([], |row| {
            Ok(StoredDictionary {
                id: DictionaryId(row.get(0)?),
                title: row.get(1)?,
                entry_count: count_from_row(row.get(2)?),
            })
        })?
        .collect::<Result<_, _>>()?;
    Ok(dictionaries)
}

/// SQLite counts are signed; a count is never negative, so the conversion cannot fail.
fn count_from_row(count: i64) -> u64 {
    u64::try_from(count).unwrap_or(0)
}

/// Returns the entries of one dictionary whose term or reading equals `term` exactly.
/// Fails with `DictionaryNotFound` when no dictionary has the id.
pub fn lookup_term(
    conn: &Connection,
    id: &DictionaryId,
    term: &str,
) -> Result<Vec<TermEntry>, StorageError> {
    ensure_dictionary_exists(conn, id)?;
    let mut statement = conn.prepare(
        "SELECT term, reading, definitions_json, tags_json FROM dictionary_entries
         WHERE dictionary_id = ?1 AND (term = ?2 OR reading = ?2) ORDER BY id",
    )?;
    let rows = statement.query_map(params![id.0, term], read_entry_row)?;
    rows.map(|row| row?.into_term_entry()).collect()
}

fn ensure_dictionary_exists(conn: &Connection, id: &DictionaryId) -> Result<(), StorageError> {
    conn.query_row(
        "SELECT 1 FROM dictionaries WHERE id = ?1",
        params![id.0],
        |_| Ok(()),
    )
    .optional()?
    .ok_or_else(|| StorageError::DictionaryNotFound(id.0.clone()))
}

/// One entry row with its JSON columns still unparsed, so that the row callback stays
/// within rusqlite's error type.
struct EntryRow {
    term: String,
    reading: Option<String>,
    definitions_json: String,
    tags_json: String,
}

impl EntryRow {
    fn into_term_entry(self) -> Result<TermEntry, StorageError> {
        Ok(TermEntry {
            term: self.term,
            reading: self.reading,
            definitions: serde_json::from_str(&self.definitions_json)?,
            tags: serde_json::from_str(&self.tags_json)?,
        })
    }
}

fn read_entry_row(row: &rusqlite::Row) -> rusqlite::Result<EntryRow> {
    Ok(EntryRow {
        term: row.get(0)?,
        reading: row.get(1)?,
        definitions_json: row.get(2)?,
        tags_json: row.get(3)?,
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

    fn storage_with_fixture() -> (Storage, DictionaryId) {
        let storage = Storage::open_in_memory().unwrap();
        let id = storage.insert_dictionary(&fixture_dictionary()).unwrap();
        (storage, id)
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
            }]
        );
    }

    #[test]
    fn finds_an_entry_by_term() {
        let (storage, id) = storage_with_fixture();
        let entries = storage.lookup_term(&id, "猫").unwrap();
        assert_eq!(entries[0].definitions, vec!["cat".to_string()]);
    }

    #[test]
    fn finds_an_entry_by_reading() {
        let (storage, id) = storage_with_fixture();
        let entries = storage.lookup_term(&id, "たべる").unwrap();
        assert_eq!(entries[0].term, "食べる");
    }

    #[test]
    fn finds_nothing_for_an_unknown_term() {
        let (storage, id) = storage_with_fixture();
        assert!(storage.lookup_term(&id, "鳥").unwrap().is_empty());
    }

    #[test]
    fn fails_for_an_unknown_dictionary() {
        let (storage, _) = storage_with_fixture();
        let result = storage.lookup_term(&DictionaryId("missing".to_string()), "猫");
        assert!(matches!(result, Err(StorageError::DictionaryNotFound(_))));
    }

    #[test]
    fn round_trips_the_tags() {
        let (storage, id) = storage_with_fixture();
        let entries = storage.lookup_term(&id, "猫").unwrap();
        assert_eq!(entries[0].tags, fixture_dictionary().entries[0].tags);
    }
}

use easyimmerse_core::dictionary::{Dictionary, TermEntry};
use rusqlite::{Connection, OptionalExtension, Transaction, params};

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
    "SELECT d.id, d.title, COUNT(e.id), d.source_language, d.target_language
     FROM dictionaries d LEFT JOIN dictionary_entries e ON e.dictionary_id = d.id";

/// Stores a parsed dictionary and all of its entries in one transaction.
pub fn insert_dictionary(
    conn: &mut Connection,
    dictionary: &Dictionary,
) -> Result<DictionaryId, StorageError> {
    let id = DictionaryId::generate();
    let transaction = conn.transaction()?;
    transaction.execute(
        "INSERT INTO dictionaries (id, title, revision, source_language, target_language)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            id.0,
            dictionary.title,
            dictionary.revision,
            dictionary.source_language,
            dictionary.target_language
        ],
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
    let mut statement = conn.prepare(&format!(
        "{STORED_DICTIONARY_SELECT} GROUP BY d.id ORDER BY d.rowid"
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
        &format!("{STORED_DICTIONARY_SELECT} WHERE d.id = ?1 GROUP BY d.id"),
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
        entry_count: count_from_row(row.get(2)?),
        source_language: row.get(3)?,
        target_language: row.get(4)?,
    })
}

/// Records which languages a dictionary translates between, replacing what its archive
/// stated.
pub fn set_dictionary_languages(
    conn: &Connection,
    id: &DictionaryId,
    source_language: Option<&str>,
    target_language: Option<&str>,
) -> Result<StoredDictionary, StorageError> {
    let changed = conn.execute(
        "UPDATE dictionaries SET source_language = ?2, target_language = ?3 WHERE id = ?1",
        params![id.0, source_language, target_language],
    )?;
    require_changed_row(changed, StorageError::DictionaryNotFound(id.0.clone()))?;
    get_dictionary(conn, id)
}

/// Deletes a dictionary together with its entries.
pub fn delete_dictionary(conn: &Connection, id: &DictionaryId) -> Result<(), StorageError> {
    let changed = conn.execute("DELETE FROM dictionaries WHERE id = ?1", params![id.0])?;
    require_changed_row(changed, StorageError::DictionaryNotFound(id.0.clone()))
}

/// Looks the term up in every dictionary, in import order, and returns only the
/// dictionaries that have a matching entry.
pub fn lookup_term_everywhere(
    conn: &Connection,
    term: &str,
) -> Result<Vec<(StoredDictionary, Vec<TermEntry>)>, StorageError> {
    let mut results = Vec::new();
    for dictionary in list_dictionaries(conn)? {
        let entries = lookup_term(conn, &dictionary.id, term)?;
        if !entries.is_empty() {
            results.push((dictionary, entries));
        }
    }
    Ok(results)
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
    use crate::test_support::count_rows;

    fn parse_fixture(name: &str) -> Dictionary {
        let path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../fixtures")
            .join(name);
        parse_dictionary(&std::fs::read(path).unwrap()).unwrap()
    }

    fn fixture_dictionary() -> Dictionary {
        parse_fixture("sample-yomitan.zip")
    }

    fn storage_with_fixture() -> (Storage, DictionaryId) {
        let storage = Storage::open_in_memory().unwrap();
        let id = storage.insert_dictionary(&fixture_dictionary()).unwrap();
        (storage, id)
    }

    /// Stores both fixtures and returns the id of the English-German one.
    fn storage_with_both_fixtures() -> (Storage, DictionaryId) {
        let (storage, _) = storage_with_fixture();
        let id = storage
            .insert_dictionary(&parse_fixture("sample-yomitan-en.zip"))
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
    fn deleting_a_dictionary_deletes_its_entries() {
        let (storage, id) = storage_with_fixture();
        storage.delete_dictionary(&id).unwrap();
        assert_eq!(count_rows(&storage, "dictionary_entries"), 0);
    }

    #[test]
    fn deleting_an_unknown_dictionary_fails() {
        let (storage, _) = storage_with_fixture();
        assert!(matches!(
            storage.delete_dictionary(&missing()),
            Err(StorageError::DictionaryNotFound(_))
        ));
    }

    #[test]
    fn looks_up_a_term_only_in_the_dictionaries_that_have_it() {
        let (storage, id) = storage_with_both_fixtures();
        let ids: Vec<DictionaryId> = storage
            .lookup_term_everywhere("cat")
            .unwrap()
            .into_iter()
            .map(|(dictionary, _)| dictionary.id)
            .collect();
        assert_eq!(ids, vec![id]);
    }

    #[test]
    fn returns_the_matching_entries_with_each_dictionary() {
        let (storage, _) = storage_with_both_fixtures();
        let results = storage.lookup_term_everywhere("cat").unwrap();
        assert_eq!(results[0].1[0].definitions, vec!["Katze".to_string()]);
    }

    #[test]
    fn looking_up_a_term_no_dictionary_has_finds_nothing() {
        let (storage, _) = storage_with_both_fixtures();
        assert!(storage.lookup_term_everywhere("bird").unwrap().is_empty());
    }
}

use easyimmerse_core::dictionary::TermEntry;
use rusqlite::{Connection, Row, params};

use crate::dictionaries::DictionaryId;
use crate::error::StorageError;
use crate::stored_values::read_unsigned;

/// The entries found for a term across the enabled dictionaries of one language.
#[derive(Debug, Clone, PartialEq)]
pub struct DictionaryLookup {
    /// How many enabled dictionaries the language has, whether or not they matched.
    pub dictionary_count: u64,
    pub entries: Vec<FoundEntry>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct FoundEntry {
    pub dictionary_id: DictionaryId,
    pub dictionary_title: String,
    pub entry: TermEntry,
}

/// Finds the entries whose term or reading equals `term` in every enabled dictionary of the
/// source language, in position order. When nothing matches a term with uppercase letters,
/// tries its lowercase form.
pub fn lookup_term(
    conn: &Connection,
    language: &str,
    term: &str,
) -> Result<DictionaryLookup, StorageError> {
    let mut entries = find_entries(conn, language, term)?;
    let lowercase = term.to_lowercase();
    if entries.is_empty() && lowercase != term {
        entries = find_entries(conn, language, &lowercase)?;
    }
    Ok(DictionaryLookup {
        dictionary_count: count_enabled_dictionaries(conn, language)?,
        entries,
    })
}

fn find_entries(
    conn: &Connection,
    language: &str,
    term: &str,
) -> Result<Vec<FoundEntry>, StorageError> {
    let mut statement = conn.prepare(
        "SELECT d.id, d.title, e.term, e.reading, e.definitions_json, e.tags_json \
         FROM dictionaries d JOIN dictionary_entries e ON e.dictionary_id = d.id \
         WHERE d.is_enabled AND d.source_language = ?1 AND (e.term = ?2 OR e.reading = ?2) \
         ORDER BY d.position, e.id",
    )?;
    let rows = statement.query_map(params![language, term], read_entry_row)?;
    rows.map(|row| row?.into_found_entry()).collect()
}

fn count_enabled_dictionaries(conn: &Connection, language: &str) -> Result<u64, StorageError> {
    Ok(conn.query_row(
        "SELECT COUNT(*) FROM dictionaries WHERE is_enabled AND source_language = ?1",
        params![language],
        |row| read_unsigned(row, 0),
    )?)
}

/// One entry row with its JSON columns still unparsed, so that the row callback stays
/// within rusqlite's error type.
struct EntryRow {
    dictionary_id: String,
    dictionary_title: String,
    term: String,
    reading: Option<String>,
    definitions_json: String,
    tags_json: String,
}

impl EntryRow {
    fn into_found_entry(self) -> Result<FoundEntry, StorageError> {
        Ok(FoundEntry {
            dictionary_id: DictionaryId(self.dictionary_id),
            dictionary_title: self.dictionary_title,
            entry: TermEntry {
                term: self.term,
                reading: self.reading,
                definitions: serde_json::from_str(&self.definitions_json)?,
                tags: serde_json::from_str(&self.tags_json)?,
            },
        })
    }
}

fn read_entry_row(row: &Row) -> rusqlite::Result<EntryRow> {
    Ok(EntryRow {
        dictionary_id: row.get(0)?,
        dictionary_title: row.get(1)?,
        term: row.get(2)?,
        reading: row.get(3)?,
        definitions_json: row.get(4)?,
        tags_json: row.get(5)?,
    })
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use easyimmerse_core::dictionary::{Dictionary, parse_dictionary};

    use super::*;
    use crate::{DictionaryLanguages, Storage};

    fn fixture_dictionary() -> Dictionary {
        let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/sample-yomitan.zip");
        parse_dictionary(&std::fs::read(path).unwrap()).unwrap()
    }

    fn insert(storage: &Storage, dictionary: &Dictionary, source_language: &str) -> DictionaryId {
        let languages = DictionaryLanguages {
            source_language: source_language.to_string(),
            target_language: "en".to_string(),
        };
        storage
            .insert_dictionary(dictionary, &languages)
            .unwrap()
            .id
    }

    fn storage_with_fixture() -> (Storage, DictionaryId) {
        let storage = Storage::open_in_memory().unwrap();
        let id = insert(&storage, &fixture_dictionary(), "ja");
        (storage, id)
    }

    fn english_dictionary() -> Dictionary {
        Dictionary {
            entries: vec![TermEntry {
                term: "cat".to_string(),
                reading: None,
                definitions: vec!["a small feline".to_string()],
                tags: vec![],
            }],
            ..fixture_dictionary()
        }
    }

    #[test]
    fn finds_an_entry_by_term() {
        let (storage, _) = storage_with_fixture();
        let lookup = storage.lookup_term("ja", "猫").unwrap();
        assert_eq!(lookup.entries[0].entry.definitions, vec!["cat".to_string()]);
    }

    #[test]
    fn names_the_dictionary_of_an_entry() {
        let (storage, id) = storage_with_fixture();
        let lookup = storage.lookup_term("ja", "猫").unwrap();
        assert_eq!(lookup.entries[0].dictionary_id, id);
    }

    #[test]
    fn finds_an_entry_by_reading() {
        let (storage, _) = storage_with_fixture();
        let lookup = storage.lookup_term("ja", "たべる").unwrap();
        assert_eq!(lookup.entries[0].entry.term, "食べる");
    }

    #[test]
    fn finds_nothing_for_an_unknown_term() {
        let (storage, _) = storage_with_fixture();
        assert!(storage.lookup_term("ja", "鳥").unwrap().entries.is_empty());
    }

    #[test]
    fn finds_nothing_in_dictionaries_of_another_language() {
        let (storage, _) = storage_with_fixture();
        assert!(storage.lookup_term("es", "猫").unwrap().entries.is_empty());
    }

    #[test]
    fn skips_a_disabled_dictionary() {
        let (storage, id) = storage_with_fixture();
        storage.set_dictionary_enabled(&id, false).unwrap();
        assert!(storage.lookup_term("ja", "猫").unwrap().entries.is_empty());
    }

    #[test]
    fn counts_the_enabled_dictionaries_of_the_language() {
        let (storage, id) = storage_with_fixture();
        insert(&storage, &fixture_dictionary(), "ja");
        storage.set_dictionary_enabled(&id, false).unwrap();
        assert_eq!(storage.lookup_term("ja", "鳥").unwrap().dictionary_count, 1);
    }

    #[test]
    fn lists_entries_in_dictionary_position_order() {
        let (storage, first) = storage_with_fixture();
        let second = insert(&storage, &fixture_dictionary(), "ja");
        storage
            .move_dictionary(&second, crate::MoveDirection::Up)
            .unwrap();
        let ids: Vec<_> = storage
            .lookup_term("ja", "猫")
            .unwrap()
            .entries
            .into_iter()
            .map(|found| found.dictionary_id)
            .collect();
        assert_eq!(ids, vec![second, first]);
    }

    #[test]
    fn falls_back_to_the_lowercase_term() {
        let storage = Storage::open_in_memory().unwrap();
        insert(&storage, &english_dictionary(), "en");
        let lookup = storage.lookup_term("en", "Cat").unwrap();
        assert_eq!(lookup.entries[0].entry.term, "cat");
    }

    #[test]
    fn round_trips_the_tags() {
        let (storage, _) = storage_with_fixture();
        let lookup = storage.lookup_term("ja", "猫").unwrap();
        assert_eq!(
            lookup.entries[0].entry.tags,
            fixture_dictionary().entries[0].tags
        );
    }
}

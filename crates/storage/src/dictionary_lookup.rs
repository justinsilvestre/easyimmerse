use easyimmerse_core::dictionary::{TermEntry, parse_glossary};
use rusqlite::{Connection, params};

use crate::dictionaries::{
    DictionaryId, StoredDictionary, ensure_dictionary_exists, list_dictionaries,
};
use crate::dictionary_terms_table::terms_table;
use crate::error::StorageError;
use crate::glossary_block::decode_glossary;

/// Looks the term up in every dictionary, in import order.
/// Returns only the dictionaries that have a matching entry.
pub fn lookup_term_everywhere(
    conn: &Connection,
    term: &str,
) -> Result<Vec<(StoredDictionary, Vec<TermEntry>)>, StorageError> {
    let mut results = Vec::new();
    for dictionary in list_dictionaries(conn)? {
        let entries = find_entries(conn, &dictionary.id, term)?;
        if !entries.is_empty() {
            results.push((dictionary, entries));
        }
    }
    Ok(results)
}

/// Returns the entries of one dictionary whose term or reading equals `term` exactly.
/// Fails with `DictionaryNotFound` when no dictionary has the id.
pub fn lookup_term(
    conn: &Connection,
    id: &DictionaryId,
    term: &str,
) -> Result<Vec<TermEntry>, StorageError> {
    ensure_dictionary_exists(conn, id)?;
    find_entries(conn, id, term)
}

fn find_entries(
    conn: &Connection,
    id: &DictionaryId,
    term: &str,
) -> Result<Vec<TermEntry>, StorageError> {
    let mut statement = conn.prepare_cached(&format!(
        "SELECT t.term, t.reading, t.tags_json, t.slot, b.glossaries
         FROM {} t JOIN dictionary_glossary_blocks b
             ON b.dictionary_id = ?1 AND b.block = t.block
         WHERE t.term = ?2 OR t.reading = ?2 ORDER BY t.rowid",
        terms_table(id)?
    ))?;
    let rows = statement.query_map(params![id.0, term], read_entry_row)?;
    rows.map(|row| row?.into_term_entry()).collect()
}

/// One entry row with its glossary still compressed.
/// Decompressing after the query keeps the row callback within rusqlite's error type.
struct EntryRow {
    term: String,
    reading: Option<String>,
    tags_json: String,
    slot: usize,
    block: Vec<u8>,
}

impl EntryRow {
    fn into_term_entry(self) -> Result<TermEntry, StorageError> {
        Ok(TermEntry {
            term: self.term,
            reading: self.reading,
            definitions: parse_glossary(&decode_glossary(&self.block, self.slot)?),
            tags: serde_json::from_str(&self.tags_json)?,
        })
    }
}

fn read_entry_row(row: &rusqlite::Row) -> rusqlite::Result<EntryRow> {
    Ok(EntryRow {
        term: row.get(0)?,
        reading: row.get(1)?,
        tags_json: row.get(2)?,
        slot: row.get(3)?,
        block: row.get(4)?,
    })
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::dictionary::{DetailedGlossary, Glossary};

    use super::*;
    use crate::Storage;
    use crate::test_support::parse_dictionary_fixture;

    fn storage_with(names: &[&str]) -> (Storage, DictionaryId) {
        let storage = Storage::open_in_memory().unwrap();
        let ids: Vec<DictionaryId> = names
            .iter()
            .map(|name| {
                storage
                    .insert_dictionary(&parse_dictionary_fixture(name))
                    .unwrap()
            })
            .collect();
        let last = ids.last().cloned().unwrap();
        (storage, last)
    }

    fn storage_with_fixture() -> (Storage, DictionaryId) {
        storage_with(&["sample-yomitan.zip"])
    }

    /// Stores both plain fixtures and returns the id of the English-German one.
    fn storage_with_both_fixtures() -> (Storage, DictionaryId) {
        storage_with(&["sample-yomitan.zip", "sample-yomitan-en.zip"])
    }

    #[test]
    fn finds_an_entry_by_term() {
        let (storage, id) = storage_with_fixture();
        let entries = storage.lookup_term(&id, "猫").unwrap();
        assert_eq!(entries[0].definitions, vec![Glossary::Text("cat".into())]);
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
        assert_eq!(entries[0].tags, vec!["n".to_string()]);
    }

    #[test]
    fn round_trips_a_structured_glossary() {
        let (storage, id) = storage_with(&["sample-yomitan-structured.zip"]);
        let expected =
            parse_dictionary_fixture("sample-yomitan-structured.zip").entries[0].to_term_entry();
        assert_eq!(storage.lookup_term(&id, "猫").unwrap(), vec![expected]);
    }

    #[test]
    fn returns_a_text_glossary_item_typed() {
        let (storage, id) = storage_with(&["sample-yomitan-structured.zip"]);
        let entries = storage.lookup_term(&id, "犬").unwrap();
        assert_eq!(
            entries[0].definitions[0],
            Glossary::Detailed(DetailedGlossary::Text { text: "dog".into() })
        );
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
        assert_eq!(
            results[0].1[0].definitions,
            vec![Glossary::Text("Katze".into())]
        );
    }

    #[test]
    fn looking_up_a_term_no_dictionary_has_finds_nothing() {
        let (storage, _) = storage_with_both_fixtures();
        assert!(storage.lookup_term_everywhere("bird").unwrap().is_empty());
    }
}

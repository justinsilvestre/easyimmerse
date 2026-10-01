use easyimmerse_core::dictionary::Dictionary;
use rusqlite::{Connection, params};

use crate::Storage;
use crate::dictionaries::{DictionaryId, delete_dictionary};
use crate::dictionary_import_rows::{TermRecord, insert_assets, insert_blocks, insert_terms};
use crate::dictionary_terms_table::{create_terms_table, index_terms_table};
use crate::error::StorageError;
use crate::glossary_block::{ENTRIES_PER_BLOCK, encode_glossary_blocks};
use crate::import_connection::ImportConnection;

/// How many rows one transaction inserts.
/// It bounds how long an import makes other operations wait, since they run between transactions.
const ROWS_PER_TRANSACTION: usize = 10_000;

impl Storage {
    /// Stores a parsed dictionary with its entries, stylesheet, and assets.
    ///
    /// Other operations wait for an import only briefly.
    /// The dictionary stays hidden from every query until it is complete, and is removed when storing fails.
    pub fn insert_dictionary(&self, dictionary: &Dictionary) -> Result<DictionaryId, StorageError> {
        let glossaries: Vec<&str> = dictionary
            .entries
            .iter()
            .map(|entry| entry.definitions.get())
            .collect();
        // Compressing before taking a connection keeps the transactions short.
        let blocks = encode_glossary_blocks(&glossaries)?;
        let terms = dictionary
            .entries
            .iter()
            .map(|entry| TermRecord::new(&entry.term, entry.reading.as_deref(), &entry.tags))
            .collect::<Result<Vec<_>, _>>()?;
        let id = DictionaryId::generate();
        let mut connection = ImportConnection::open(self)?;
        connection.with(|conn| in_transaction(conn, |tx| begin_import(tx, &id, dictionary)))?;
        let result = store_terms_and_blocks(&mut connection, &id, &terms, &blocks);
        if result.is_err() {
            // A dictionary that cannot be removed here stays incomplete,
            // and opening the database again removes it.
            let _ = connection.with(|conn| delete_dictionary(conn, &id));
        }
        result.map(|()| id)
    }
}

fn store_terms_and_blocks(
    connection: &mut ImportConnection,
    id: &DictionaryId,
    terms: &[TermRecord],
    blocks: &[Vec<u8>],
) -> Result<(), StorageError> {
    let blocks_per_transaction = ROWS_PER_TRANSACTION / ENTRIES_PER_BLOCK;
    for (n, chunk) in blocks.chunks(blocks_per_transaction).enumerate() {
        let first = n * blocks_per_transaction;
        connection.with(|conn| in_transaction(conn, |tx| insert_blocks(tx, id, first, chunk)))?;
    }
    for (n, chunk) in terms.chunks(ROWS_PER_TRANSACTION).enumerate() {
        let first = n * ROWS_PER_TRANSACTION;
        connection.with(|conn| in_transaction(conn, |tx| insert_terms(tx, id, first, chunk)))?;
    }
    connection.with(|conn| in_transaction(conn, |tx| finish_import(tx, id, terms.len())))
}

fn in_transaction<T>(
    conn: &mut Connection,
    operation: impl FnOnce(&Connection) -> Result<T, StorageError>,
) -> Result<T, StorageError> {
    let transaction = conn.transaction()?;
    let value = operation(&transaction)?;
    transaction.commit()?;
    Ok(value)
}

/// Stores the dictionary row, marked incomplete, with its stylesheet and assets.
/// Also creates its empty terms table.
fn begin_import(
    conn: &Connection,
    id: &DictionaryId,
    dictionary: &Dictionary,
) -> Result<(), StorageError> {
    conn.execute(
        "INSERT INTO dictionaries
         (id, title, revision, source_language, target_language, stylesheet, complete)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0)",
        params![
            id.0,
            dictionary.title,
            dictionary.revision,
            dictionary.source_language,
            dictionary.target_language,
            dictionary.stylesheet
        ],
    )?;
    insert_assets(conn, id, &dictionary.assets)?;
    create_terms_table(conn, id)
}

/// Builds the term indexes and makes the dictionary visible.
fn finish_import(
    conn: &Connection,
    id: &DictionaryId,
    entry_count: usize,
) -> Result<(), StorageError> {
    index_terms_table(conn, id)?;
    conn.execute(
        "UPDATE dictionaries SET complete = 1, entry_count = ?2 WHERE id = ?1",
        params![id.0, entry_count as u64],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dictionary_terms_table::terms_table;
    use crate::test_support::{count_rows, parse_dictionary_fixture};

    fn import(name: &str) -> (Storage, DictionaryId) {
        let storage = Storage::open_in_memory().unwrap();
        let id = storage
            .insert_dictionary(&parse_dictionary_fixture(name))
            .unwrap();
        (storage, id)
    }

    #[test]
    fn stores_every_entry() {
        let (storage, id) = import("sample-yomitan.zip");
        let table = terms_table(&id).unwrap();
        assert_eq!(count_rows(&storage, &table), 3);
    }

    #[test]
    fn records_the_entry_count() {
        let (storage, id) = import("sample-yomitan.zip");
        assert_eq!(storage.get_dictionary(&id).unwrap().entry_count, 3);
    }

    #[test]
    fn stores_the_assets() {
        let (storage, _) = import("sample-yomitan-structured.zip");
        assert_eq!(count_rows(&storage, "dictionary_assets"), 1);
    }

    #[test]
    fn stores_a_dictionary_in_a_database_file() {
        let dir = tempfile::tempdir().unwrap();
        let storage = Storage::open(&dir.path().join("test.sqlite")).unwrap();
        let id = storage
            .insert_dictionary(&parse_dictionary_fixture("sample-yomitan.zip"))
            .unwrap();
        assert_eq!(storage.lookup_term(&id, "猫").unwrap().len(), 1);
    }

    #[test]
    fn hides_a_dictionary_whose_import_has_not_finished() {
        let storage = Storage::open_in_memory().unwrap();
        let dictionary = parse_dictionary_fixture("sample-yomitan.zip");
        let id = DictionaryId::generate();
        storage
            .with_connection(|conn| begin_import(conn, &id, &dictionary))
            .unwrap();
        assert!(storage.list_dictionaries().unwrap().is_empty());
    }
}

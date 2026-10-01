//! Each dictionary keeps its terms in a table of its own.
//! Entries are appended without indexes, and the indexes are built once at the end,
//! which is much faster than updating shared indexes row by row.
//! Deleting a dictionary drops its table.

use rusqlite::Connection;

use crate::dictionaries::DictionaryId;
use crate::error::StorageError;

/// Names the terms table of a dictionary.
/// The id becomes part of SQL, so anything other than a hex string is rejected as an unknown dictionary.
pub fn terms_table(id: &DictionaryId) -> Result<String, StorageError> {
    let is_hex = !id.0.is_empty() && id.0.bytes().all(|byte| byte.is_ascii_hexdigit());
    if is_hex {
        Ok(format!("dictionary_terms_{}", id.0))
    } else {
        Err(StorageError::DictionaryNotFound(id.0.clone()))
    }
}

/// Creates the table without indexes.
/// `block` and `slot` locate the entry's glossary in `dictionary_glossary_blocks`.
pub fn create_terms_table(conn: &Connection, id: &DictionaryId) -> Result<(), StorageError> {
    let table = terms_table(id)?;
    conn.execute_batch(&format!(
        "CREATE TABLE {table} (
             term TEXT NOT NULL,
             reading TEXT,
             tags_json TEXT NOT NULL,
             block INTEGER NOT NULL,
             slot INTEGER NOT NULL
         )"
    ))?;
    Ok(())
}

pub fn index_terms_table(conn: &Connection, id: &DictionaryId) -> Result<(), StorageError> {
    let table = terms_table(id)?;
    conn.execute_batch(&format!(
        "CREATE INDEX {table}_by_term ON {table} (term);
         CREATE INDEX {table}_by_reading ON {table} (reading);"
    ))?;
    Ok(())
}

pub fn drop_terms_table(conn: &Connection, id: &DictionaryId) -> Result<(), StorageError> {
    conn.execute_batch(&format!("DROP TABLE IF EXISTS {}", terms_table(id)?))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_the_table_after_a_hex_id() {
        let id = DictionaryId("0a1b".to_string());
        assert_eq!(terms_table(&id).unwrap(), "dictionary_terms_0a1b");
    }

    #[test]
    fn rejects_an_id_that_is_not_hex() {
        let id = DictionaryId("x; DROP TABLE projects".to_string());
        assert!(matches!(
            terms_table(&id),
            Err(StorageError::DictionaryNotFound(_))
        ));
    }
}

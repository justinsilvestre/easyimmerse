//! SQLite persistence for the desktop, mobile, and server builds.
//!
//! `Storage` owns one connection behind a mutex, so it can be shared between threads. Each
//! method locks the connection for the duration of one operation.

mod dictionaries;
mod error;
mod migrations;
mod preferences;
mod projects;

pub use dictionaries::{DictionaryId, StoredDictionary};
pub use error::StorageError;

use std::path::Path;
use std::sync::Mutex;

use easyimmerse_core::dictionary::{Dictionary, TermEntry};
use easyimmerse_core::project::ProjectSummary;
use rusqlite::Connection;

pub struct Storage {
    conn: Mutex<Connection>,
}

impl Storage {
    /// Opens or creates the database file and brings its schema up to date.
    pub fn open(path: &Path) -> Result<Self, StorageError> {
        let conn = Connection::open(path)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        Self::from_connection(conn)
    }

    /// Opens an empty database that lives only as long as this value.
    pub fn open_in_memory() -> Result<Self, StorageError> {
        Self::from_connection(Connection::open_in_memory()?)
    }

    fn from_connection(mut conn: Connection) -> Result<Self, StorageError> {
        conn.pragma_update(None, "foreign_keys", "ON")?;
        migrations::MIGRATIONS.to_latest(&mut conn)?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    fn with_connection<T>(
        &self,
        operation: impl FnOnce(&mut Connection) -> Result<T, StorageError>,
    ) -> Result<T, StorageError> {
        let mut conn = self.conn.lock().map_err(|_| StorageError::LockPoisoned)?;
        operation(&mut conn)
    }

    pub fn list_projects(&self) -> Result<Vec<ProjectSummary>, StorageError> {
        self.with_connection(|conn| projects::list_projects(conn))
    }

    pub fn seed_placeholder_projects(&self) -> Result<(), StorageError> {
        self.with_connection(|conn| projects::seed_placeholder_projects(conn))
    }

    pub fn get_preference(&self, key: &str) -> Result<Option<String>, StorageError> {
        self.with_connection(|conn| preferences::get_preference(conn, key))
    }

    pub fn set_preference(&self, key: &str, value: &str) -> Result<(), StorageError> {
        self.with_connection(|conn| preferences::set_preference(conn, key, value))
    }

    pub fn insert_dictionary(&self, dictionary: &Dictionary) -> Result<DictionaryId, StorageError> {
        self.with_connection(|conn| dictionaries::insert_dictionary(conn, dictionary))
    }

    pub fn list_dictionaries(&self) -> Result<Vec<StoredDictionary>, StorageError> {
        self.with_connection(|conn| dictionaries::list_dictionaries(conn))
    }

    pub fn lookup_term(
        &self,
        id: &DictionaryId,
        term: &str,
    ) -> Result<Vec<TermEntry>, StorageError> {
        self.with_connection(|conn| dictionaries::lookup_term(conn, id, term))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn query_pragma<T: rusqlite::types::FromSql>(storage: &Storage, name: &str) -> T {
        storage
            .with_connection(|conn| Ok(conn.pragma_query_value(None, name, |row| row.get(0))?))
            .unwrap()
    }

    #[test]
    fn opens_a_file_database_in_wal_mode() {
        let dir = tempfile::tempdir().unwrap();
        let storage = Storage::open(&dir.path().join("test.sqlite")).unwrap();
        assert_eq!(query_pragma::<String>(&storage, "journal_mode"), "wal");
    }

    #[test]
    fn enforces_foreign_keys() {
        let storage = Storage::open_in_memory().unwrap();
        assert_eq!(query_pragma::<i64>(&storage, "foreign_keys"), 1);
    }

    #[test]
    fn reopening_a_file_database_keeps_its_data() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("test.sqlite");
        Storage::open(&path)
            .unwrap()
            .set_preference("k", "v")
            .unwrap();
        let reopened = Storage::open(&path).unwrap();
        assert_eq!(reopened.get_preference("k").unwrap(), Some("v".to_string()));
    }
}

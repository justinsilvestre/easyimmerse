//! SQLite persistence for the desktop, mobile, and server builds.
//!
//! `Storage` owns one connection behind a mutex, so it can be shared between threads. Each
//! method locks the connection for the duration of one operation.

mod dictionaries;
mod error;
mod media_files;
mod migrations;
mod preferences;
mod projects;

pub use dictionaries::{DictionaryCounts, DictionaryId, StoredDictionary};
pub use error::StorageError;

use std::path::Path;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use easyimmerse_core::dictionary::{DictionaryMedia, DictionarySource};
use easyimmerse_core::lookup::{
    DictionaryStylesheet, FoundEntry, FoundKanji, FoundKanjiMeta, FoundTermMeta,
};
use easyimmerse_core::media_file::{MediaFile, MediaFileId, MediaFileSource};
use easyimmerse_core::project::{ProjectId, ProjectSummary};
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

    /// Deletes a project together with everything that belongs to it.
    pub fn delete_project(&self, project_id: &ProjectId) -> Result<(), StorageError> {
        self.with_connection(|conn| media_files::delete_project(conn, project_id))
    }

    pub fn list_media_files(&self, project_id: &ProjectId) -> Result<Vec<MediaFile>, StorageError> {
        self.with_connection(|conn| media_files::list_media_files(conn, project_id))
    }

    pub fn get_media_file(&self, id: &MediaFileId) -> Result<MediaFile, StorageError> {
        self.with_connection(|conn| media_files::get_media_file(conn, id))
    }

    pub fn add_media_file(
        &self,
        project_id: &ProjectId,
        name: &str,
        source: &MediaFileSource,
    ) -> Result<MediaFile, StorageError> {
        self.with_connection(|conn| media_files::add_media_file(conn, project_id, name, source))
    }

    pub fn remove_media_file(&self, id: &MediaFileId) -> Result<(), StorageError> {
        self.with_connection(|conn| media_files::remove_media_file(conn, id))
    }

    /// Stores the user's track choice for a media file; `None` clears it.
    pub fn set_track_selection_json(
        &self,
        id: &MediaFileId,
        track_selection_json: Option<&str>,
    ) -> Result<(), StorageError> {
        self.with_connection(|conn| {
            media_files::set_track_selection_json(conn, id, track_selection_json)
        })
    }

    /// Lists every distinct local path that some media file still points at.
    pub fn list_referenced_source_paths(&self) -> Result<Vec<String>, StorageError> {
        self.with_connection(|conn| media_files::list_referenced_source_paths(conn))
    }

    pub fn get_preference(&self, key: &str) -> Result<Option<String>, StorageError> {
        self.with_connection(|conn| preferences::get_preference(conn, key))
    }

    pub fn set_preference(&self, key: &str, value: &str) -> Result<(), StorageError> {
        self.with_connection(|conn| preferences::set_preference(conn, key, value))
    }

    /// Imports a dictionary from its files in one transaction and returns its new id.
    /// The connection stays locked until the import finishes.
    pub fn import_dictionary(
        &self,
        source: &mut DictionarySource,
    ) -> Result<DictionaryId, StorageError> {
        let imported_at = milliseconds_since_epoch();
        self.with_connection(|conn| dictionaries::import_dictionary(conn, source, imported_at))
    }

    /// Lists every stored dictionary in the order they were imported.
    pub fn list_dictionaries(&self) -> Result<Vec<StoredDictionary>, StorageError> {
        self.with_connection(|conn| dictionaries::list_dictionaries(conn))
    }

    pub fn get_dictionary(&self, id: &DictionaryId) -> Result<StoredDictionary, StorageError> {
        self.with_connection(|conn| dictionaries::get_dictionary(conn, id))
    }

    /// Deletes a dictionary together with everything it stored.
    pub fn delete_dictionary(&self, id: &DictionaryId) -> Result<(), StorageError> {
        self.with_connection(|conn| dictionaries::delete_dictionary(conn, id))
    }

    /// Finds the entries of every dictionary stored under any of the headwords, ignoring case.
    pub fn find_dictionary_entries(
        &self,
        headwords: &[String],
    ) -> Result<Vec<FoundEntry>, StorageError> {
        self.with_connection(|conn| dictionaries::find_entries(conn, headwords))
    }

    /// Finds the frequencies and pronunciations that every dictionary stores for any of the terms.
    pub fn find_term_meta(&self, terms: &[String]) -> Result<Vec<FoundTermMeta>, StorageError> {
        self.with_connection(|conn| dictionaries::find_term_meta(conn, terms))
    }

    pub fn find_kanji(&self, characters: &[String]) -> Result<Vec<FoundKanji>, StorageError> {
        self.with_connection(|conn| dictionaries::find_kanji(conn, characters))
    }

    pub fn find_kanji_meta(
        &self,
        characters: &[String],
    ) -> Result<Vec<FoundKanjiMeta>, StorageError> {
        self.with_connection(|conn| dictionaries::find_kanji_meta(conn, characters))
    }

    /// Returns the stylesheets of the given dictionaries in import order, leaving out dictionaries that have none.
    pub fn find_dictionary_stylesheets(
        &self,
        dictionary_ids: &[String],
    ) -> Result<Vec<DictionaryStylesheet>, StorageError> {
        self.with_connection(|conn| dictionaries::find_stylesheets(conn, dictionary_ids))
    }

    /// Returns a file stored with a dictionary, by the path its definitions use.
    pub fn get_dictionary_media(
        &self,
        id: &DictionaryId,
        path: &str,
    ) -> Result<DictionaryMedia, StorageError> {
        self.with_connection(|conn| dictionaries::get_media(conn, id, path))
    }
}

fn milliseconds_since_epoch() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| u64::try_from(elapsed.as_millis()).unwrap_or(u64::MAX))
        .unwrap_or(0)
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

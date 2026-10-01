//! SQLite persistence for the desktop, mobile, and server builds.
//!
//! `Storage` owns one connection behind a mutex, so it can be shared between threads. Each
//! method locks the connection for the duration of one operation.

mod dictionaries;
mod enum_text;
mod error;
mod flashcards;
mod ids;
mod media_files;
mod migrations;
mod preferences;
mod projects;
mod subtitle_tracks;
#[cfg(test)]
mod test_support;

pub use dictionaries::{DictionaryId, StoredDictionary};
pub use error::StorageError;

use std::path::Path;
use std::sync::Mutex;

use easyimmerse_core::dictionary::{Dictionary, TermEntry};
use easyimmerse_core::flashcard::{Flashcard, FlashcardId, NewFlashcard};
use easyimmerse_core::media_file::{
    MediaFile, MediaId, NewMediaFile, NewSubtitleTrack, SubtitleTrack,
};
use easyimmerse_core::project::{Project, ProjectId, ProjectSettings, ProjectSummary};
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

    /// Creates a project. `now` is an RFC 3339 timestamp.
    pub fn create_project(
        &self,
        settings: &ProjectSettings,
        now: &str,
    ) -> Result<Project, StorageError> {
        self.with_connection(|conn| projects::create_project(conn, settings, now))
    }

    pub fn get_project(&self, id: &ProjectId) -> Result<Project, StorageError> {
        self.with_connection(|conn| projects::get_project(conn, id))
    }

    pub fn update_project_settings(
        &self,
        id: &ProjectId,
        settings: &ProjectSettings,
    ) -> Result<Project, StorageError> {
        self.with_connection(|conn| projects::update_project_settings(conn, id, settings))
    }

    /// Records that the project was opened. `now` is an RFC 3339 timestamp.
    pub fn mark_project_opened(&self, id: &ProjectId, now: &str) -> Result<Project, StorageError> {
        self.with_connection(|conn| projects::mark_project_opened(conn, id, now))
    }

    pub fn delete_project(&self, id: &ProjectId) -> Result<(), StorageError> {
        self.with_connection(|conn| projects::delete_project(conn, id))
    }

    pub fn get_media_file(
        &self,
        project_id: &ProjectId,
        media_id: &MediaId,
    ) -> Result<MediaFile, StorageError> {
        self.with_connection(|conn| media_files::get_media_file(conn, project_id, media_id))
    }

    /// Registers a media file in a project. `now` is an RFC 3339 timestamp.
    pub fn add_media_file(
        &self,
        project_id: &ProjectId,
        media: &NewMediaFile,
        now: &str,
    ) -> Result<MediaFile, StorageError> {
        self.with_connection(|conn| media_files::add_media_file(conn, project_id, media, now))
    }

    pub fn set_media_duration(
        &self,
        project_id: &ProjectId,
        media_id: &MediaId,
        duration_ms: u64,
    ) -> Result<MediaFile, StorageError> {
        self.with_connection(|conn| {
            media_files::set_media_duration(conn, project_id, media_id, duration_ms)
        })
    }

    pub fn remove_media_file(
        &self,
        project_id: &ProjectId,
        media_id: &MediaId,
    ) -> Result<(), StorageError> {
        self.with_connection(|conn| media_files::remove_media_file(conn, project_id, media_id))
    }

    pub fn add_subtitle_track(
        &self,
        project_id: &ProjectId,
        media_id: &MediaId,
        track: &NewSubtitleTrack,
    ) -> Result<SubtitleTrack, StorageError> {
        self.with_connection(|conn| {
            subtitle_tracks::add_subtitle_track(conn, project_id, media_id, track)
        })
    }

    pub fn remove_subtitle_track(
        &self,
        project_id: &ProjectId,
        media_id: &MediaId,
        track_id: &str,
    ) -> Result<(), StorageError> {
        self.with_connection(|conn| {
            subtitle_tracks::remove_subtitle_track(conn, project_id, media_id, track_id)
        })
    }

    pub fn list_flashcards(&self, project_id: &ProjectId) -> Result<Vec<Flashcard>, StorageError> {
        self.with_connection(|conn| flashcards::list_flashcards(conn, project_id))
    }

    /// Saves a new flashcard. `now` is an RFC 3339 timestamp.
    pub fn insert_flashcard(
        &self,
        project_id: &ProjectId,
        card: &NewFlashcard,
        now: &str,
    ) -> Result<Flashcard, StorageError> {
        self.with_connection(|conn| flashcards::insert_flashcard(conn, project_id, card, now))
    }

    pub fn update_flashcard(
        &self,
        project_id: &ProjectId,
        id: &FlashcardId,
        card: &NewFlashcard,
    ) -> Result<Flashcard, StorageError> {
        self.with_connection(|conn| flashcards::update_flashcard(conn, project_id, id, card))
    }

    pub fn delete_flashcard(
        &self,
        project_id: &ProjectId,
        id: &FlashcardId,
    ) -> Result<(), StorageError> {
        self.with_connection(|conn| flashcards::delete_flashcard(conn, project_id, id))
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

    pub fn get_dictionary(&self, id: &DictionaryId) -> Result<StoredDictionary, StorageError> {
        self.with_connection(|conn| dictionaries::get_dictionary(conn, id))
    }

    pub fn lookup_term_everywhere(
        &self,
        term: &str,
    ) -> Result<Vec<(StoredDictionary, Vec<TermEntry>)>, StorageError> {
        self.with_connection(|conn| dictionaries::lookup_term_everywhere(conn, term))
    }

    pub fn set_dictionary_languages(
        &self,
        id: &DictionaryId,
        source_language: Option<&str>,
        target_language: Option<&str>,
    ) -> Result<StoredDictionary, StorageError> {
        self.with_connection(|conn| {
            dictionaries::set_dictionary_languages(conn, id, source_language, target_language)
        })
    }

    pub fn delete_dictionary(&self, id: &DictionaryId) -> Result<(), StorageError> {
        self.with_connection(|conn| dictionaries::delete_dictionary(conn, id))
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

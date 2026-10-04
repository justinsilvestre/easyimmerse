//! SQLite persistence for the desktop, mobile, and server builds.
//!
//! `Storage` owns one connection behind a mutex, so it can be shared between threads. Each
//! method locks the connection for the duration of one operation.

mod dictionaries;
mod dictionary_lookup;
mod error;
mod flashcards;
mod media_files;
mod migrations;
mod preferences;
mod project_seed;
mod projects;
mod stored_values;
mod subtitle_files;

pub use dictionaries::{DictionaryId, DictionaryLanguages, MoveDirection, StoredDictionary};
pub use dictionary_lookup::{DictionaryLookup, FoundEntry};
pub use error::StorageError;
pub use flashcards::{FlashcardDraft, ScreenshotChange};
pub use subtitle_files::{NewSubtitleFile, StoredSubtitleFile, subtitle_file_track_id};

use std::path::Path;
use std::sync::Mutex;

use easyimmerse_core::dictionary::Dictionary;
use easyimmerse_core::flashcard::{Flashcard, FlashcardId};
use easyimmerse_core::media_file::{MediaFile, MediaFileId, MediaFileSource, SubtitleSelection};
use easyimmerse_core::project::{Project, ProjectId, ProjectSettings, ProjectSummary};
use easyimmerse_core::subtitle_file::SubtitleFileId;
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

    /// Lists every project, most recently opened first.
    pub fn list_projects(&self) -> Result<Vec<ProjectSummary>, StorageError> {
        self.with_connection(|conn| projects::list_projects(conn))
    }

    pub fn get_project(&self, id: &ProjectId) -> Result<Project, StorageError> {
        self.with_connection(|conn| projects::get_project(conn, id))
    }

    pub fn create_project(
        &self,
        name: &str,
        settings: &ProjectSettings,
    ) -> Result<Project, StorageError> {
        self.with_connection(|conn| projects::create_project(conn, name, settings))
    }

    pub fn update_project(
        &self,
        id: &ProjectId,
        name: &str,
        settings: &ProjectSettings,
    ) -> Result<Project, StorageError> {
        self.with_connection(|conn| projects::update_project(conn, id, name, settings))
    }

    /// Deletes a project together with its media files, flashcards, and subtitles files.
    pub fn delete_project(&self, id: &ProjectId) -> Result<(), StorageError> {
        self.with_connection(|conn| projects::delete_project(conn, id))
    }

    /// Records that the project was opened just now.
    pub fn mark_project_opened(&self, id: &ProjectId) -> Result<(), StorageError> {
        self.with_connection(|conn| projects::mark_project_opened(conn, id))
    }

    pub fn seed_placeholder_projects(&self) -> Result<(), StorageError> {
        self.with_connection(|conn| project_seed::seed_placeholder_projects(conn))
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

    /// Removes a media file and its subtitles files. Its flashcards stay, without a media file.
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

    pub fn set_subtitle_selection(
        &self,
        id: &MediaFileId,
        selection: &SubtitleSelection,
    ) -> Result<(), StorageError> {
        self.with_connection(|conn| media_files::set_subtitle_selection(conn, id, selection))
    }

    /// Lists every distinct local path that some media file still points at.
    pub fn list_referenced_source_paths(&self) -> Result<Vec<String>, StorageError> {
        self.with_connection(|conn| media_files::list_referenced_source_paths(conn))
    }

    /// Lists a project's flashcards, oldest first, optionally only those of one media file.
    pub fn list_flashcards(
        &self,
        project_id: &ProjectId,
        media_file_id: Option<&MediaFileId>,
    ) -> Result<Vec<Flashcard>, StorageError> {
        self.with_connection(|conn| flashcards::list_flashcards(conn, project_id, media_file_id))
    }

    pub fn get_flashcard(
        &self,
        project_id: &ProjectId,
        id: &FlashcardId,
    ) -> Result<Flashcard, StorageError> {
        self.with_connection(|conn| flashcards::get_flashcard(conn, project_id, id))
    }

    /// Adds a flashcard. Fails with `MediaFileNotFound` when the draft names a media file of
    /// another project.
    pub fn insert_flashcard(
        &self,
        project_id: &ProjectId,
        draft: &FlashcardDraft,
    ) -> Result<Flashcard, StorageError> {
        self.with_connection(|conn| flashcards::insert_flashcard(conn, project_id, draft))
    }

    pub fn update_flashcard(
        &self,
        project_id: &ProjectId,
        id: &FlashcardId,
        draft: &FlashcardDraft,
    ) -> Result<Flashcard, StorageError> {
        self.with_connection(|conn| flashcards::update_flashcard(conn, project_id, id, draft))
    }

    pub fn delete_flashcard(
        &self,
        project_id: &ProjectId,
        id: &FlashcardId,
    ) -> Result<(), StorageError> {
        self.with_connection(|conn| flashcards::delete_flashcard(conn, project_id, id))
    }

    /// Returns the data URL of a flashcard's screenshot, or `None` when it has none.
    pub fn get_flashcard_screenshot(
        &self,
        project_id: &ProjectId,
        id: &FlashcardId,
    ) -> Result<Option<String>, StorageError> {
        self.with_connection(|conn| flashcards::get_flashcard_screenshot(conn, project_id, id))
    }

    /// Lists a media file's subtitles files, oldest first.
    pub fn list_subtitle_files(
        &self,
        media_file_id: &MediaFileId,
    ) -> Result<Vec<StoredSubtitleFile>, StorageError> {
        self.with_connection(|conn| subtitle_files::list_subtitle_files(conn, media_file_id))
    }

    pub fn add_subtitle_file(
        &self,
        media_file_id: &MediaFileId,
        file: &NewSubtitleFile,
    ) -> Result<StoredSubtitleFile, StorageError> {
        self.with_connection(|conn| subtitle_files::add_subtitle_file(conn, media_file_id, file))
    }

    /// Removes a subtitles file and clears the media file's subtitle selection where it
    /// named the file.
    pub fn remove_subtitle_file(
        &self,
        media_file_id: &MediaFileId,
        id: &SubtitleFileId,
    ) -> Result<(), StorageError> {
        self.with_connection(|conn| subtitle_files::remove_subtitle_file(conn, media_file_id, id))
    }

    pub fn get_preference(&self, key: &str) -> Result<Option<String>, StorageError> {
        self.with_connection(|conn| preferences::get_preference(conn, key))
    }

    pub fn set_preference(&self, key: &str, value: &str) -> Result<(), StorageError> {
        self.with_connection(|conn| preferences::set_preference(conn, key, value))
    }

    pub fn insert_dictionary(
        &self,
        dictionary: &Dictionary,
        languages: &DictionaryLanguages,
    ) -> Result<StoredDictionary, StorageError> {
        self.with_connection(|conn| dictionaries::insert_dictionary(conn, dictionary, languages))
    }

    /// Lists every stored dictionary by source language, then by position.
    pub fn list_dictionaries(&self) -> Result<Vec<StoredDictionary>, StorageError> {
        self.with_connection(|conn| dictionaries::list_dictionaries(conn))
    }

    pub fn set_dictionary_enabled(
        &self,
        id: &DictionaryId,
        is_enabled: bool,
    ) -> Result<StoredDictionary, StorageError> {
        self.with_connection(|conn| dictionaries::set_dictionary_enabled(conn, id, is_enabled))
    }

    /// Swaps a dictionary's position with its nearest neighbour of the same source language;
    /// does nothing at either end.
    pub fn move_dictionary(
        &self,
        id: &DictionaryId,
        direction: MoveDirection,
    ) -> Result<(), StorageError> {
        self.with_connection(|conn| dictionaries::move_dictionary(conn, id, direction))
    }

    pub fn delete_dictionary(&self, id: &DictionaryId) -> Result<(), StorageError> {
        self.with_connection(|conn| dictionaries::delete_dictionary(conn, id))
    }

    /// Looks a term up in the enabled dictionaries of a source language.
    pub fn lookup_term(
        &self,
        language: &str,
        term: &str,
    ) -> Result<DictionaryLookup, StorageError> {
        self.with_connection(|conn| dictionary_lookup::lookup_term(conn, language, term))
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

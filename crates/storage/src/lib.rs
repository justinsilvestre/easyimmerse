//! SQLite persistence for the desktop, mobile, and server builds.
//!
//! `Storage` owns one connection behind a mutex, so it can be shared between threads. Each
//! method locks the connection for the duration of one operation.

mod dictionaries;
mod error;
mod flashcards;
mod media_files;
mod migrations;
mod new_row;
mod preferences;
mod projects;
mod stored_integer;
mod subtitle_tracks;

pub use dictionaries::{DictionaryId, StoredDictionary};
pub use error::StorageError;
pub use subtitle_tracks::{NewSubtitleTrack, StoredSubtitleTrack};

use std::path::Path;
use std::sync::Mutex;

use easyimmerse_core::dictionary::{Dictionary, TermEntry};
use easyimmerse_core::flashcard::{Flashcard, FlashcardDraft, FlashcardId};
use easyimmerse_core::media_file::{MediaFile, MediaFileId, MediaFileSource};
use easyimmerse_core::project::{Project, ProjectId, ProjectSettings};
use easyimmerse_core::subtitle_track::{SubtitleSelection, SubtitleTrack, SubtitleTrackId};
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
    pub fn list_projects(&self) -> Result<Vec<Project>, StorageError> {
        self.with_connection(|conn| projects::list_projects(conn))
    }

    pub fn get_project(&self, id: &ProjectId) -> Result<Project, StorageError> {
        self.with_connection(|conn| projects::get_project(conn, id))
    }

    pub fn create_project(&self, settings: &ProjectSettings) -> Result<Project, StorageError> {
        self.with_connection(|conn| projects::create_project(conn, settings))
    }

    pub fn update_project(
        &self,
        id: &ProjectId,
        settings: &ProjectSettings,
    ) -> Result<Project, StorageError> {
        self.with_connection(|conn| projects::update_project(conn, id, settings))
    }

    /// Records that the project was opened just now, which moves it to the front of the list.
    pub fn mark_project_opened(&self, id: &ProjectId) -> Result<(), StorageError> {
        self.with_connection(|conn| projects::mark_project_opened(conn, id))
    }

    pub fn seed_placeholder_projects(&self) -> Result<(), StorageError> {
        self.with_connection(|conn| projects::seed_placeholder_projects(conn))
    }

    /// Deletes a project together with everything that belongs to it.
    pub fn delete_project(&self, project_id: &ProjectId) -> Result<(), StorageError> {
        self.with_connection(|conn| projects::delete_project(conn, project_id))
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

    pub fn list_flashcards(&self, project_id: &ProjectId) -> Result<Vec<Flashcard>, StorageError> {
        self.with_connection(|conn| flashcards::list_flashcards(conn, project_id))
    }

    pub fn get_flashcard(&self, id: &FlashcardId) -> Result<Flashcard, StorageError> {
        self.with_connection(|conn| flashcards::get_flashcard(conn, id))
    }

    pub fn create_flashcard(
        &self,
        project_id: &ProjectId,
        draft: &FlashcardDraft,
    ) -> Result<Flashcard, StorageError> {
        self.with_connection(|conn| flashcards::create_flashcard(conn, project_id, draft))
    }

    pub fn update_flashcard(
        &self,
        id: &FlashcardId,
        draft: &FlashcardDraft,
    ) -> Result<Flashcard, StorageError> {
        self.with_connection(|conn| flashcards::update_flashcard(conn, id, draft))
    }

    pub fn delete_flashcard(&self, id: &FlashcardId) -> Result<(), StorageError> {
        self.with_connection(|conn| flashcards::delete_flashcard(conn, id))
    }

    pub fn list_subtitle_tracks(
        &self,
        media_file_id: &MediaFileId,
    ) -> Result<Vec<SubtitleTrack>, StorageError> {
        self.with_connection(|conn| subtitle_tracks::list_subtitle_tracks(conn, media_file_id))
    }

    pub fn get_subtitle_track(
        &self,
        id: &SubtitleTrackId,
    ) -> Result<StoredSubtitleTrack, StorageError> {
        self.with_connection(|conn| subtitle_tracks::get_subtitle_track(conn, id))
    }

    pub fn add_subtitle_track(
        &self,
        media_file_id: &MediaFileId,
        track: &NewSubtitleTrack,
    ) -> Result<SubtitleTrack, StorageError> {
        self.with_connection(|conn| subtitle_tracks::add_subtitle_track(conn, media_file_id, track))
    }

    /// Removes a track and takes it out of its media file's selection.
    pub fn remove_subtitle_track(&self, id: &SubtitleTrackId) -> Result<(), StorageError> {
        self.with_connection(|conn| subtitle_tracks::remove_subtitle_track(conn, id))
    }

    pub fn get_subtitle_selection(
        &self,
        media_file_id: &MediaFileId,
    ) -> Result<SubtitleSelection, StorageError> {
        self.with_connection(|conn| subtitle_tracks::get_subtitle_selection(conn, media_file_id))
    }

    /// Stores which tracks the media file shows. Each named track must belong to the media file.
    pub fn set_subtitle_selection(
        &self,
        media_file_id: &MediaFileId,
        selection: &SubtitleSelection,
    ) -> Result<(), StorageError> {
        self.with_connection(|conn| {
            subtitle_tracks::set_subtitle_selection(conn, media_file_id, selection)
        })
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

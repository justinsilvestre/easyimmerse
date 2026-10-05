//! SQLite persistence for the desktop, mobile, and server builds.
//!
//! `Storage` can be shared between threads. Writes run one at a time,
//! while reads on a database file run beside them and see only what has been committed.

mod connections;
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

pub use dictionaries::{DictionaryCounts, DictionaryId, StoredDictionary};
pub use error::StorageError;
pub use subtitle_tracks::{NewSubtitleTrack, StoredSubtitleTrack};

use std::path::Path;

use easyimmerse_core::dictionary::{DictionaryMedia, DictionarySource};
use easyimmerse_core::flashcard::{Flashcard, FlashcardDraft, FlashcardId};
use easyimmerse_core::lookup::{
    DictionaryStylesheet, FoundEntry, FoundKanji, FoundKanjiMeta, FoundTermMeta,
};
use easyimmerse_core::media_file::{MediaFile, MediaFileId, MediaFileSource};
use easyimmerse_core::project::{Project, ProjectId, ProjectSettings};
use easyimmerse_core::subtitle_track::{SubtitleSelection, SubtitleTrack, SubtitleTrackId};
use rusqlite::Connection;

use connections::Connections;

pub struct Storage {
    connections: Connections,
}

impl Storage {
    /// Opens or creates the database file and brings its schema up to date.
    pub fn open(path: &Path) -> Result<Self, StorageError> {
        Ok(Self {
            connections: Connections::open(path)?,
        })
    }

    /// Opens an empty database that lives only as long as this value.
    /// Its reads wait for any write in progress.
    pub fn open_in_memory() -> Result<Self, StorageError> {
        Ok(Self {
            connections: Connections::open_in_memory()?,
        })
    }

    fn write<T>(
        &self,
        operation: impl FnOnce(&mut Connection) -> Result<T, StorageError>,
    ) -> Result<T, StorageError> {
        self.connections.write(operation)
    }

    fn read<T>(
        &self,
        operation: impl FnOnce(&Connection) -> Result<T, StorageError>,
    ) -> Result<T, StorageError> {
        self.connections.read(operation)
    }

    /// Lists every project, most recently opened first.
    pub fn list_projects(&self) -> Result<Vec<Project>, StorageError> {
        self.read(projects::list_projects)
    }

    pub fn get_project(&self, id: &ProjectId) -> Result<Project, StorageError> {
        self.read(|conn| projects::get_project(conn, id))
    }

    pub fn create_project(&self, settings: &ProjectSettings) -> Result<Project, StorageError> {
        self.write(|conn| projects::create_project(conn, settings))
    }

    pub fn update_project(
        &self,
        id: &ProjectId,
        settings: &ProjectSettings,
    ) -> Result<Project, StorageError> {
        self.write(|conn| projects::update_project(conn, id, settings))
    }

    /// Records that the project was opened just now, which moves it to the front of the list.
    pub fn mark_project_opened(&self, id: &ProjectId) -> Result<(), StorageError> {
        self.write(|conn| projects::mark_project_opened(conn, id))
    }

    pub fn seed_placeholder_projects(&self) -> Result<(), StorageError> {
        self.write(|conn| projects::seed_placeholder_projects(conn))
    }

    /// Deletes a project together with everything that belongs to it.
    pub fn delete_project(&self, project_id: &ProjectId) -> Result<(), StorageError> {
        self.write(|conn| projects::delete_project(conn, project_id))
    }

    pub fn list_media_files(&self, project_id: &ProjectId) -> Result<Vec<MediaFile>, StorageError> {
        self.read(|conn| media_files::list_media_files(conn, project_id))
    }

    pub fn get_media_file(&self, id: &MediaFileId) -> Result<MediaFile, StorageError> {
        self.read(|conn| media_files::get_media_file(conn, id))
    }

    pub fn add_media_file(
        &self,
        project_id: &ProjectId,
        name: &str,
        source: &MediaFileSource,
    ) -> Result<MediaFile, StorageError> {
        self.write(|conn| media_files::add_media_file(conn, project_id, name, source))
    }

    pub fn remove_media_file(&self, id: &MediaFileId) -> Result<(), StorageError> {
        self.write(|conn| media_files::remove_media_file(conn, id))
    }

    /// Stores the user's track choice for a media file; `None` clears it.
    pub fn set_track_selection_json(
        &self,
        id: &MediaFileId,
        track_selection_json: Option<&str>,
    ) -> Result<(), StorageError> {
        self.write(|conn| media_files::set_track_selection_json(conn, id, track_selection_json))
    }

    /// Lists every distinct local path that some media file still points at.
    pub fn list_referenced_source_paths(&self) -> Result<Vec<String>, StorageError> {
        self.read(media_files::list_referenced_source_paths)
    }

    pub fn list_flashcards(&self, project_id: &ProjectId) -> Result<Vec<Flashcard>, StorageError> {
        self.read(|conn| flashcards::list_flashcards(conn, project_id))
    }

    pub fn get_flashcard(&self, id: &FlashcardId) -> Result<Flashcard, StorageError> {
        self.read(|conn| flashcards::get_flashcard(conn, id))
    }

    pub fn create_flashcard(
        &self,
        project_id: &ProjectId,
        draft: &FlashcardDraft,
    ) -> Result<Flashcard, StorageError> {
        self.write(|conn| flashcards::create_flashcard(conn, project_id, draft))
    }

    pub fn update_flashcard(
        &self,
        id: &FlashcardId,
        draft: &FlashcardDraft,
    ) -> Result<Flashcard, StorageError> {
        self.write(|conn| flashcards::update_flashcard(conn, id, draft))
    }

    pub fn delete_flashcard(&self, id: &FlashcardId) -> Result<(), StorageError> {
        self.write(|conn| flashcards::delete_flashcard(conn, id))
    }

    pub fn list_subtitle_tracks(
        &self,
        media_file_id: &MediaFileId,
    ) -> Result<Vec<SubtitleTrack>, StorageError> {
        self.read(|conn| subtitle_tracks::list_subtitle_tracks(conn, media_file_id))
    }

    pub fn get_subtitle_track(
        &self,
        id: &SubtitleTrackId,
    ) -> Result<StoredSubtitleTrack, StorageError> {
        self.read(|conn| subtitle_tracks::get_subtitle_track(conn, id))
    }

    pub fn add_subtitle_track(
        &self,
        media_file_id: &MediaFileId,
        track: &NewSubtitleTrack,
    ) -> Result<SubtitleTrack, StorageError> {
        self.write(|conn| subtitle_tracks::add_subtitle_track(conn, media_file_id, track))
    }

    /// Removes a track and takes it out of its media file's selection.
    pub fn remove_subtitle_track(&self, id: &SubtitleTrackId) -> Result<(), StorageError> {
        self.write(|conn| subtitle_tracks::remove_subtitle_track(conn, id))
    }

    pub fn get_subtitle_selection(
        &self,
        media_file_id: &MediaFileId,
    ) -> Result<SubtitleSelection, StorageError> {
        self.read(|conn| subtitle_tracks::get_subtitle_selection(conn, media_file_id))
    }

    /// Stores which tracks the media file shows. Each named track must belong to the media file.
    pub fn set_subtitle_selection(
        &self,
        media_file_id: &MediaFileId,
        selection: &SubtitleSelection,
    ) -> Result<(), StorageError> {
        self.write(|conn| {
            subtitle_tracks::set_subtitle_selection(conn, media_file_id, selection)
        })
    }

    pub fn get_preference(&self, key: &str) -> Result<Option<String>, StorageError> {
        self.read(|conn| preferences::get_preference(conn, key))
    }

    pub fn set_preference(&self, key: &str, value: &str) -> Result<(), StorageError> {
        self.write(|conn| preferences::set_preference(conn, key, value))
    }

    /// Imports a dictionary from its files in one transaction and returns its new id.
    /// Other writes wait until the import finishes; reads do not.
    pub fn import_dictionary(
        &self,
        source: &mut DictionarySource,
    ) -> Result<DictionaryId, StorageError> {
        let imported_at = new_row::now_ms();
        self.write(|conn| dictionaries::import_dictionary(conn, source, imported_at))
    }

    /// Lists every stored dictionary in the order they were imported.
    pub fn list_dictionaries(&self) -> Result<Vec<StoredDictionary>, StorageError> {
        self.read(dictionaries::list_dictionaries)
    }

    pub fn get_dictionary(&self, id: &DictionaryId) -> Result<StoredDictionary, StorageError> {
        self.read(|conn| dictionaries::get_dictionary(conn, id))
    }

    /// Deletes a dictionary together with everything it stored.
    pub fn delete_dictionary(&self, id: &DictionaryId) -> Result<(), StorageError> {
        self.write(|conn| dictionaries::delete_dictionary(conn, id))
    }

    /// Finds the entries of every dictionary stored under any of the headwords, ignoring case.
    pub fn find_dictionary_entries(
        &self,
        headwords: &[String],
    ) -> Result<Vec<FoundEntry>, StorageError> {
        self.read(|conn| dictionaries::find_entries(conn, headwords))
    }

    /// Finds the frequencies and pronunciations that every dictionary stores for any of the terms.
    pub fn find_term_meta(&self, terms: &[String]) -> Result<Vec<FoundTermMeta>, StorageError> {
        self.read(|conn| dictionaries::find_term_meta(conn, terms))
    }

    pub fn find_kanji(&self, characters: &[String]) -> Result<Vec<FoundKanji>, StorageError> {
        self.read(|conn| dictionaries::find_kanji(conn, characters))
    }

    pub fn find_kanji_meta(
        &self,
        characters: &[String],
    ) -> Result<Vec<FoundKanjiMeta>, StorageError> {
        self.read(|conn| dictionaries::find_kanji_meta(conn, characters))
    }

    /// Returns the stylesheets of the given dictionaries in import order, leaving out dictionaries that have none.
    pub fn find_dictionary_stylesheets(
        &self,
        dictionary_ids: &[String],
    ) -> Result<Vec<DictionaryStylesheet>, StorageError> {
        self.read(|conn| dictionaries::find_stylesheets(conn, dictionary_ids))
    }

    /// Returns a file stored with a dictionary, by the path its definitions use.
    pub fn get_dictionary_media(
        &self,
        id: &DictionaryId,
        path: &str,
    ) -> Result<DictionaryMedia, StorageError> {
        self.read(|conn| dictionaries::get_media(conn, id, path))
    }
}


#[cfg(test)]
mod tests {
    use super::*;

    fn query_pragma<T: rusqlite::types::FromSql>(storage: &Storage, name: &str) -> T {
        storage
            .write(|conn| Ok(conn.pragma_query_value(None, name, |row| row.get(0))?))
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

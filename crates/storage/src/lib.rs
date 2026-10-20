//! SQLite persistence for the desktop, mobile, and server builds.
//!
//! `Storage` can be shared between threads. Writes run one at a time,
//! while reads on a database file run beside them and see only what has been committed.

mod alignments;
mod anki_pending_deletions;
mod anki_sync;
mod connections;
mod dictionaries;
mod error;
mod flashcards;
mod media_files;
mod migrations;
mod new_row;
mod preferences;
mod projects;
mod referenced_paths;
mod review;
mod review_answers;
mod review_holds;
mod review_parameters;
mod review_rows;
#[cfg(test)]
mod review_test_support;
mod sample_content;
mod stored_integer;
mod subtitle_tracks;

pub use anki_sync::DeliveredPackage;
pub use dictionaries::{DictionaryCounts, DictionaryId, StoredDictionary};
pub use error::StorageError;
pub use sample_content::SampleContentError;
pub use subtitle_tracks::{NewSubtitleTrack, StoredSubtitleTrack};

use std::collections::HashMap;
use std::path::Path;

use easyimmerse_core::alignment::{AddAlignmentRequest, Alignment, AlignmentId};
use easyimmerse_core::dictionary::{
    DictionaryError, DictionaryMedia, DictionarySink, DictionarySource,
};
use easyimmerse_core::flashcard::{AnkiPendingDeletion, Flashcard, FlashcardDraft, FlashcardId};
use easyimmerse_core::lookup::{
    DictionaryStylesheet, FoundEntry, FoundKanji, FoundKanjiMeta, FoundTermMeta,
};
use easyimmerse_core::media_file::{MediaFile, MediaFileId, MediaFileSource, MediaOrigin};
use easyimmerse_core::project::{Project, ProjectId, ProjectSettings};
use easyimmerse_core::review::{
    ReviewAllowanceRequest, ReviewAnswerRequest, ReviewAnswerResponse, ReviewAnswerUndone,
    ReviewCounts, ReviewHoldRequest, ReviewLogEntry, ReviewProgress, ReviewQueue, ReviewSummary,
};
use easyimmerse_core::subtitle_track::{SubtitleSelection, SubtitleTrack, SubtitleTrackId};
use rusqlite::Connection;

use connections::Connections;
use easyimmerse_srs::ReviewMoment;

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

    /// Turns AnkiConnect on or off for the project.
    pub fn set_uses_anki_connect(
        &self,
        id: &ProjectId,
        uses_anki_connect: bool,
    ) -> Result<(), StorageError> {
        self.write(|conn| projects::set_uses_anki_connect(conn, id, uses_anki_connect))
    }

    pub fn seed_placeholder_projects(&self) -> Result<(), StorageError> {
        self.write(|conn| projects::seed_placeholder_projects(conn))
    }

    /// Gives each placeholder project that has no media a video with subtitles,
    /// and imports small Spanish and Japanese dictionaries, once per database.
    /// The video and the English subtitles are read from `fixtures_dir`.
    pub fn seed_sample_content(&self, fixtures_dir: &Path) -> Result<(), SampleContentError> {
        sample_content::seed_sample_content(self, fixtures_dir)
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

    /// Records where a media-source plugin fetched the media file from.
    pub fn set_media_file_origin(
        &self,
        id: &MediaFileId,
        origin: &MediaOrigin,
    ) -> Result<(), StorageError> {
        self.write(|conn| media_files::set_media_file_origin(conn, id, origin))
    }

    /// Stores the user's track choice for a media file; `None` clears it.
    pub fn set_track_selection_json(
        &self,
        id: &MediaFileId,
        track_selection_json: Option<&str>,
    ) -> Result<(), StorageError> {
        self.write(|conn| media_files::set_track_selection_json(conn, id, track_selection_json))
    }

    /// Pairs a document with the translation it is read beside; `None` clears the pairing.
    /// The translation must be another media file of the same project.
    pub fn set_translation_document(
        &self,
        id: &MediaFileId,
        translation_media_file_id: Option<&MediaFileId>,
    ) -> Result<(), StorageError> {
        self.write(|conn| {
            media_files::set_translation_document(conn, id, translation_media_file_id)
        })
    }

    /// Lists a document's alignments, newest first.
    pub fn list_alignments(
        &self,
        media_file_id: &MediaFileId,
    ) -> Result<Vec<Alignment>, StorageError> {
        self.read(|conn| alignments::list_alignments(conn, media_file_id))
    }

    /// Adds an alignment to a document. Its counterpart must be another media file of the
    /// same project.
    pub fn add_alignment(
        &self,
        media_file_id: &MediaFileId,
        request: &AddAlignmentRequest,
    ) -> Result<Alignment, StorageError> {
        self.write(|conn| alignments::add_alignment(conn, media_file_id, request))
    }

    /// Removes one of a document's alignments.
    pub fn remove_alignment(
        &self,
        media_file_id: &MediaFileId,
        alignment_id: &AlignmentId,
    ) -> Result<(), StorageError> {
        self.write(|conn| alignments::remove_alignment(conn, media_file_id, alignment_id))
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
        id: &FlashcardId,
        draft: &FlashcardDraft,
    ) -> Result<Flashcard, StorageError> {
        self.write(|conn| flashcards::create_flashcard(conn, project_id, id, draft))
    }

    pub fn update_flashcard(
        &self,
        id: &FlashcardId,
        draft: &FlashcardDraft,
    ) -> Result<Flashcard, StorageError> {
        self.write(|conn| flashcards::update_flashcard(conn, id, draft))
    }

    /// Deletes a flashcard. When its note may be in Anki and its project uses AnkiConnect or lists such deletions,
    /// the deletion of its note from Anki is recorded in the same transaction.
    pub fn delete_flashcard(&self, id: &FlashcardId) -> Result<(), StorageError> {
        self.write(|conn| flashcards::delete_flashcard(conn, id))
    }

    /// Lists the project's deleted flashcards whose notes may still be in Anki, oldest first.
    pub fn list_anki_pending_deletions(
        &self,
        project_id: &ProjectId,
    ) -> Result<Vec<AnkiPendingDeletion>, StorageError> {
        self.read(|conn| anki_pending_deletions::list_anki_pending_deletions(conn, project_id))
    }

    /// Removes the named deletions from the project in one transaction, as when the user marks them done.
    pub fn clear_anki_pending_deletions(
        &self,
        project_id: &ProjectId,
        flashcard_ids: &[FlashcardId],
    ) -> Result<(), StorageError> {
        self.write(|conn| {
            anki_pending_deletions::clear_anki_pending_deletions(conn, project_id, flashcard_ids)
        })
    }

    /// Forgets that a flashcard's note is to be deleted from Anki, once the client has deleted it.
    pub fn clear_anki_pending_deletion(
        &self,
        project_id: &ProjectId,
        flashcard_id: &FlashcardId,
    ) -> Result<(), StorageError> {
        self.write(|conn| {
            anki_pending_deletions::clear_anki_pending_deletion(conn, project_id, flashcard_id)
        })
    }

    /// Records a delivered package in one transaction: a package held its flashcards, which are marked exported when it says so.
    /// A flashcard of another project, or one that is gone, is passed over.
    pub fn record_anki_export(&self, package: &DeliveredPackage) -> Result<(), StorageError> {
        self.write(|conn| anki_sync::record_anki_export(conn, package))
    }

    /// Records that AnkiConnect put the project's flashcards into Anki as they were read at `sent_at_ms`, in one transaction.
    /// A flashcard of another project is passed over,
    /// and the note of a flashcard deleted since the send began is recorded as to be deleted from Anki.
    pub fn record_anki_send(
        &self,
        project_id: &ProjectId,
        ids: &[FlashcardId],
        sent_at_ms: u64,
    ) -> Result<(), StorageError> {
        self.write(|conn| anki_sync::record_anki_send(conn, project_id, ids, sent_at_ms))
    }

    /// What waits in the project's review on the moment's local day.
    pub fn review_summary(
        &self,
        project_id: &ProjectId,
        moment: ReviewMoment,
    ) -> Result<ReviewSummary, StorageError> {
        self.read(|conn| review::review_summary(conn, project_id, moment))
    }

    /// What waits in each project's review on the moment's local day, counted as the queue counts it.
    pub fn list_review_counts(
        &self,
        moment: ReviewMoment,
    ) -> Result<Vec<ReviewCounts>, StorageError> {
        self.read(|conn| review::list_review_counts(conn, moment))
    }

    /// The cards of a review session at `moment`, in the order they are shown, each with the intervals its ratings would give.
    pub fn review_queue(
        &self,
        project_id: &ProjectId,
        moment: ReviewMoment,
    ) -> Result<ReviewQueue, StorageError> {
        self.read(|conn| review::review_queue(conn, project_id, moment))
    }

    /// Answers a flashcard of the project in one transaction, stamping the answer at `now_ms`
    /// or just after the project's latest answer when that is later.
    pub fn answer_review(
        &self,
        project_id: &ProjectId,
        request: &ReviewAnswerRequest,
        now_ms: u64,
    ) -> Result<ReviewAnswerResponse, StorageError> {
        self.write(|conn| review_answers::answer_review(conn, project_id, request, now_ms))
    }

    /// Undoes the project's latest answer, which must have been given at `answered_at_ms`, and restores the card's previous schedule.
    pub fn undo_review_answer(
        &self,
        project_id: &ProjectId,
        answered_at_ms: u64,
        moment: ReviewMoment,
    ) -> Result<ReviewAnswerUndone, StorageError> {
        self.write(|conn| {
            review_answers::undo_review_answer(conn, project_id, answered_at_ms, moment)
        })
    }

    /// Sets a flashcard of the project aside from the review: buries it until the local day of `now_ms` ends, or suspends it.
    pub fn hold_review_card(
        &self,
        project_id: &ProjectId,
        flashcard_id: &FlashcardId,
        request: &ReviewHoldRequest,
        now_ms: u64,
    ) -> Result<(), StorageError> {
        self.write(|conn| {
            review_holds::hold_review_card(conn, project_id, flashcard_id, request, now_ms)
        })
    }

    /// Brings a flashcard of the project back into the review, as unburying or unsuspending it does.
    pub fn lift_review_hold(
        &self,
        project_id: &ProjectId,
        flashcard_id: &FlashcardId,
    ) -> Result<(), StorageError> {
        self.write(|conn| review_holds::lift_review_hold(conn, project_id, flashcard_id))
    }

    /// Every answer of every project to fit the FSRS parameters to, when a fit is due at `moment` and there are enough answers for it.
    /// The fit runs outside the database, and `save_review_parameters` keeps its result.
    pub fn log_to_fit(
        &self,
        moment: ReviewMoment,
    ) -> Result<Option<Vec<ReviewLogEntry>>, StorageError> {
        self.read(|conn| review_parameters::log_to_fit(conn, moment))
    }

    /// Keeps the FSRS parameters of a fit begun at `fitted_at_ms`, which schedule every review from now on.
    pub fn save_review_parameters(
        &self,
        weights: &[f32],
        fitted_at_ms: u64,
    ) -> Result<(), StorageError> {
        self.write(|conn| review_parameters::save_review_parameters(conn, weights, fitted_at_ms))
    }

    /// Raises the number of new cards and of reviews the project's review shows on the local day of `now_ms`.
    pub fn raise_review_allowance(
        &self,
        project_id: &ProjectId,
        request: &ReviewAllowanceRequest,
        now_ms: u64,
    ) -> Result<(), StorageError> {
        self.write(|conn| review_answers::raise_review_allowance(conn, project_id, request, now_ms))
    }

    /// The schedule, the answers and the hold at `at_ms` of each of the project's flashcards that has been answered or set aside, for the Anki export.
    pub fn list_review_progress(
        &self,
        project_id: &ProjectId,
        at_ms: u64,
    ) -> Result<HashMap<FlashcardId, ReviewProgress>, StorageError> {
        self.read(|conn| review::list_review_progress(conn, project_id, at_ms))
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

    /// Whether a media file or a subtitle track names `path`, exactly as stored.
    pub fn is_path_referenced(&self, path: &str) -> Result<bool, StorageError> {
        self.read(|conn| referenced_paths::is_path_referenced(conn, path))
    }

    /// Whether a media file or a subtitle track names a path inside the directory `dir`,
    /// comparing paths exactly as stored.
    pub fn is_path_referenced_inside(&self, dir: &str) -> Result<bool, StorageError> {
        self.read(|conn| referenced_paths::is_path_referenced_inside(conn, dir))
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
        self.write(|conn| subtitle_tracks::set_subtitle_selection(conn, media_file_id, selection))
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

    /// Imports the dictionary that `read` passes to the sink, in one transaction, and returns its new id.
    /// The caller may wrap the sink, for example to count what it stores.
    pub fn import_dictionary_with(
        &self,
        read: impl FnOnce(&mut dyn DictionarySink) -> Result<(), DictionaryError>,
    ) -> Result<DictionaryId, StorageError> {
        let imported_at = new_row::now_ms();
        self.write(|conn| dictionaries::import_with(conn, imported_at, read))
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

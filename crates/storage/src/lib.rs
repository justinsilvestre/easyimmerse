//! SQLite persistence for the desktop, mobile, and server builds.
//!
//! `Storage` can be shared between threads. Writes run one at a time,
//! while reads on a database file run beside them and see only what has been committed.

mod alignments;
mod anki_pending_deletions;
mod anki_sync;
mod connections;
mod dictionaries;
mod email_tokens;
mod error;
mod flashcards;
mod library_items;
mod library_segments;
mod library_settings;
mod media_copies;
#[cfg(test)]
mod media_copies_tests;
mod media_files;
mod migrations;
mod new_row;
mod owned_paths;
mod owners;
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
mod sessions;
mod stored_integer;
mod subtitle_tracks;
mod sync;
mod users;

pub use anki_sync::DeliveredPackage;
pub use dictionaries::{DictionaryCounts, DictionaryDump, DictionaryId, StoredDictionary};
pub use email_tokens::{EmailTokenPurpose, NewEmailToken};
pub use error::StorageError;
pub use media_copies::{MediaCopy, NewMediaCopy};
pub use owned_paths::OwnedPath;
pub use owners::{LAUNCH_OWNER, OwnerId};
pub use preferences::is_synced_preference;
pub use sample_content::SampleContentError;
pub use sessions::{LiveSession, NewSession, StoredSession};
pub use subtitle_tracks::{NewSubtitleTrack, StoredSubtitleTrack};
pub use sync::apply_pushed::{PushRejection, PushVerdict, PushedChange};
pub use sync::changes::{PendingRow, SyncChange, SyncChangesPage};
pub use sync::codec::RowData;
pub use sync::conflict_descriptions::RowNames;
pub use sync::conflicts::NewConflict;
pub use sync::inbox::{AppliedInbox, PulledRow};
pub use sync::push_answers::{AnsweredPush, PushAnswer};
pub use sync::remotes::{NewRemote, RemoteKind, StoredRemote};
pub use sync::tables::SyncTable;
pub use users::StoredUser;

use std::collections::HashMap;
use std::path::Path;

use easyimmerse_core::account::{AccountRole, AccountUser, UsersPage};
use easyimmerse_core::alignment::{AddAlignmentRequest, Alignment, AlignmentId};
use easyimmerse_core::dictionary::{
    DictionaryError, DictionaryMedia, DictionarySink, DictionarySource,
};
use easyimmerse_core::flashcard::{AnkiPendingDeletion, Flashcard, FlashcardDraft, FlashcardId};
use easyimmerse_core::library::{
    LibraryCover, LibraryEntry, LibraryItem, LibraryItemDraft, LibraryItemId, LibraryItemStatus,
    LibrarySegment, LibrarySettings, LibraryText, LibraryWord,
};
use easyimmerse_core::lookup::{
    DictionaryStylesheet, FoundEntry, FoundKanji, FoundKanjiMeta, FoundTermMeta,
};
use easyimmerse_core::media_copy::StoredCopy;
use easyimmerse_core::media_file::{MediaFile, MediaFileId, MediaFileSource, MediaOrigin};
use easyimmerse_core::project::{Project, ProjectId, ProjectSettings};
use easyimmerse_core::review::{
    ReviewAllowanceRequest, ReviewAnswerId, ReviewAnswerRequest, ReviewAnswerResponse,
    ReviewAnswerUndone, ReviewCounts, ReviewHoldRequest, ReviewLogEntry, ReviewProgress,
    ReviewQueue, ReviewSummary,
};
use easyimmerse_core::subtitle_track::{SubtitleSelection, SubtitleTrack, SubtitleTrackId};
use easyimmerse_core::sync::SyncConflict;
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

    /// Checks that every row the path names exists and belongs to the owner,
    /// answering a row of another owner with the same not-found error as a missing one.
    pub fn check_owned_path(&self, owner: &OwnerId, path: &OwnedPath) -> Result<(), StorageError> {
        self.read(|conn| owned_paths::check_owned_path(conn, owner, path))
    }

    /// Lists the owner's projects, most recently opened first.
    pub fn list_projects(&self, owner: &OwnerId) -> Result<Vec<Project>, StorageError> {
        self.read(|conn| projects::list_projects(conn, owner))
    }

    pub fn get_project(&self, id: &ProjectId) -> Result<Project, StorageError> {
        self.read(|conn| projects::get_project(conn, id))
    }

    pub fn create_project(
        &self,
        owner: &OwnerId,
        settings: &ProjectSettings,
    ) -> Result<Project, StorageError> {
        self.write(|conn| projects::create_project(conn, owner, settings))
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

    /// Gives the owner two example projects when it has none, so that a new installation has something to show.
    pub fn seed_placeholder_projects(&self, owner: &OwnerId) -> Result<(), StorageError> {
        let ids = [
            ProjectId(new_row::generate_id()),
            ProjectId(new_row::generate_id()),
        ];
        self.seed_placeholder_projects_with_ids(owner, &ids)
    }

    /// Seeds the placeholder projects under the given ids, for tests that name them.
    pub fn seed_placeholder_projects_with_ids(
        &self,
        owner: &OwnerId,
        ids: &[ProjectId; 2],
    ) -> Result<(), StorageError> {
        self.write(|conn| projects::seed_placeholder_projects(conn, owner, ids))
    }

    /// Gives each of the launch owner's placeholder projects that has no media a video with subtitles,
    /// and imports small Spanish and Japanese dictionaries for it, once per database.
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

    /// Saves a flashcard the server built from a library item, which cannot be changed afterwards.
    pub fn create_library_flashcard(
        &self,
        project_id: &ProjectId,
        id: &FlashcardId,
        draft: &FlashcardDraft,
    ) -> Result<Flashcard, StorageError> {
        self.write(|conn| flashcards::create_library_flashcard(conn, project_id, id, draft))
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

    /// What waits in the review of each of the owner's projects on the moment's local day, counted as the queue counts it.
    pub fn list_review_counts(
        &self,
        owner: &OwnerId,
        moment: ReviewMoment,
    ) -> Result<Vec<ReviewCounts>, StorageError> {
        self.read(|conn| review::list_review_counts(conn, owner, moment))
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

    /// Undoes the project's latest answer, which must be the answer with the id, and restores the card's previous schedule.
    pub fn undo_review_answer(
        &self,
        project_id: &ProjectId,
        answer_id: &ReviewAnswerId,
        moment: ReviewMoment,
    ) -> Result<ReviewAnswerUndone, StorageError> {
        self.write(|conn| review_answers::undo_review_answer(conn, project_id, answer_id, moment))
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

    /// Every answer of the owner's projects to fit the FSRS parameters to, when a fit is due at `moment` and there are enough answers for it.
    /// The fit runs outside the database, and `save_review_parameters` keeps its result.
    pub fn log_to_fit(
        &self,
        owner: &OwnerId,
        moment: ReviewMoment,
    ) -> Result<Option<Vec<ReviewLogEntry>>, StorageError> {
        self.read(|conn| review_parameters::log_to_fit(conn, owner, moment))
    }

    /// Keeps the FSRS parameters of a fit begun at `fitted_at_ms`, which schedule the owner's reviews from now on.
    pub fn save_review_parameters(
        &self,
        owner: &OwnerId,
        weights: &[f32],
        fitted_at_ms: u64,
    ) -> Result<(), StorageError> {
        self.write(|conn| {
            review_parameters::save_review_parameters(conn, owner, weights, fitted_at_ms)
        })
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

    pub fn get_preference(
        &self,
        owner: &OwnerId,
        key: &str,
    ) -> Result<Option<String>, StorageError> {
        self.read(|conn| preferences::get_preference(conn, owner, key))
    }

    pub fn set_preference(
        &self,
        owner: &OwnerId,
        key: &str,
        value: &str,
    ) -> Result<(), StorageError> {
        self.write(|conn| preferences::set_preference(conn, owner, key, value))
    }

    /// Creates an account and the owner of its data, unless one already has the email address in any letter case.
    /// The password must already be hashed.
    pub fn create_user(
        &self,
        email: &str,
        password_hash: &str,
        role: AccountRole,
    ) -> Result<AccountUser, StorageError> {
        self.write(|conn| users::create_user(conn, email, password_hash, role))
    }

    pub fn get_user(&self, id: &str) -> Result<AccountUser, StorageError> {
        self.read(|conn| users::get_user(conn, id))
    }

    /// Finds the account with the email address, compared without regard to letter case.
    pub fn find_user_by_email(&self, email: &str) -> Result<Option<StoredUser>, StorageError> {
        self.read(|conn| users::find_user_by_email(conn, email))
    }

    /// Lists every account, oldest first.
    pub fn list_users(&self) -> Result<Vec<AccountUser>, StorageError> {
        self.read(users::list_users)
    }

    /// Lists, oldest first, `limit` of the accounts whose email address contains the search, after skipping `offset` of them,
    /// together with how many match it in all.
    pub fn list_users_page(
        &self,
        search: &str,
        offset: u64,
        limit: u64,
    ) -> Result<UsersPage, StorageError> {
        self.read(|conn| users::list_users_page(conn, search, offset, limit))
    }

    pub fn set_user_role(&self, id: &str, role: AccountRole) -> Result<AccountUser, StorageError> {
        self.write(|conn| users::set_user_role(conn, id, role))
    }

    /// Lets the account manage the server's library, or stops it.
    pub fn set_library_manager(
        &self,
        id: &str,
        manages_library: bool,
    ) -> Result<AccountUser, StorageError> {
        self.write(|conn| users::set_library_manager(conn, id, manages_library))
    }

    /// Replaces the password hash of an account and ends all of its sessions.
    pub fn set_password_hash(&self, id: &str, password_hash: &str) -> Result<(), StorageError> {
        self.write(|conn| users::set_password_hash(conn, id, password_hash))
    }

    /// Deletes an account together with its sessions and all of its data.
    pub fn delete_user(&self, id: &str) -> Result<(), StorageError> {
        self.write(|conn| users::delete_user(conn, id))
    }

    /// Records that the owner of the account confirmed its email address at `at_ms`, unless they did so before.
    pub fn confirm_email(&self, id: &str, at_ms: u64) -> Result<(), StorageError> {
        self.write(|conn| users::confirm_email(conn, id, at_ms))
    }

    /// Records a session, last used when it was created, and returns its new id.
    pub fn create_session(&self, session: &NewSession) -> Result<String, StorageError> {
        self.write(|conn| sessions::create_session(conn, session))
    }

    /// Finds the session stored under the token hash, unless it has expired by `now_ms`.
    /// An expired session is deleted. The lookup itself does not wait for a write in progress.
    pub fn find_live_session(
        &self,
        token_hash: &str,
        now_ms: u64,
    ) -> Result<Option<LiveSession>, StorageError> {
        match self.read(|conn| sessions::find_session(conn, token_hash))? {
            Some(session) if session.expires_at_ms > now_ms => Ok(Some(session)),
            Some(_) => self
                .write(|conn| sessions::delete_session(conn, token_hash))
                .map(|()| None),
            None => Ok(None),
        }
    }

    /// Records when the session was last used, and moves its expiry when `expires_at_ms` is given.
    pub fn refresh_session(
        &self,
        token_hash: &str,
        last_used_at_ms: u64,
        expires_at_ms: Option<u64>,
    ) -> Result<(), StorageError> {
        self.write(|conn| {
            sessions::refresh_session(conn, token_hash, last_used_at_ms, expires_at_ms)
        })
    }

    /// Lists the sessions of the user, most recently used first.
    pub fn list_sessions(&self, user_id: &str) -> Result<Vec<StoredSession>, StorageError> {
        self.read(|conn| sessions::list_sessions(conn, user_id))
    }

    pub fn delete_session(&self, token_hash: &str) -> Result<(), StorageError> {
        self.write(|conn| sessions::delete_session(conn, token_hash))
    }

    /// Deletes the session with the id, unless it belongs to another user or does not exist.
    pub fn delete_session_by_id(&self, user_id: &str, id: &str) -> Result<(), StorageError> {
        self.write(|conn| sessions::delete_session_by_id(conn, user_id, id))
    }

    /// Deletes every session that expired at or before `now_ms` and returns how many there were.
    pub fn delete_expired_sessions(&self, now_ms: u64) -> Result<usize, StorageError> {
        self.write(|conn| sessions::delete_expired_sessions(conn, now_ms))
    }

    /// Records the token of a mailed link, replacing the user's earlier tokens of the same purpose.
    pub fn issue_email_token(&self, token: &NewEmailToken) -> Result<(), StorageError> {
        self.write(|conn| email_tokens::issue_email_token(conn, token))
    }

    /// Deletes the token stored under the hash for the purpose and returns its user's id,
    /// or None when there is no such token or it expired by `now_ms`.
    pub fn take_email_token(
        &self,
        token_hash: &str,
        purpose: EmailTokenPurpose,
        now_ms: u64,
    ) -> Result<Option<String>, StorageError> {
        self.write(|conn| email_tokens::take_email_token(conn, token_hash, purpose, now_ms))
    }

    /// Takes a confirmation token and records that its user confirmed their address at `now_ms`.
    /// Returns whether the token was live.
    pub fn confirm_email_with_token(
        &self,
        token_hash: &str,
        now_ms: u64,
    ) -> Result<bool, StorageError> {
        self.write(|conn| email_tokens::confirm_email_with_token(conn, token_hash, now_ms))
    }

    /// Imports a dictionary of the owner from its files in one transaction and returns its new id.
    /// Other writes wait until the import finishes; reads do not.
    pub fn import_dictionary(
        &self,
        owner: &OwnerId,
        source: &mut DictionarySource,
    ) -> Result<DictionaryId, StorageError> {
        let imported_at = new_row::now_ms();
        self.write(|conn| dictionaries::import_dictionary(conn, owner, source, imported_at))
    }

    /// Imports the dictionary that `read` passes to the sink as the owner's, in one transaction, and returns its new id.
    /// The caller may wrap the sink, for example to count what it stores.
    pub fn import_dictionary_with(
        &self,
        owner: &OwnerId,
        read: impl FnOnce(&mut dyn DictionarySink) -> Result<(), DictionaryError>,
    ) -> Result<DictionaryId, StorageError> {
        let imported_at = new_row::now_ms();
        self.write(|conn| dictionaries::import_with(conn, owner, imported_at, read))
    }

    /// Begins a dump of a dictionary of the owner, for another server to import whole.
    pub fn start_dictionary_dump(
        &self,
        owner: &OwnerId,
        id: &DictionaryId,
    ) -> Result<DictionaryDump, StorageError> {
        self.read(|conn| dictionaries::start_dump(conn, owner, id))
    }

    /// Passes the next page of the dump to the sink, and tells whether any content remains.
    /// Each page takes the reader on its own, so a slow receiver never holds up other reads.
    pub fn continue_dictionary_dump(
        &self,
        dump: &mut DictionaryDump,
        sink: &mut dyn DictionarySink,
    ) -> Result<bool, StorageError> {
        self.read(|conn| dictionaries::continue_dump(conn, dump, sink))
    }

    /// Imports a dictionary that a device uploads, under its own id, and returns the time its registry entry took.
    pub fn store_synced_dictionary(
        &self,
        owner: &OwnerId,
        id: &DictionaryId,
        imported_at: u64,
        read: impl FnOnce(&mut dyn DictionarySink) -> Result<(), DictionaryError>,
    ) -> Result<u64, StorageError> {
        self.write(|conn| {
            sync::dictionary_rows::store_dictionary(conn, owner, id, imported_at, read)
        })
    }

    /// Imports a dictionary pulled from the remote under its id and settles its inbox row.
    pub fn store_pulled_dictionary(
        &self,
        remote: &StoredRemote,
        row: &PulledRow,
        imported_at: u64,
        read: impl FnOnce(&mut dyn DictionarySink) -> Result<(), DictionaryError>,
    ) -> Result<(), StorageError> {
        self.write(|conn| {
            sync::dictionary_rows::store_pulled_dictionary(conn, remote, row, imported_at, read)
        })
    }

    /// Settles the inbox row of a pulled dictionary that this server will not import.
    pub fn settle_pulled_dictionary(
        &self,
        remote: &StoredRemote,
        row: &PulledRow,
    ) -> Result<(), StorageError> {
        self.write(|conn| sync::dictionary_rows::settle_pulled_dictionary(conn, remote, row))
    }

    /// The owner's dictionaries that the remote is not known to hold, each with its modification time here.
    pub fn dictionaries_to_upload(
        &self,
        owner: &OwnerId,
        remote_id: &str,
    ) -> Result<Vec<(DictionaryId, u64)>, StorageError> {
        self.read(|conn| sync::dictionary_rows::dictionaries_to_upload(conn, owner, remote_id))
    }

    /// Records that the remote stored an uploaded dictionary at its own time, which this server takes too.
    pub fn record_uploaded_dictionary(
        &self,
        owner: &OwnerId,
        remote_id: &str,
        id: &DictionaryId,
        remote_updated_at_ms: u64,
    ) -> Result<(), StorageError> {
        self.write(|conn| {
            sync::dictionary_rows::record_uploaded_dictionary(
                conn,
                owner,
                remote_id,
                id,
                remote_updated_at_ms,
            )
        })
    }

    /// Lists the owner's dictionaries in the order they were imported.
    pub fn list_dictionaries(
        &self,
        owner: &OwnerId,
    ) -> Result<Vec<StoredDictionary>, StorageError> {
        self.read(|conn| dictionaries::list_dictionaries(conn, owner))
    }

    pub fn get_dictionary(&self, id: &DictionaryId) -> Result<StoredDictionary, StorageError> {
        self.read(|conn| dictionaries::get_dictionary(conn, id))
    }

    /// Deletes a dictionary together with everything it stored.
    pub fn delete_dictionary(&self, id: &DictionaryId) -> Result<(), StorageError> {
        self.write(|conn| dictionaries::delete_dictionary(conn, id))
    }

    /// Finds the entries of every dictionary of the owner stored under any of the headwords, ignoring case.
    pub fn find_dictionary_entries(
        &self,
        owner: &OwnerId,
        headwords: &[String],
    ) -> Result<Vec<FoundEntry>, StorageError> {
        self.read(|conn| dictionaries::find_entries(conn, owner, headwords))
    }

    /// Finds the frequencies and pronunciations that every dictionary of the owner stores for any of the terms.
    pub fn find_term_meta(
        &self,
        owner: &OwnerId,
        terms: &[String],
    ) -> Result<Vec<FoundTermMeta>, StorageError> {
        self.read(|conn| dictionaries::find_term_meta(conn, owner, terms))
    }

    pub fn find_kanji(
        &self,
        owner: &OwnerId,
        characters: &[String],
    ) -> Result<Vec<FoundKanji>, StorageError> {
        self.read(|conn| dictionaries::find_kanji(conn, owner, characters))
    }

    pub fn find_kanji_meta(
        &self,
        owner: &OwnerId,
        characters: &[String],
    ) -> Result<Vec<FoundKanjiMeta>, StorageError> {
        self.read(|conn| dictionaries::find_kanji_meta(conn, owner, characters))
    }

    /// Returns the stylesheets of the owner's given dictionaries in import order, leaving out dictionaries that have none.
    pub fn find_dictionary_stylesheets(
        &self,
        owner: &OwnerId,
        dictionary_ids: &[String],
    ) -> Result<Vec<DictionaryStylesheet>, StorageError> {
        self.read(|conn| dictionaries::find_stylesheets(conn, owner, dictionary_ids))
    }

    /// The owner's synced changes after `cursor`, at most `limit` of them, in the order they were made.
    pub fn changes_since(
        &self,
        owner: &OwnerId,
        cursor: u64,
        limit: u32,
    ) -> Result<SyncChangesPage, StorageError> {
        self.read(|conn| sync::changes::changes_since(conn, owner, cursor, limit))
    }

    /// Applies the rows a device pushed as the owner's, in one transaction, and answers each in order.
    /// A modification time more than a minute ahead of `now_ms` is taken as `now_ms`.
    pub fn apply_pushed_batch(
        &self,
        owner: &OwnerId,
        rows: &[PushedChange],
        now_ms: u64,
    ) -> Result<Vec<PushVerdict>, StorageError> {
        self.write(|conn| sync::apply_pushed::apply_pushed_batch(conn, owner, rows, now_ms))
    }

    /// The last change sequence this server gave out.
    pub fn local_change_seq(&self) -> Result<u64, StorageError> {
        self.read(sync::changes::local_change_seq)
    }

    /// The owner's changes that the remote has yet to receive, up to `through_seq`, in the order to push them.
    pub fn pending_pushes(
        &self,
        owner: &OwnerId,
        remote_id: &str,
        through_seq: u64,
    ) -> Result<Vec<PendingRow>, StorageError> {
        self.read(|conn| sync::changes::pending_pushes(conn, owner, remote_id, through_seq))
    }

    /// Links an owner to a remote; an owner has at most one remote of each kind.
    pub fn create_sync_remote(&self, remote: &NewRemote) -> Result<StoredRemote, StorageError> {
        self.write(|conn| sync::remotes::create_remote(conn, remote))
    }

    pub fn get_sync_remote(
        &self,
        owner: &OwnerId,
        kind: RemoteKind,
    ) -> Result<Option<StoredRemote>, StorageError> {
        self.read(|conn| sync::remotes::get_remote(conn, owner, kind))
    }

    /// Records that the remote holds every change of this server up to `seq`.
    pub fn set_sync_pushed_through(&self, remote_id: &str, seq: u64) -> Result<(), StorageError> {
        self.write(|conn| sync::remotes::set_pushed_through(conn, remote_id, seq))
    }

    /// Records when a round of syncing with the remote last finished.
    pub fn set_sync_last_synced(&self, remote_id: &str, at_ms: u64) -> Result<(), StorageError> {
        self.write(|conn| sync::remotes::set_last_synced(conn, remote_id, at_ms))
    }

    /// Forgets the remote together with what it was known to hold.
    pub fn delete_sync_remote(&self, remote_id: &str) -> Result<(), StorageError> {
        self.write(|conn| sync::remotes::delete_remote(conn, remote_id))
    }

    /// Records the modification time the remote has for a row.
    pub fn record_sync_base(
        &self,
        remote_id: &str,
        table: SyncTable,
        key: &str,
        updated_at_ms: u64,
    ) -> Result<(), StorageError> {
        self.write(|conn| sync::remotes::record_base(conn, remote_id, table, key, updated_at_ms))
    }

    /// Links the owner to a remote, keeping a logged-out link to the same account and replacing one to another.
    pub fn link_sync_remote(&self, remote: &NewRemote) -> Result<StoredRemote, StorageError> {
        self.write(|conn| sync::remotes::link_remote(conn, remote))
    }

    /// Forgets the session token after the remote logged this server out.
    pub fn forget_sync_session_token(&self, remote_id: &str) -> Result<(), StorageError> {
        self.write(|conn| sync::remotes::forget_session_token(conn, remote_id))
    }

    /// Keeps a page of pulled rows in the inbox and moves the pull cursor past it, in one transaction.
    pub fn receive_sync_page(
        &self,
        remote_id: &str,
        rows: &[PulledRow],
        next_cursor: u64,
    ) -> Result<(), StorageError> {
        self.write(|conn| sync::inbox::receive_page(conn, remote_id, rows, next_cursor))
    }

    /// Applies the rows waiting in the remote's inbox, one transaction per rank, parents first.
    pub fn apply_sync_inbox(
        &self,
        remote: &StoredRemote,
        now_ms: u64,
    ) -> Result<AppliedInbox, StorageError> {
        let mut ranks: Vec<u8> = SyncTable::ALL
            .iter()
            .map(|table| table.spec().rank)
            .collect();
        ranks.sort_unstable();
        ranks.dedup();
        let mut applied = AppliedInbox::default();
        for rank in ranks {
            applied.merge(self.write(|conn| sync::inbox::apply_inbox(conn, remote, rank, now_ms))?);
        }
        Ok(applied)
    }

    /// How many pulled rows wait in the remote's inbox.
    pub fn sync_inbox_size(&self, remote_id: &str) -> Result<u64, StorageError> {
        self.read(|conn| sync::inbox::inbox_size(conn, remote_id))
    }

    /// Records the remote's answers to one pushed batch, in one transaction.
    pub fn record_sync_push_answers(
        &self,
        remote: &StoredRemote,
        answers: &[AnsweredPush],
        now_ms: u64,
    ) -> Result<AppliedInbox, StorageError> {
        self.write(|conn| sync::push_answers::record_push_answers(conn, remote, answers, now_ms))
    }

    /// The owner's registry entries of the rows, each with its current data, or None for a row never seen here.
    pub fn sync_changes_of(
        &self,
        owner: &OwnerId,
        rows: &[(SyncTable, String)],
    ) -> Result<Vec<Option<SyncChange>>, StorageError> {
        self.read(|conn| {
            rows.iter()
                .map(|(table, key)| sync::changes::change_of(conn, owner, *table, key))
                .collect()
        })
    }

    pub fn record_sync_conflict(
        &self,
        remote_id: &str,
        conflict: &NewConflict,
    ) -> Result<(), StorageError> {
        self.write(|conn| sync::conflicts::record_conflict(conn, remote_id, conflict))
    }

    /// The remote's most recent conflicts, newest first.
    pub fn list_sync_conflicts(
        &self,
        remote_id: &str,
        limit: u32,
    ) -> Result<Vec<SyncConflict>, StorageError> {
        self.read(|conn| sync::conflicts::list_conflicts(conn, remote_id, Some(limit)))
    }

    /// Every conflict of the remote, newest first.
    pub fn list_every_sync_conflict(
        &self,
        remote_id: &str,
    ) -> Result<Vec<SyncConflict>, StorageError> {
        self.read(|conn| sync::conflicts::list_conflicts(conn, remote_id, None))
    }

    pub fn count_sync_conflicts(&self, remote_id: &str) -> Result<u64, StorageError> {
        self.read(|conn| sync::conflicts::count_conflicts(conn, remote_id))
    }

    pub fn clear_sync_conflicts(&self, remote_id: &str) -> Result<(), StorageError> {
        self.write(|conn| sync::conflicts::clear_conflicts(conn, remote_id))
    }

    /// Records that the remote holds the media file's bytes.
    /// Records a copy of a media file whose file is written, replacing any earlier one, and the choice to keep it.
    pub fn record_media_copy(&self, copy: &NewMediaCopy) -> Result<StoredCopy, StorageError> {
        self.write(|conn| media_copies::record_media_copy(conn, copy))
    }

    pub fn get_media_copy(
        &self,
        media_file_id: &MediaFileId,
    ) -> Result<Option<MediaCopy>, StorageError> {
        self.read(|conn| media_copies::get_media_copy(conn, media_file_id))
    }

    /// Removes the record of a copy and returns the name of its file.
    pub fn remove_media_copy(
        &self,
        media_file_id: &MediaFileId,
    ) -> Result<Option<String>, StorageError> {
        self.write(|conn| media_copies::remove_media_copy(conn, media_file_id))
    }

    /// Lists the owner's stored copies, largest first.
    pub fn list_media_copies(&self, owner: &OwnerId) -> Result<Vec<StoredCopy>, StorageError> {
        self.read(|conn| media_copies::list_media_copies(conn, owner))
    }

    /// How many bytes the owner's stored copies take.
    pub fn media_copies_size(&self, owner: &OwnerId) -> Result<u64, StorageError> {
        self.read(|conn| media_copies::media_copies_size(conn, owner))
    }

    /// Records whether the person wants a copy kept on a server; turning it off removes this server's copy.
    pub fn set_upload_choice(
        &self,
        media_file_id: &MediaFileId,
        is_upload_chosen: bool,
    ) -> Result<MediaFile, StorageError> {
        self.write(|conn| media_copies::set_upload_choice(conn, media_file_id, is_upload_chosen))
    }

    /// Takes the names of the files whose copies are gone, for the caller to delete.
    pub fn take_released_copy_files(&self) -> Result<Vec<String>, StorageError> {
        self.write(media_copies::take_released_copy_files)
    }

    /// Lists the owner's media files chosen for a copy on a server, of which the remote holds none.
    pub fn list_media_files_to_upload(
        &self,
        owner: &OwnerId,
        remote_id: &str,
    ) -> Result<Vec<MediaFile>, StorageError> {
        self.read(|conn| media_files::list_media_files_to_upload(conn, owner, remote_id))
    }

    pub fn record_remote_copy(
        &self,
        remote_id: &str,
        media_file_id: &MediaFileId,
        size_bytes: u64,
    ) -> Result<(), StorageError> {
        self.write(|conn| {
            sync::remote_copies::record_remote_copy(conn, remote_id, media_file_id, size_bytes)
        })
    }

    pub fn forget_remote_copy(
        &self,
        remote_id: &str,
        media_file_id: &MediaFileId,
    ) -> Result<(), StorageError> {
        self.write(|conn| sync::remote_copies::forget_remote_copy(conn, remote_id, media_file_id))
    }

    /// The size of the remote's copy of the media file, or None when it holds none.
    pub fn remote_copy_size(
        &self,
        remote_id: &str,
        media_file_id: &MediaFileId,
    ) -> Result<Option<u64>, StorageError> {
        self.read(|conn| sync::remote_copies::remote_copy_size(conn, remote_id, media_file_id))
    }

    pub fn get_library_settings(&self) -> Result<LibrarySettings, StorageError> {
        self.read(library_settings::get_library_settings)
    }

    /// Replaces the library's settings, refusing with `LibraryHasItems` while the library has any item.
    pub fn set_library_settings(
        &self,
        settings: &LibrarySettings,
    ) -> Result<LibrarySettings, StorageError> {
        self.write(|conn| library_settings::set_library_settings(conn, settings))
    }

    /// Creates a draft library item with no file and no text, refusing with `LibraryLanguageUnset`
    /// while the library's language is unset.
    pub fn create_library_item(
        &self,
        draft: &LibraryItemDraft,
    ) -> Result<LibraryItem, StorageError> {
        self.write(|conn| library_items::create_library_item(conn, draft))
    }

    /// Replaces a library item's metadata, whatever its status.
    pub fn update_library_item(
        &self,
        id: &LibraryItemId,
        draft: &LibraryItemDraft,
    ) -> Result<LibraryItem, StorageError> {
        self.write(|conn| library_items::update_library_item(conn, id, draft))
    }

    pub fn get_library_item(&self, id: &LibraryItemId) -> Result<LibraryItem, StorageError> {
        self.read(|conn| library_items::get_library_item(conn, id))
    }

    /// Lists the published library items, or every item when `include_unpublished` is true, by title.
    pub fn list_library_items(
        &self,
        include_unpublished: bool,
    ) -> Result<Vec<LibraryItem>, StorageError> {
        self.read(|conn| library_items::list_library_items(conn, include_unpublished))
    }

    /// Deletes a library item together with its text. Its files are the caller's to delete.
    pub fn delete_library_item(&self, id: &LibraryItemId) -> Result<(), StorageError> {
        self.write(|conn| library_items::delete_library_item(conn, id))
    }

    /// Records the name and size of the file uploaded for a library item.
    pub fn set_library_file(
        &self,
        id: &LibraryItemId,
        file_name: &str,
        size_bytes: u64,
    ) -> Result<LibraryItem, StorageError> {
        self.write(|conn| library_items::set_library_file(conn, id, file_name, size_bytes))
    }

    pub fn set_library_status(
        &self,
        id: &LibraryItemId,
        status: &LibraryItemStatus,
    ) -> Result<LibraryItem, StorageError> {
        self.write(|conn| library_items::set_library_status(conn, id, status))
    }

    /// Marks a draft or failed library item as being published, and returns it.
    /// Returns None, changing nothing, when the item is already published or being published.
    pub fn begin_library_publish(
        &self,
        id: &LibraryItemId,
    ) -> Result<Option<LibraryItem>, StorageError> {
        self.write(|conn| library_items::begin_library_publish(conn, id))
    }

    /// Marks every library item that was being published as failed with the message, and returns how many there were.
    pub fn fail_interrupted_library_publishes(&self, message: &str) -> Result<usize, StorageError> {
        self.write(|conn| library_items::fail_interrupted_library_publishes(conn, message))
    }

    /// Records the type of the cover picture now kept for the library item, or that it has none.
    pub fn set_library_cover(
        &self,
        id: &LibraryItemId,
        media_type: Option<&str>,
    ) -> Result<LibraryItem, StorageError> {
        self.write(|conn| library_items::set_library_cover(conn, id, media_type))
    }

    /// Records where the library item's cover picture comes from.
    pub fn set_library_cover_choice(
        &self,
        id: &LibraryItemId,
        cover: LibraryCover,
    ) -> Result<LibraryItem, StorageError> {
        self.write(|conn| library_items::set_library_cover_choice(conn, id, cover))
    }

    /// Records the length of a video or audio library item, as probed when it is published.
    pub fn set_library_duration(
        &self,
        id: &LibraryItemId,
        duration_ms: Option<u64>,
    ) -> Result<LibraryItem, StorageError> {
        self.write(|conn| library_items::set_library_duration(conn, id, duration_ms))
    }

    /// Returns the tracks that learners of the library item play, as the JSON of a `TrackSelection`, or None for the default tracks.
    pub fn get_library_track_selection_json(
        &self,
        id: &LibraryItemId,
    ) -> Result<Option<String>, StorageError> {
        self.read(|conn| library_items::get_library_track_selection_json(conn, id))
    }

    /// Records the tracks that learners of the library item play; None leaves the choice to the default tracks.
    pub fn set_library_track_selection_json(
        &self,
        id: &LibraryItemId,
        track_selection_json: Option<&str>,
    ) -> Result<(), StorageError> {
        self.write(|conn| {
            library_items::set_library_track_selection_json(conn, id, track_selection_json)
        })
    }

    /// Replaces a library item's segments and chapter titles with the given text.
    pub fn replace_library_segments(
        &self,
        item_id: &LibraryItemId,
        text: &LibraryText,
    ) -> Result<LibraryText, StorageError> {
        self.write(|conn| library_segments::replace_library_segments(conn, item_id, text))
    }

    /// Replaces the words of one segment of a library item. The caller checks them with `validate_words` first.
    pub fn set_segment_words(
        &self,
        item_id: &LibraryItemId,
        segment_index: u32,
        words: &[LibraryWord],
    ) -> Result<LibrarySegment, StorageError> {
        self.write(|conn| library_segments::set_segment_words(conn, item_id, segment_index, words))
    }

    /// Gives the entry to every word of the library item whose text is `word_text`, and returns the item's text.
    pub fn apply_library_entry(
        &self,
        item_id: &LibraryItemId,
        word_text: &str,
        entry: &LibraryEntry,
    ) -> Result<LibraryText, StorageError> {
        self.write(|conn| library_segments::apply_library_entry(conn, item_id, word_text, entry))
    }

    /// Records the screenshot time of each listed segment, given as pairs of segment index and time.
    pub fn set_screenshot_times(
        &self,
        item_id: &LibraryItemId,
        screenshot_times: &[(u32, u64)],
    ) -> Result<(), StorageError> {
        self.write(|conn| library_segments::set_screenshot_times(conn, item_id, screenshot_times))
    }

    /// Returns a library item's segments in order, with its chapter titles.
    pub fn get_library_text(&self, item_id: &LibraryItemId) -> Result<LibraryText, StorageError> {
        self.read(|conn| library_segments::get_library_text(conn, item_id))
    }

    /// Finds the project's media file of the library item.
    pub fn find_library_media_file(
        &self,
        project_id: &ProjectId,
        item_id: &LibraryItemId,
    ) -> Result<Option<MediaFile>, StorageError> {
        self.read(|conn| media_files::find_library_media_file(conn, project_id, item_id))
    }

    /// Finds the owner's media file of the library item in any of its projects, the one in the project opened last when there are several.
    pub fn find_owners_library_media_file(
        &self,
        owner: &OwnerId,
        item_id: &LibraryItemId,
    ) -> Result<Option<MediaFile>, StorageError> {
        self.read(|conn| media_files::find_owners_library_media_file(conn, owner, item_id))
    }

    /// Stores the track choice of every media file of the library item, in any project; `None` clears it.
    pub fn set_library_media_track_selection_json(
        &self,
        item_id: &LibraryItemId,
        track_selection_json: Option<&str>,
    ) -> Result<(), StorageError> {
        self.write(|conn| {
            media_files::set_library_media_track_selection_json(conn, item_id, track_selection_json)
        })
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
            .set_preference(&OwnerId::launch(), "k", "v")
            .unwrap();
        let reopened = Storage::open(&path).unwrap();
        assert_eq!(
            reopened.get_preference(&OwnerId::launch(), "k").unwrap(),
            Some("v".to_string())
        );
    }
}

//! Fixtures shared by the tests of the review.

use easyimmerse_core::account::AccountRole;
use easyimmerse_core::flashcard::{FlashcardContent, FlashcardDraft, FlashcardId};
use easyimmerse_core::project::{ProjectId, ProjectSettings};
use easyimmerse_core::review::{
    ReviewAnswerId, ReviewAnswerRequest, ReviewAnswerResponse, ReviewRating,
};
use easyimmerse_srs::ReviewMoment;
use rusqlite::params;

use crate::Storage;
use crate::owners::OwnerId;

/// 2026-10-19 12:00 UTC.
pub const NOON_MS: u64 = 1_792_411_200_000;
pub const MINUTE_MS: u64 = 60_000;
pub const DAY_MS: u64 = 86_400_000;

pub fn project() -> ProjectId {
    ProjectId("placeholder-1".to_owned())
}

pub fn other_project() -> ProjectId {
    ProjectId("placeholder-2".to_owned())
}

pub fn at(at_ms: u64) -> ReviewMoment {
    ReviewMoment {
        at_ms,
        utc_offset_min: 0,
    }
}

pub fn launch() -> OwnerId {
    OwnerId::launch()
}

/// Gives the launch owner the placeholder projects under the ids that `project` and `other_project` return.
pub fn seed_known_placeholder_projects(storage: &Storage) {
    storage
        .seed_placeholder_projects_with_ids(&launch(), &[project(), other_project()])
        .unwrap();
}

pub fn seeded_storage() -> Storage {
    let storage = Storage::open_in_memory().unwrap();
    seed_known_placeholder_projects(&storage);
    storage
}

/// The settings of a German project with the given name.
pub fn project_settings(name: &str) -> ProjectSettings {
    ProjectSettings {
        name: name.to_owned(),
        target_language: "de".to_owned(),
        translation_language: "en".to_owned(),
        flashcard_fields: Vec::new(),
        default_tags: Vec::new(),
        tags_media_name: false,
        fills_audio_with_tts: false,
        flashcard_front_fields: Vec::new(),
        lists_anki_deletions: false,
    }
}

/// Creates an account and returns it as an owner.
pub fn account_owner(storage: &Storage) -> OwnerId {
    let email = format!("{}@example.com", crate::new_row::generate_id());
    let user = storage
        .create_user(&email, "hash", AccountRole::LibraryUser)
        .unwrap();
    OwnerId(user.id)
}

/// Copies an answer of the log under another id, as another device that answered in the same millisecond would.
pub fn copy_answer(storage: &Storage, answer_id: &ReviewAnswerId, copy_id: &str) {
    storage
        .write(|conn| {
            conn.execute(
                "CREATE TEMP TABLE copied AS SELECT * FROM review_log WHERE id = ?1",
                params![answer_id.0],
            )?;
            conn.execute("UPDATE copied SET id = ?1", params![copy_id])?;
            conn.execute_batch("INSERT INTO review_log SELECT * FROM copied; DROP TABLE copied")?;
            Ok(())
        })
        .unwrap();
}

/// Makes a flashcard of the word in the project.
pub fn make_flashcard(storage: &Storage, project_id: &ProjectId, word: &str) -> FlashcardId {
    let id = FlashcardId(crate::new_row::generate_id());
    storage
        .create_flashcard(project_id, &id, &draft(word))
        .unwrap();
    id
}

/// Makes flashcards named by number, in order.
pub fn make_flashcards(storage: &Storage, count: usize) -> Vec<FlashcardId> {
    (0..count)
        .map(|index| make_flashcard(storage, &project(), &index.to_string()))
        .collect()
}

pub fn rate(
    storage: &Storage,
    flashcard_id: &FlashcardId,
    rating: ReviewRating,
    at_ms: u64,
) -> ReviewAnswerResponse {
    let request = ReviewAnswerRequest {
        flashcard_id: flashcard_id.clone(),
        rating,
        utc_offset_min: 0,
        duration_ms: 4_000,
    };
    storage.answer_review(&project(), &request, at_ms).unwrap()
}

fn draft(word: &str) -> FlashcardDraft {
    FlashcardDraft {
        media_file_id: None,
        cue_index: None,
        word_start: None,
        content: FlashcardContent {
            word: word.to_owned(),
            word_pronunciation: String::new(),
            l1_definition: String::new(),
            l2_definition: String::new(),
            text_context: String::new(),
            text_context_translation: String::new(),
            text_context_pronunciation: String::new(),
            audio_context: None,
            screenshot: None,
            tags: Vec::new(),
        },
        included_fields: Vec::new(),
    }
}

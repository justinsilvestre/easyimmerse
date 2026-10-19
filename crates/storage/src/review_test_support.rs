//! Fixtures shared by the tests of the review.

use easyimmerse_core::flashcard::{FlashcardContent, FlashcardDraft, FlashcardId};
use easyimmerse_core::project::ProjectId;
use easyimmerse_core::review::{ReviewAnswerRequest, ReviewAnswerResponse, ReviewRating};
use easyimmerse_srs::ReviewMoment;

use crate::Storage;

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

pub fn seeded_storage() -> Storage {
    let storage = Storage::open_in_memory().unwrap();
    storage.seed_placeholder_projects().unwrap();
    storage
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

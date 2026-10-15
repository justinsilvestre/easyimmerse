//! Fixtures shared by the unit tests.

use easyimmerse_core::flashcard::{
    AudioClip, Flashcard, FlashcardContent, FlashcardFieldKey, FlashcardId, Screenshot,
};
use easyimmerse_core::media_file::MediaFileId;
use easyimmerse_core::project::ProjectId;

use crate::deck_spec::DeckSpec;

pub(crate) const FLASHCARD_ID: &str = "0123456789abcdef0123456789abcdef";

pub(crate) const INTERMEDIATE_FRONT: [FlashcardFieldKey; 2] = [
    FlashcardFieldKey::AudioContext,
    FlashcardFieldKey::Screenshot,
];

pub(crate) fn deck_spec() -> DeckSpec<'static> {
    DeckSpec {
        project_id: "project-1",
        project_name: "Die Verwandlung",
        project_created_at_ms: 1_760_000_000_000,
        front_fields: &INTERMEDIATE_FRONT,
    }
}

/// A flashcard made from a video, with every field filled in and included.
pub(crate) fn flashcard() -> Flashcard {
    Flashcard {
        id: FlashcardId(FLASHCARD_ID.to_owned()),
        project_id: ProjectId("project-1".to_owned()),
        media_file_id: Some(MediaFileId("media-1".to_owned())),
        cue_index: Some(3),
        word_start: Some(4),
        content: FlashcardContent {
            word: "Haus".to_owned(),
            word_pronunciation: "haʊ̯s".to_owned(),
            l1_definition: "- house\n- home".to_owned(),
            l2_definition: "ein *Gebäude*".to_owned(),
            text_context: "Das Haus ist alt.".to_owned(),
            text_context_translation: "The house is old.".to_owned(),
            text_context_pronunciation: "das haʊ̯s ɪst alt".to_owned(),
            audio_context: Some(AudioClip {
                start_ms: 1_000,
                end_ms: 2_500,
            }),
            screenshot: Some(Screenshot { at_ms: 1_800 }),
            tags: vec!["chapter one".to_owned(), "noun".to_owned()],
        },
        included_fields: vec![
            FlashcardFieldKey::Word,
            FlashcardFieldKey::WordPronunciation,
            FlashcardFieldKey::L1Definition,
            FlashcardFieldKey::L2Definition,
            FlashcardFieldKey::TextContext,
            FlashcardFieldKey::TextContextTranslation,
            FlashcardFieldKey::TextContextPronunciation,
            FlashcardFieldKey::AudioContext,
            FlashcardFieldKey::Screenshot,
            FlashcardFieldKey::Tags,
        ],
        created_at_ms: 1_760_100_000_000,
        updated_at_ms: 1_760_200_000_000,
        exported_at_ms: None,
        sent_at_ms: None,
    }
}

//! Flashcards: their content, the fields a card shows, and the drafts the editor sends.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::media_file::MediaFileId;
use crate::project::ProjectId;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(transparent)]
#[ts(export)]
pub struct FlashcardId(pub String);

/// A flashcard saved in a project.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct Flashcard {
    pub id: FlashcardId,
    pub project_id: ProjectId,
    /// The media file the card was made from. Null once that file has been removed from the project.
    pub media_file_id: Option<MediaFileId>,
    /// The index of the subtitle cue the card was made from, when it was made from one.
    pub cue_index: Option<u32>,
    pub content: FlashcardContent,
    /// The fields the card shows, in no particular order.
    pub included_fields: Vec<FlashcardFieldKey>,
    /// Milliseconds since the Unix epoch.
    pub created_at_ms: u64,
    /// Milliseconds since the Unix epoch.
    pub updated_at_ms: u64,
}

/// What the editor sends to create or replace a flashcard.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct FlashcardDraft {
    pub media_file_id: Option<MediaFileId>,
    pub cue_index: Option<u32>,
    pub content: FlashcardContent,
    pub included_fields: Vec<FlashcardFieldKey>,
}

/// Everything a flashcard can hold. L1 is the language the user already knows; L2 is the one they are learning.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct FlashcardContent {
    pub word: String,
    pub word_pronunciation: String,
    pub l1_definition: String,
    pub l2_definition: String,
    pub text_context: String,
    pub text_context_translation: String,
    pub text_context_pronunciation: String,
    pub audio_context: Option<AudioClip>,
    pub screenshot: Option<Screenshot>,
    pub tags: Vec<String>,
}

/// A time range within a media file's audio track.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AudioClip {
    pub start_ms: u64,
    pub end_ms: u64,
}

/// A still frame of the video, named by the time it is taken at. The image itself is read from the media file.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct Screenshot {
    pub at_ms: u64,
}

/// The fields of a flashcard, named as the keys of `FlashcardContent`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum FlashcardFieldKey {
    Word,
    WordPronunciation,
    L1Definition,
    L2Definition,
    TextContext,
    TextContextTranslation,
    TextContextPronunciation,
    AudioContext,
    Screenshot,
    Tags,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_the_definition_fields_like_the_content_keys() {
        let json = serde_json::to_value([
            FlashcardFieldKey::L1Definition,
            FlashcardFieldKey::TextContextPronunciation,
        ])
        .unwrap();
        assert_eq!(
            json,
            serde_json::json!(["l1_definition", "text_context_pronunciation"])
        );
    }
}

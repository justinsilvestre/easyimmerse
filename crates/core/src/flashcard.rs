//! Flashcards and the fields they can hold.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::media_file::MediaFileId;
use crate::project::ProjectId;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(transparent)]
#[ts(export)]
pub struct FlashcardId(pub String);

/// Names one field of a flashcard. L1 is the language the user already knows; L2 is the one
/// they are learning.
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

/// A time range within a media file's audio track.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AudioClip {
    pub start_ms: u64,
    pub end_ms: u64,
}

/// Everything a flashcard can hold. The screenshot's image is stored apart from the
/// fields; only the time it was taken at is kept here.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct FlashcardFields {
    pub word: String,
    pub word_pronunciation: String,
    pub l1_definition: String,
    pub l2_definition: String,
    pub text_context: String,
    pub text_context_translation: String,
    pub text_context_pronunciation: String,
    pub audio_context: Option<AudioClip>,
    /// The media time the screenshot was taken at.
    pub screenshot_at_ms: Option<u64>,
    pub tags: Vec<String>,
}

/// A flashcard saved in a project.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct Flashcard {
    pub id: FlashcardId,
    pub project_id: ProjectId,
    /// The media file the flashcard was made from. Null when it was made without one, or
    /// when that file has since been removed from the project.
    pub media_file_id: Option<MediaFileId>,
    pub fields: FlashcardFields,
    /// The fields shown on this flashcard, in no particular order.
    pub included_fields: Vec<FlashcardFieldKey>,
    /// Whether a screenshot image is stored for the flashcard.
    pub has_screenshot_image: bool,
    /// Milliseconds since the Unix epoch.
    pub created_at_ms: u64,
    /// Milliseconds since the Unix epoch.
    pub updated_at_ms: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_field_keys_in_snake_case() {
        let json = serde_json::to_value(FlashcardFieldKey::L1Definition).unwrap();
        assert_eq!(json, serde_json::json!("l1_definition"));
    }
}

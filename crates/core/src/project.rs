//! Projects: the settings a user chooses for one, and the project as the server lists it.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::flashcard::FlashcardFieldKey;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(transparent)]
#[ts(export)]
pub struct ProjectId(pub String);

/// A project with its settings and the counts the home screen shows.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct Project {
    pub id: ProjectId,
    pub settings: ProjectSettings,
    /// Milliseconds since the Unix epoch.
    pub created_at_ms: u64,
    /// Milliseconds since the Unix epoch. Equal to `created_at_ms` until the project is first opened.
    pub last_opened_at_ms: u64,
    pub media_count: u64,
    pub flashcard_count: u64,
}

/// Everything a user sets about a project, as the project form edits it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ProjectSettings {
    pub name: String,
    /// The language being learned, as a BCP 47 code.
    pub target_language: String,
    /// The language translations and definitions are in, as a BCP 47 code.
    pub translation_language: String,
    /// The fields a new flashcard starts with.
    pub flashcard_fields: Vec<FlashcardFieldKey>,
    /// Tags every new flashcard gets.
    pub default_tags: Vec<String>,
    /// Whether each new flashcard is also tagged with the name of the media file it was made from.
    pub tags_media_name: bool,
    /// Whether the audio fields are filled with text-to-speech when the media has no audio track.
    pub fills_audio_with_tts: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_the_flashcard_fields_in_snake_case() {
        let settings = ProjectSettings {
            name: "German".to_string(),
            target_language: "de".to_string(),
            translation_language: "en".to_string(),
            flashcard_fields: vec![FlashcardFieldKey::Word, FlashcardFieldKey::L1Definition],
            default_tags: vec![],
            tags_media_name: true,
            fills_audio_with_tts: false,
        };
        let json = serde_json::to_value(&settings).unwrap();
        assert_eq!(
            json["flashcard_fields"],
            serde_json::json!(["word", "l1_definition"])
        );
    }
}

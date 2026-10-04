//! Projects, their settings, and their summaries as listed on the home screen.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::flashcard::FlashcardFieldKey;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(transparent)]
#[ts(export)]
pub struct ProjectId(pub String);

/// A project as the home screen lists it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ProjectSummary {
    pub id: ProjectId,
    pub name: String,
    /// The BCP 47 code of the language being learned.
    pub target_language: String,
    /// The BCP 47 code of the language translations and definitions are in.
    pub translation_language: String,
    /// Milliseconds since the Unix epoch.
    pub created_at_ms: u64,
    /// Milliseconds since the Unix epoch. Equal to the creation time until the project is
    /// first opened.
    pub last_opened_at_ms: u64,
    pub media_count: u64,
    pub flashcard_count: u64,
}

/// A project with all of its settings.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct Project {
    pub id: ProjectId,
    pub name: String,
    pub settings: ProjectSettings,
    /// Milliseconds since the Unix epoch.
    pub created_at_ms: u64,
    /// Milliseconds since the Unix epoch.
    pub last_opened_at_ms: u64,
}

/// The settings the user chooses when creating a project and can change later.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ProjectSettings {
    /// The BCP 47 code of the language being learned.
    pub target_language: String,
    /// The BCP 47 code of the language translations and definitions are in.
    pub translation_language: String,
    /// The fields a new flashcard starts with, in no particular order.
    pub flashcard_fields: Vec<FlashcardFieldKey>,
    /// The tags every new flashcard starts with.
    pub default_tags: Vec<String>,
    /// Whether each new flashcard is also tagged with the name of its media file.
    pub tags_media_name: bool,
    /// Whether the audio fields are filled with text-to-speech when the media has no audio.
    pub fills_audio_with_tts: bool,
}

//! Projects: a name, a target language, a translation language, flashcard settings, and a
//! registry of media files.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::flashcard::FlashcardSettings;
use crate::media_file::MediaFile;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(transparent)]
#[ts(export)]
pub struct ProjectId(pub String);

/// A complete project as the project screen shows it. Flashcards are listed separately,
/// since a project can hold thousands of them.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct Project {
    pub id: ProjectId,
    pub settings: ProjectSettings,
    pub media: Vec<MediaFile>,
    /// An RFC 3339 timestamp.
    pub created_at: String,
    /// An RFC 3339 timestamp. Equals `created_at` until the project is first opened.
    pub last_opened_at: String,
}

impl Project {
    pub fn summary(&self) -> ProjectSummary {
        ProjectSummary {
            id: self.id.clone(),
            name: self.settings.name.clone(),
            target_language: self.settings.target_language.clone(),
            translation_language: self.settings.translation_language.clone(),
            created_at: self.created_at.clone(),
            last_opened_at: self.last_opened_at.clone(),
        }
    }
}

/// A project as listed on the home screen.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ProjectSummary {
    pub id: ProjectId,
    pub name: String,
    pub target_language: String,
    pub translation_language: String,
    /// An RFC 3339 timestamp.
    pub created_at: String,
    /// An RFC 3339 timestamp.
    pub last_opened_at: String,
}

/// Everything the new-project form collects. The same type creates a project and updates
/// its settings later.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ProjectSettings {
    pub name: String,
    /// The language being learned, as a BCP 47 tag such as `de` or `pt-BR`.
    pub target_language: String,
    /// The language definitions and translations are shown in, as a BCP 47 tag.
    pub translation_language: String,
    pub flashcard_settings: FlashcardSettings,
}

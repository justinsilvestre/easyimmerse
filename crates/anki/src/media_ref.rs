use easyimmerse_core::flashcard::{Flashcard, FlashcardFieldKey};
use easyimmerse_core::media_file::MediaFileId;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

/// A media file that a note's fields refer to by name, which the caller renders from the project's media file and supplies.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(tag = "kind", rename_all = "snake_case")]
#[ts(export)]
pub enum AnkiMediaRef {
    /// A clip of the media file's audio, referred to as `[sound:<file_name>]`. `file_name` is `<flashcard id>.m4a`.
    Audio {
        file_name: String,
        media_file_id: MediaFileId,
        start_ms: u64,
        end_ms: u64,
    },
    /// A frame of the media file's video, referred to as `<img src="<file_name>">`. `file_name` is `<flashcard id>.jpg`.
    Screenshot {
        file_name: String,
        media_file_id: MediaFileId,
        at_ms: u64,
    },
}

impl AnkiMediaRef {
    /// The name the note's fields refer to the file by.
    pub fn file_name(&self) -> &str {
        match self {
            AnkiMediaRef::Audio { file_name, .. } | AnkiMediaRef::Screenshot { file_name, .. } => {
                file_name
            }
        }
    }
}

/// Lists the media a flashcard's included audio and screenshot need.
/// A flashcard whose media file has been removed from the project has none.
pub(crate) fn media_refs(flashcard: &Flashcard) -> Vec<AnkiMediaRef> {
    let Some(media_file_id) = &flashcard.media_file_id else {
        return Vec::new();
    };
    let includes = |key| flashcard.included_fields.contains(&key);
    let id = &flashcard.id.0;
    let content = &flashcard.content;
    let audio = content
        .audio_context
        .as_ref()
        .filter(|_| includes(FlashcardFieldKey::AudioContext));
    let screenshot = content
        .screenshot
        .as_ref()
        .filter(|_| includes(FlashcardFieldKey::Screenshot));
    let audio = audio.map(|clip| AnkiMediaRef::Audio {
        file_name: format!("{id}.m4a"),
        media_file_id: media_file_id.clone(),
        start_ms: clip.start_ms,
        end_ms: clip.end_ms,
    });
    let screenshot = screenshot.map(|shot| AnkiMediaRef::Screenshot {
        file_name: format!("{id}.jpg"),
        media_file_id: media_file_id.clone(),
        at_ms: shot.at_ms,
    });
    audio.into_iter().chain(screenshot).collect()
}

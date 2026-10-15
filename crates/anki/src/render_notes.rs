use easyimmerse_core::flashcard::Flashcard;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::deck_spec::DeckSpec;
use crate::note_type::{AnkiNoteType, note_type};
use crate::render_note::{AnkiNote, render_note};

/// What the AnkiConnect client needs to create the deck, the note type and the notes.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AnkiNotes {
    pub deck_name: String,
    pub note_type: AnkiNoteType,
    pub notes: Vec<AnkiNote>,
    /// Milliseconds since the Unix epoch at which the flashcards were read, which the client hands back once it has sent the notes.
    pub rendered_at_ms: u64,
}

/// Renders a project's flashcards, as they were read at `rendered_at_ms`, as notes, together with the deck and note type they belong to.
pub fn render_notes(flashcards: &[Flashcard], spec: &DeckSpec, rendered_at_ms: u64) -> AnkiNotes {
    AnkiNotes {
        deck_name: spec.project_name.to_owned(),
        note_type: note_type(spec),
        notes: flashcards.iter().map(render_note).collect(),
        rendered_at_ms,
    }
}

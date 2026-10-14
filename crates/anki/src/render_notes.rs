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
}

/// Renders a project's flashcards as notes, together with the deck and note type they belong to.
pub fn render_notes(flashcards: &[Flashcard], spec: &DeckSpec) -> AnkiNotes {
    AnkiNotes {
        deck_name: spec.project_name.to_owned(),
        note_type: note_type(spec),
        notes: flashcards.iter().map(render_note).collect(),
    }
}

//! Renders flashcards as Anki notes, and writes them into a legacy Anki deck package (.apkg).

mod anki_field;
mod card_css;
mod card_scheduling;
mod card_template;
mod collection;
mod collection_json;
mod deck_spec;
mod derived_id;
mod export_time;
mod field_html;
mod guid;
mod media_ref;
mod note_rows;
mod note_type;
mod package;
mod render_note;
mod render_notes;
mod revlog_rows;
mod schema;
mod sort_field;

#[cfg(test)]
mod test_support;

pub use deck_spec::DeckSpec;
pub use export_time::ExportTime;
pub use media_ref::AnkiMediaRef;
pub use note_type::{AnkiNoteType, AnkiTemplate, note_type};
pub use package::{AnkiError, PackageMedia, write_package};
pub use render_note::{AnkiNote, render_note};
pub use render_notes::{AnkiNotes, render_notes};

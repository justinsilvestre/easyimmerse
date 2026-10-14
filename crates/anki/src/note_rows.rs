//! The rows of the `notes` and `cards` tables, one note and one card for each flashcard.

use std::collections::HashSet;

use rusqlite::{Connection, params};

use crate::card_scheduling::CardScheduling;
use crate::deck_spec::DeckSpec;
use crate::derived_id::deck_id;
use crate::note_type::note_type;
use crate::render_note::AnkiNote;
use crate::sort_field::{field_checksum, strip_html};

const FIELD_SEPARATOR: &str = "\u{1f}";

/// Inserts a note and its card for each rendered note, the cards in export order.
pub(crate) fn insert_notes_and_cards(
    connection: &Connection,
    spec: &DeckSpec,
    notes: &[AnkiNote],
    scheduling: CardScheduling,
) -> rusqlite::Result<()> {
    let note_type_id = sql_int(note_type(spec).id);
    let deck_id = sql_int(deck_id(spec.project_id));
    let note_ids = unique_ids(notes.iter().map(|note| note.note_id));
    let mut insert_note = connection
        .prepare("INSERT INTO notes VALUES (?1, ?2, ?3, ?4, -1, ?5, ?6, ?7, ?8, 0, '')")?;
    let mut insert_card = connection.prepare(
        "INSERT INTO cards VALUES (?1, ?2, ?3, 0, ?4, -1, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 0, 0, 0, ?13)",
    )?;
    for (position, (note, note_id)) in (1..).zip(notes.iter().zip(note_ids)) {
        let modified_secs = sql_int(note.updated_at_ms / 1000);
        let sort_field = strip_html(note.fields.first().map_or("", String::as_str));
        insert_note.execute(params![
            sql_int(note_id),
            note.guid,
            note_type_id,
            modified_secs,
            tags_column(&note.tags),
            note.fields.join(FIELD_SEPARATOR),
            sort_field,
            field_checksum(&sort_field),
        ])?;
        let card = scheduling.columns(position);
        // A card's id is its note's id plus the ordinal of its template, which is always 0.
        insert_card.execute(params![
            sql_int(note_id),
            sql_int(note_id),
            deck_id,
            modified_secs,
            card.kind,
            card.queue,
            card.due,
            card.interval,
            card.factor,
            card.reps,
            card.lapses,
            card.left,
            card.data,
        ])?;
    }
    Ok(())
}

/// Keeps ids unique within a table by raising each id that is already taken until it is free, as Anki does on insert.
fn unique_ids(wanted: impl Iterator<Item = u64>) -> Vec<u64> {
    let mut taken = HashSet::new();
    wanted
        .map(|id| {
            let mut id = id;
            while !taken.insert(id) {
                id += 1;
            }
            id
        })
        .collect()
}

/// Anki stores tags separated by spaces, with a space before the first and after the last.
fn tags_column(tags: &[String]) -> String {
    if tags.is_empty() {
        String::new()
    } else {
        format!(" {} ", tags.join(" "))
    }
}

/// Converts a number for SQLite, which stores signed 64-bit integers. Timestamps and ids are far below the limit.
pub(crate) fn sql_int(value: u64) -> i64 {
    i64::try_from(value).unwrap_or(i64::MAX)
}

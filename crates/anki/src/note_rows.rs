//! The rows of the `notes` and `cards` tables, one note and one card for each flashcard.

use std::collections::HashSet;

use rusqlite::{Connection, Statement, params};

use crate::anki_field::FIELD_SEPARATOR;
use crate::card_scheduling::{CardColumns, CardScheduling};
use crate::deck_spec::DeckSpec;
use crate::derived_id::deck_id;
use crate::note_type::AnkiNoteType;
use crate::render_note::AnkiNote;
use crate::sort_field::{field_checksum, strip_html};

const INSERT_NOTE_SQL: &str =
    "INSERT INTO notes VALUES (?1, ?2, ?3, ?4, -1, ?5, ?6, ?7, ?8, 0, '')";
const INSERT_CARD_SQL: &str = "INSERT INTO cards VALUES (?1, ?2, ?3, 0, ?4, -1, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 0, 0, 0, ?13)";

/// What every note and card row of a package shares.
pub(crate) struct RowStamp {
    modified_secs: i64,
    note_type_id: i64,
    deck_id: i64,
}

impl RowStamp {
    /// Dates every row at the export, so that importing the package again updates the notes Anki already has.
    pub(crate) fn new(
        spec: &DeckSpec,
        note_type: &AnkiNoteType,
        exported_at_ms: u64,
    ) -> rusqlite::Result<Self> {
        Ok(Self {
            modified_secs: sql_int(exported_at_ms / 1000)?,
            note_type_id: sql_int(note_type.id)?,
            deck_id: sql_int(deck_id(spec.project_id))?,
        })
    }
}

/// Inserts a note and its card for each rendered note, the cards in export order.
pub(crate) fn insert_notes_and_cards(
    connection: &Connection,
    stamp: &RowStamp,
    notes: &[AnkiNote],
    scheduling: CardScheduling,
) -> rusqlite::Result<()> {
    let note_ids = unique_ids(notes.iter().map(|note| note.note_id));
    let mut insert_note = connection.prepare(INSERT_NOTE_SQL)?;
    let mut insert_card = connection.prepare(INSERT_CARD_SQL)?;
    for (position, (note, note_id)) in (1..).zip(notes.iter().zip(note_ids)) {
        let row_id = sql_int(note_id)?;
        insert_note_row(&mut insert_note, stamp, note, row_id)?;
        let card = scheduling.columns(position);
        insert_card_row(&mut insert_card, stamp, &card, row_id)?;
    }
    Ok(())
}

fn insert_note_row(
    statement: &mut Statement,
    stamp: &RowStamp,
    note: &AnkiNote,
    row_id: i64,
) -> rusqlite::Result<()> {
    let sort_field = strip_html(note.fields.first().map_or("", String::as_str));
    statement.execute(params![
        row_id,
        note.guid,
        stamp.note_type_id,
        stamp.modified_secs,
        tags_column(&note.tags),
        note.fields.join(&String::from(FIELD_SEPARATOR)),
        sort_field,
        field_checksum(&sort_field),
    ])?;
    Ok(())
}

fn insert_card_row(
    statement: &mut Statement,
    stamp: &RowStamp,
    card: &CardColumns,
    note_row_id: i64,
) -> rusqlite::Result<()> {
    // A card's id is its note's id plus the ordinal of its template, which is always 0.
    statement.execute(params![
        note_row_id,
        note_row_id,
        stamp.deck_id,
        stamp.modified_secs,
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

/// Converts a number for SQLite, which stores signed 64-bit integers. Fails when the number does not fit.
pub(crate) fn sql_int(value: u64) -> rusqlite::Result<i64> {
    i64::try_from(value).map_err(|error| rusqlite::Error::ToSqlConversionFailure(Box::new(error)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn converts_a_number_that_fits() {
        assert_eq!(sql_int(7).ok(), Some(7));
    }

    #[test]
    fn fails_on_a_number_that_does_not_fit() {
        assert!(sql_int(u64::MAX).is_err());
    }
}

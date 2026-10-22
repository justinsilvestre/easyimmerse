//! The rows of the `notes` and `cards` tables, one note and one card for each flashcard.

use std::collections::{HashMap, HashSet};

use easyimmerse_core::flashcard::FlashcardId;
use easyimmerse_core::review::ReviewProgress;
use rusqlite::{Connection, Statement, params};

use crate::anki_field::FIELD_SEPARATOR;
use crate::card_scheduling::{CardColumns, CardScheduling, held_queue};
use crate::deck_spec::DeckSpec;
use crate::derived_id::deck_id;
use crate::note_type::AnkiNoteType;
use crate::render_note::AnkiNote;
use crate::revlog_rows::insert_revlog_rows;
use crate::sort_field::{field_checksum, strip_html};

/// The tag Anki gives a leech, which its browser searches by.
const LEECH_TAG: &str = "leech";
const INSERT_NOTE_SQL: &str =
    "INSERT INTO notes VALUES (?1, ?2, ?3, ?4, -1, ?5, ?6, ?7, ?8, 0, '')";
const INSERT_CARD_SQL: &str = "INSERT INTO cards VALUES (?1, ?2, ?3, 0, ?4, -1, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 0, 0, 0, ?13)";

/// What every note and card row of a package shares.
pub(crate) struct RowStamp {
    modified_secs: i64,
    note_type_id: i64,
    deck_id: i64,
    collection_created_secs: u64,
}

impl RowStamp {
    /// Dates every row at the export, so that importing the package again updates the notes Anki already has.
    /// Review cards are due on days counted from `collection_created_secs`.
    pub(crate) fn new(
        spec: &DeckSpec,
        note_type: &AnkiNoteType,
        exported_at_ms: u64,
        collection_created_secs: u64,
    ) -> rusqlite::Result<Self> {
        Ok(Self {
            modified_secs: sql_int(exported_at_ms / 1000)?,
            note_type_id: sql_int(note_type.id)?,
            deck_id: sql_int(deck_id(spec.project_id))?,
            collection_created_secs,
        })
    }
}

/// Inserts a note and its card for each rendered note, the cards in export order,
/// with the review progress of each flashcard that has some, and its review log.
pub(crate) fn insert_notes_and_cards(
    connection: &Connection,
    stamp: &RowStamp,
    notes: &[AnkiNote],
    review_progress: &HashMap<FlashcardId, ReviewProgress>,
) -> rusqlite::Result<()> {
    let note_ids = unique_ids(notes.iter().map(|note| note.note_id));
    let mut insert_note = connection.prepare(INSERT_NOTE_SQL)?;
    let mut insert_card = connection.prepare(INSERT_CARD_SQL)?;
    let mut answers = Vec::new();
    for (position, (note, note_id)) in (1..).zip(notes.iter().zip(note_ids)) {
        let row_id = sql_int(note_id)?;
        let progress = review_progress.get(&note.flashcard_id);
        let tags = tags_with_leech(&note.tags, progress);
        insert_note_row(&mut insert_note, stamp, note, &tags, row_id)?;
        let card = card_columns(progress, position, stamp.collection_created_secs);
        insert_card_row(&mut insert_card, stamp, &card, row_id)?;
        if let Some(progress) = progress {
            answers.extend(progress.log.iter().map(|entry| (row_id, entry)));
        }
    }
    insert_revlog_rows(connection, &answers)
}

/// The columns of a card as the review left it, in the queue of a card the user set aside when they did.
fn card_columns(
    progress: Option<&ReviewProgress>,
    position: i64,
    collection_created_secs: u64,
) -> CardColumns {
    let scheduling = match progress {
        Some(ReviewProgress {
            state: Some(state),
            log,
            ..
        }) => CardScheduling::Reviewed(state, log),
        _ => CardScheduling::New,
    };
    let columns = scheduling.columns(position, collection_created_secs);
    match progress.and_then(|progress| progress.hold) {
        Some(hold) => CardColumns {
            queue: held_queue(hold),
            ..columns
        },
        None => columns,
    }
}

/// The note's tags, with Anki's "leech" tag added when the review found the card a leech.
fn tags_with_leech(tags: &[String], progress: Option<&ReviewProgress>) -> Vec<String> {
    let is_leech = progress
        .and_then(|progress| progress.state.as_ref())
        .is_some_and(|state| state.is_leech);
    let mut tags = tags.to_vec();
    if is_leech && !tags.iter().any(|tag| tag == LEECH_TAG) {
        tags.push(LEECH_TAG.to_owned());
    }
    tags
}

fn insert_note_row(
    statement: &mut Statement,
    stamp: &RowStamp,
    note: &AnkiNote,
    tags: &[String],
    row_id: i64,
) -> rusqlite::Result<()> {
    let sort_field = strip_html(note.fields.first().map_or("", String::as_str));
    statement.execute(params![
        row_id,
        note.guid,
        stamp.note_type_id,
        stamp.modified_secs,
        tags_column(tags),
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
pub(crate) fn unique_ids(wanted: impl Iterator<Item = u64>) -> Vec<u64> {
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

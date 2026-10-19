//! The SQLite database of a package, `collection.anki2`, at Anki's schema version 11.

use std::collections::HashMap;

use easyimmerse_core::flashcard::FlashcardId;
use easyimmerse_core::review::ReviewProgress;
use rusqlite::{Connection, MAIN_DB, params};

use crate::collection_json::{conf_json, dconf_json, decks_json, models_json};
use crate::deck_spec::DeckSpec;
use crate::derived_id::deck_id;
use crate::note_rows::{RowStamp, insert_notes_and_cards, sql_int};
use crate::note_type::{AnkiNoteType, note_type};
use crate::render_note::AnkiNote;
use crate::schema::SCHEMA_11;

const SCHEMA_VERSION: i64 = 11;
const MILLIS_PER_DAY: u64 = 86_400_000;

/// Builds the collection database in memory, with every row dated at the export, and returns its bytes.
pub(crate) fn collection_bytes(
    spec: &DeckSpec,
    notes: &[AnkiNote],
    review_progress: &HashMap<FlashcardId, ReviewProgress>,
    exported_at_ms: u64,
) -> rusqlite::Result<Vec<u8>> {
    let note_type = note_type(spec);
    let collection_row = collection_row(spec, &note_type, notes, exported_at_ms)?;
    let created_secs = u64::try_from(collection_row.created_secs).unwrap_or(0);
    let stamp = RowStamp::new(spec, &note_type, exported_at_ms, created_secs)?;
    let connection = Connection::open_in_memory()?;
    connection.execute_batch(SCHEMA_11)?;
    let transaction = connection.unchecked_transaction()?;
    insert_collection_row(&transaction, &collection_row)?;
    insert_notes_and_cards(&transaction, &stamp, notes, review_progress)?;
    transaction.commit()?;
    Ok(connection.serialize(MAIN_DB)?.to_vec())
}

/// The values of the single row of the `col` table.
struct CollectionRow {
    created_secs: i64,
    exported_at_ms: i64,
    conf: String,
    models: String,
    decks: String,
    dconf: String,
}

fn collection_row(
    spec: &DeckSpec,
    note_type: &AnkiNoteType,
    notes: &[AnkiNote],
    exported_at_ms: u64,
) -> rusqlite::Result<CollectionRow> {
    let earliest_ms = notes
        .iter()
        .map(|note| note.note_id)
        .fold(spec.project_created_at_ms, u64::min);
    // The collection's creation time is the origin of review due dates.
    // A midnight (in UTC) before every card was made keeps them positive.
    let created_secs = earliest_ms / MILLIS_PER_DAY * MILLIS_PER_DAY / 1000;
    let note_type_modified_secs = spec.project_created_at_ms / 1000;
    let deck_id = deck_id(spec.project_id);
    Ok(CollectionRow {
        created_secs: sql_int(created_secs)?,
        exported_at_ms: sql_int(exported_at_ms)?,
        conf: conf_json(note_type.id, notes.len()),
        models: models_json(note_type, deck_id, note_type_modified_secs),
        decks: decks_json(deck_id, spec.project_name, exported_at_ms / 1000),
        dconf: dconf_json(),
    })
}

fn insert_collection_row(connection: &Connection, row: &CollectionRow) -> rusqlite::Result<()> {
    connection.execute(
        "INSERT INTO col VALUES (1, ?1, ?2, ?3, ?4, 0, 0, 0, ?5, ?6, ?7, ?8, '{}')",
        params![
            row.created_secs,
            row.exported_at_ms,
            row.exported_at_ms,
            SCHEMA_VERSION,
            row.conf,
            row.models,
            row.decks,
            row.dconf,
        ],
    )?;
    Ok(())
}

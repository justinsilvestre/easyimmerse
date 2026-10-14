//! The SQLite database of a package, `collection.anki2`, at Anki's schema version 11.

use rusqlite::{Connection, MAIN_DB, params};

use crate::card_scheduling::CardScheduling;
use crate::collection_json::{conf_json, dconf_json, decks_json, models_json};
use crate::deck_spec::DeckSpec;
use crate::derived_id::deck_id;
use crate::note_rows::{insert_notes_and_cards, sql_int};
use crate::note_type::note_type;
use crate::render_note::AnkiNote;
use crate::schema::SCHEMA_11;

const SCHEMA_VERSION: i64 = 11;
const MILLIS_PER_DAY: u64 = 86_400_000;

/// Builds the collection database in memory and returns its bytes.
pub(crate) fn collection_bytes(
    spec: &DeckSpec,
    notes: &[AnkiNote],
    scheduling: CardScheduling,
) -> rusqlite::Result<Vec<u8>> {
    let connection = Connection::open_in_memory()?;
    connection.execute_batch(SCHEMA_11)?;
    let transaction = connection.unchecked_transaction()?;
    insert_collection_row(&transaction, spec, notes)?;
    insert_notes_and_cards(&transaction, spec, notes, scheduling)?;
    transaction.commit()?;
    Ok(connection.serialize(MAIN_DB)?.to_vec())
}

fn insert_collection_row(
    connection: &Connection,
    spec: &DeckSpec,
    notes: &[AnkiNote],
) -> rusqlite::Result<()> {
    let note_type = note_type(spec);
    let earliest_ms = notes
        .iter()
        .map(|note| note.note_id)
        .fold(spec.project_created_at_ms, u64::min);
    // The collection's creation time is the origin of review due dates.
    // A midnight (in UTC) before every card was made keeps them positive.
    let created_secs = earliest_ms / MILLIS_PER_DAY * MILLIS_PER_DAY / 1000;
    let modified_ms = notes
        .iter()
        .map(|note| note.updated_at_ms)
        .fold(spec.project_created_at_ms, u64::max);
    let note_type_modified_secs = spec.project_created_at_ms / 1000;
    connection.execute(
        "INSERT INTO col VALUES (1, ?1, ?2, ?3, ?4, 0, 0, 0, ?5, ?6, ?7, ?8, '{}')",
        params![
            sql_int(created_secs),
            sql_int(modified_ms),
            sql_int(modified_ms),
            SCHEMA_VERSION,
            conf_json(note_type.id, notes.len()),
            models_json(
                &note_type,
                deck_id(spec.project_id),
                note_type_modified_secs
            ),
            decks_json(
                deck_id(spec.project_id),
                spec.project_name,
                modified_ms / 1000
            ),
            dconf_json(),
        ],
    )?;
    Ok(())
}

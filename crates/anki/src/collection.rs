//! The SQLite database of a package, `collection.anki2`, at Anki's schema version 11.

use std::collections::HashMap;

use easyimmerse_core::flashcard::FlashcardId;
use easyimmerse_core::review::ReviewProgress;
use rusqlite::{Connection, MAIN_DB, params};

use crate::collection_json::{ROLLOVER_HOUR, conf_json, dconf_json, decks_json, models_json};
use crate::deck_spec::DeckSpec;
use crate::derived_id::deck_id;
use crate::export_time::ExportTime;
use crate::note_rows::{RowStamp, insert_notes_and_cards, sql_int};
use crate::note_type::{AnkiNoteType, note_type};
use crate::render_note::AnkiNote;
use crate::schema::SCHEMA_11;

const SCHEMA_VERSION: i64 = 11;
const MILLIS_PER_DAY: u64 = 86_400_000;
/// The hour a day begins, in milliseconds after local midnight, as the package tells Anki.
const ROLLOVER_MS: i64 = ROLLOVER_HOUR * 3_600_000;

/// Builds the collection database in memory, with every row dated at the export, and returns its bytes.
pub(crate) fn collection_bytes(
    spec: &DeckSpec,
    notes: &[AnkiNote],
    review_progress: &HashMap<FlashcardId, ReviewProgress>,
    exported_at: ExportTime,
) -> rusqlite::Result<Vec<u8>> {
    let note_type = note_type(spec);
    let collection_row = collection_row(spec, &note_type, notes, exported_at)?;
    let created_secs = u64::try_from(collection_row.created_secs).unwrap_or(0);
    let stamp = RowStamp::new(spec, &note_type, exported_at.at_ms, created_secs)?;
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
    exported_at: ExportTime,
) -> rusqlite::Result<CollectionRow> {
    let exported_at_ms = exported_at.at_ms;
    let earliest_ms = notes
        .iter()
        .map(|note| note.note_id)
        .fold(spec.project_created_at_ms, u64::min);
    let created_secs = day_start_ms(earliest_ms, exported_at.utc_offset_min) / 1000;
    let note_type_modified_secs = spec.project_created_at_ms / 1000;
    let deck_id = deck_id(spec.project_id);
    Ok(CollectionRow {
        created_secs: sql_int(created_secs)?,
        exported_at_ms: sql_int(exported_at_ms)?,
        conf: conf_json(note_type.id, notes.len(), exported_at.utc_offset_min),
        models: models_json(note_type, deck_id, note_type_modified_secs),
        decks: decks_json(deck_id, spec.project_name, exported_at_ms / 1000),
        dconf: dconf_json(),
    })
}

/// The start of the local day that holds `at_ms`, at 4 a.m. as Anki and easyImmerse begin days.
/// The collection's creation time is the origin of review due days, which Anki counts from the local date it falls on.
/// A day that begins before every card was made keeps them positive.
fn day_start_ms(at_ms: u64, utc_offset_min: i32) -> u64 {
    let offset_ms = i64::from(utc_offset_min) * 60_000;
    let local_ms = i64::try_from(at_ms).unwrap_or(i64::MAX) + offset_ms;
    let day = (local_ms - ROLLOVER_MS).div_euclid(MILLIS_PER_DAY as i64);
    u64::try_from(day * MILLIS_PER_DAY as i64 + ROLLOVER_MS - offset_ms).unwrap_or(0)
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

#[cfg(test)]
mod tests {
    use super::*;

    /// 2025-10-09 00:00 UTC.
    const MIDNIGHT_UTC_MS: u64 = 1_759_968_000_000;
    const HOUR_MS: u64 = 3_600_000;

    #[test]
    fn a_day_begins_at_4_am_utc_for_a_user_in_utc() {
        assert_eq!(
            day_start_ms(MIDNIGHT_UTC_MS + 5 * HOUR_MS, 0),
            MIDNIGHT_UTC_MS + 4 * HOUR_MS
        );
    }

    #[test]
    fn a_day_begins_at_4_am_local_time_ahead_of_utc() {
        // 09:00 in Tokyo; the day began at 04:00 there, 19:00 UTC the evening before.
        assert_eq!(
            day_start_ms(MIDNIGHT_UTC_MS, 9 * 60),
            MIDNIGHT_UTC_MS - 5 * HOUR_MS
        );
    }

    #[test]
    fn a_time_before_4_am_belongs_to_the_previous_day() {
        assert_eq!(
            day_start_ms(MIDNIGHT_UTC_MS + 3 * HOUR_MS, 0),
            MIDNIGHT_UTC_MS - 20 * HOUR_MS
        );
    }

    #[test]
    fn a_day_begins_at_4_am_local_time_behind_utc() {
        // 20:00 on 8 October in New York; the day began at 04:00 there, 08:00 UTC.
        assert_eq!(
            day_start_ms(MIDNIGHT_UTC_MS, -4 * 60),
            MIDNIGHT_UTC_MS - 16 * HOUR_MS
        );
    }
}

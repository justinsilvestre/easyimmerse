//! The legacy Anki deck package (.apkg): a zip of the collection database, a JSON map of the media files, and the media files.

use std::collections::HashMap;
use std::io::{Seek, Write};

use easyimmerse_core::flashcard::FlashcardId;
use easyimmerse_core::review::ReviewProgress;
use serde_json::{Map, Value};
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipWriter};

use crate::collection::collection_bytes;
use crate::deck_spec::DeckSpec;
use crate::export_time::ExportTime;
use crate::render_note::AnkiNote;

/// A media file to put in the package, named as an `AnkiMediaRef` names it.
#[derive(Debug, Clone, PartialEq)]
pub struct PackageMedia {
    pub file_name: String,
    pub bytes: Vec<u8>,
}

#[derive(Debug, thiserror::Error)]
pub enum AnkiError {
    #[error("could not build the collection database: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("could not write the package: {0}")]
    Zip(#[from] zip::result::ZipError),
    #[error("could not write the package: {0}")]
    Io(#[from] std::io::Error),
}

/// Writes a legacy .apkg: `collection.anki2` at schema 11, the JSON `media` map, and the media files, all stored uncompressed.
/// Every Anki client reads this format.
/// Every note and card is dated at the export, since Anki updates a note it already has only from a newer one.
/// A flashcard with review progress goes in with its schedule and its review log; the others go in as new cards.
pub fn write_package(
    out: impl Write + Seek,
    spec: &DeckSpec,
    notes: &[AnkiNote],
    media: &[PackageMedia],
    review_progress: &HashMap<FlashcardId, ReviewProgress>,
    exported_at: ExportTime,
) -> Result<(), AnkiError> {
    let collection = collection_bytes(spec, notes, review_progress, exported_at)?;
    let options = SimpleFileOptions::default().compression_method(CompressionMethod::Stored);
    let mut zip = ZipWriter::new(out);
    zip.start_file("collection.anki2", options)?;
    zip.write_all(&collection)?;
    zip.start_file("media", options)?;
    zip.write_all(media_map(media).as_bytes())?;
    for (index, file) in media.iter().enumerate() {
        zip.start_file(index.to_string(), options)?;
        zip.write_all(&file.bytes)?;
    }
    zip.finish()?;
    Ok(())
}

/// Maps the name of each media file's zip entry, its index, to the name the note fields refer to it by.
fn media_map(media: &[PackageMedia]) -> String {
    let map: Map<String, Value> = media
        .iter()
        .enumerate()
        .map(|(index, file)| (index.to_string(), Value::from(file.file_name.as_str())))
        .collect();
    Value::Object(map).to_string()
}

#[cfg(test)]
mod tests {
    use std::io::{Cursor, Read};

    use easyimmerse_core::flashcard::FlashcardId;
    use easyimmerse_core::review::{
        ReviewCardState, ReviewHoldKind, ReviewLogEntry, ReviewPhase, ReviewRating,
    };
    use rusqlite::Connection;
    use tempfile::NamedTempFile;
    use zip::ZipArchive;

    use super::*;
    use crate::render_notes::render_notes;
    use crate::test_support::{FLASHCARD_ID, deck_spec, flashcard};

    const SECOND_FLASHCARD_ID: &str = "fedcba9876543210fedcba9876543210";
    /// A time after the flashcards were made and last edited.
    const EXPORTED_AT_MS: u64 = 1_760_300_000_000;

    /// Writes two flashcards made in the same millisecond, with the first one's audio and screenshot.
    fn written_package() -> ZipArchive<Cursor<Vec<u8>>> {
        written_package_with(&HashMap::new())
    }

    fn written_package_with(
        review_progress: &HashMap<FlashcardId, ReviewProgress>,
    ) -> ZipArchive<Cursor<Vec<u8>>> {
        let mut second = flashcard();
        second.id = FlashcardId(SECOND_FLASHCARD_ID.to_owned());
        second.content.word = "Tür".to_owned();
        let notes = render_notes(&[flashcard(), second], &deck_spec(), EXPORTED_AT_MS).notes;
        let media = [
            PackageMedia {
                file_name: format!("{FLASHCARD_ID}.m4a"),
                bytes: b"audio".to_vec(),
            },
            PackageMedia {
                file_name: format!("{FLASHCARD_ID}.jpg"),
                bytes: b"image".to_vec(),
            },
        ];
        let mut out = Cursor::new(Vec::new());
        write_package(
            &mut out,
            &deck_spec(),
            &notes,
            &media,
            review_progress,
            ExportTime {
                at_ms: EXPORTED_AT_MS,
                utc_offset_min: 0,
            },
        )
        .expect("the package is written");
        ZipArchive::new(Cursor::new(out.into_inner())).expect("the package is a zip")
    }

    fn entry_bytes(archive: &mut ZipArchive<Cursor<Vec<u8>>>, name: &str) -> Vec<u8> {
        let mut bytes = Vec::new();
        archive
            .by_name(name)
            .expect("the entry exists")
            .read_to_end(&mut bytes)
            .expect("the entry is read");
        bytes
    }

    /// Opens the package's collection from a temporary file, which lives as long as the returned file handle.
    fn collection() -> (NamedTempFile, Connection) {
        collection_of(written_package())
    }

    fn collection_of(mut archive: ZipArchive<Cursor<Vec<u8>>>) -> (NamedTempFile, Connection) {
        let mut file = NamedTempFile::new().expect("a temporary file is made");
        let bytes = entry_bytes(&mut archive, "collection.anki2");
        file.write_all(&bytes).expect("the collection is written");
        let connection = Connection::open(file.path()).expect("the collection opens");
        (file, connection)
    }

    fn collection_json(column: &str) -> serde_json::Value {
        let (_file, connection) = collection();
        let text: String = connection
            .query_row(&format!("SELECT {column} FROM col"), [], |row| row.get(0))
            .expect("the collection row exists");
        serde_json::from_str(&text).expect("the column holds JSON")
    }

    #[test]
    fn writes_the_collection_then_the_media_map_then_the_media() {
        let archive = written_package();
        let names: Vec<&str> = archive.file_names().collect();
        assert_eq!(names, ["collection.anki2", "media", "0", "1"]);
    }

    #[test]
    fn stores_every_entry_uncompressed() {
        let mut archive = written_package();
        let methods: Vec<CompressionMethod> = (0..archive.len())
            .map(|index| {
                archive
                    .by_index(index)
                    .expect("the entry exists")
                    .compression()
            })
            .collect();
        assert_eq!(methods, [CompressionMethod::Stored; 4]);
    }

    #[test]
    fn maps_the_media_entries_to_the_file_names_the_fields_use() {
        let map: serde_json::Value =
            serde_json::from_slice(&entry_bytes(&mut written_package(), "media"))
                .expect("the map is JSON");
        assert_eq!(
            map,
            serde_json::json!({"0": format!("{FLASHCARD_ID}.m4a"), "1": format!("{FLASHCARD_ID}.jpg")})
        );
    }

    #[test]
    fn stores_the_media_bytes_under_their_index() {
        assert_eq!(entry_bytes(&mut written_package(), "1"), b"image");
    }

    #[test]
    fn writes_the_collection_row_at_schema_11_created_at_4_am_local_time() {
        let (_file, connection) = collection();
        let row: (i64, i64) = connection
            .query_row("SELECT ver, crt FROM col", [], |row| {
                Ok((row.get(0)?, row.get(1)?))
            })
            .expect("the collection row exists");
        assert_eq!(row, (11, 1_759_982_400));
    }

    #[test]
    fn tells_anki_the_creation_offset_in_minutes_west() {
        assert_eq!(collection_json("conf")["creationOffset"], 0);
    }

    #[test]
    fn tells_anki_that_days_begin_at_4_am() {
        assert_eq!(collection_json("conf")["rollover"], 4);
    }

    #[test]
    fn dates_the_note_type_at_the_project_creation() {
        let models = collection_json("models");
        assert_eq!(models["1665021395"]["mod"], 1_760_000_000);
    }

    #[test]
    fn names_the_deck_after_the_project() {
        let decks = collection_json("decks");
        assert_eq!(decks["1858653704"]["name"], "Die Verwandlung");
    }

    #[test]
    fn writes_the_note_row() {
        let (_file, connection) = collection();
        let row: (String, i64, i64, String, String, i64) = connection
            .query_row(
                "SELECT guid, mid, mod, tags, sfld, csum FROM notes ORDER BY id LIMIT 1",
                [],
                |row| {
                    Ok((
                        row.get(0)?,
                        row.get(1)?,
                        row.get(2)?,
                        row.get(3)?,
                        row.get(4)?,
                        row.get(5)?,
                    ))
                },
            )
            .expect("the note row exists");
        let expected = (
            "kY9PHXkz:6".to_owned(),
            1_665_021_395,
            1_760_300_000,
            " chapter_one noun ".to_owned(),
            "Haus".to_owned(),
            582_454_829,
        );
        assert_eq!(row, expected);
    }

    #[test]
    fn separates_the_note_fields_with_the_unit_separator() {
        let (_file, connection) = collection();
        let fields: String = connection
            .query_row("SELECT flds FROM notes ORDER BY id LIMIT 1", [], |row| {
                row.get(0)
            })
            .expect("the note row exists");
        assert_eq!(fields.split('\u{1f}').count(), 10);
    }

    #[test]
    fn writes_the_field_values_in_order() {
        let (_file, connection) = collection();
        let fields: String = connection
            .query_row("SELECT flds FROM notes ORDER BY id LIMIT 1", [], |row| {
                row.get(0)
            })
            .expect("the note row exists");
        let values: Vec<&str> = fields.split('\u{1f}').collect();
        assert_eq!((values[0], values[9]), ("Haus", FLASHCARD_ID));
    }

    #[test]
    fn marks_the_note_as_never_synced() {
        let (_file, connection) = collection();
        let usn: i64 = connection
            .query_row("SELECT usn FROM notes LIMIT 1", [], |row| row.get(0))
            .expect("the note row exists");
        assert_eq!(usn, -1);
    }

    #[test]
    fn gives_a_new_card_no_review_history() {
        let (_file, connection) = collection();
        let row: (i64, i64, i64, i64, i64) = connection
            .query_row(
                "SELECT ivl, factor, reps, lapses, left FROM cards LIMIT 1",
                [],
                |row| {
                    Ok((
                        row.get(0)?,
                        row.get(1)?,
                        row.get(2)?,
                        row.get(3)?,
                        row.get(4)?,
                    ))
                },
            )
            .expect("the card row exists");
        assert_eq!(row, (0, 0, 0, 0, 0));
    }

    #[test]
    fn gives_a_card_empty_data() {
        let (_file, connection) = collection();
        let data: String = connection
            .query_row("SELECT data FROM cards LIMIT 1", [], |row| row.get(0))
            .expect("the card row exists");
        assert_eq!(data, "{}");
    }

    #[test]
    fn dates_the_card_at_the_export_and_marks_it_never_synced() {
        let (_file, connection) = collection();
        let row: (i64, i64) = connection
            .query_row("SELECT mod, usn FROM cards LIMIT 1", [], |row| {
                Ok((row.get(0)?, row.get(1)?))
            })
            .expect("the card row exists");
        assert_eq!(row, (1_760_300_000, -1));
    }

    #[test]
    fn makes_the_note_type_the_current_model() {
        assert_eq!(collection_json("conf")["curModel"], "1665021395");
    }

    #[test]
    fn continues_new_card_positions_after_the_exported_cards() {
        assert_eq!(collection_json("conf")["nextPos"], 3);
    }

    #[test]
    fn gives_the_deck_the_default_options() {
        assert_eq!(collection_json("dconf")["1"]["name"], "Default");
    }

    #[test]
    fn writes_new_cards_in_export_order_with_unique_ids() {
        let (_file, connection) = collection();
        let mut statement = connection
            .prepare("SELECT id, nid, did, ord, type, queue, due FROM cards ORDER BY id")
            .expect("the query is valid");
        let rows: Vec<[i64; 7]> = statement
            .query_map([], |row| {
                Ok([
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                ])
            })
            .expect("the cards are read")
            .collect::<Result<_, _>>()
            .expect("every card is read");
        let created = 1_760_100_000_000;
        let deck = 1_858_653_704;
        assert_eq!(
            rows,
            [
                [created, created, deck, 0, 0, 0, 1],
                [created + 1, created + 1, deck, 0, 0, 0, 2]
            ]
        );
    }

    /// The first flashcard was forgotten on its first showing, then remembered ten minutes later.
    const FIRST_ANSWER_MS: u64 = 1_760_100_100_000;
    const SECOND_ANSWER_MS: u64 = FIRST_ANSWER_MS + 600_000;
    const TWO_DAYS_MS: u64 = 2 * 86_400_000;

    fn log_entry(answered_at_ms: u64, rating: ReviewRating, state: ReviewPhase) -> ReviewLogEntry {
        let is_first = answered_at_ms == FIRST_ANSWER_MS;
        ReviewLogEntry {
            flashcard_id: FlashcardId(FLASHCARD_ID.to_owned()),
            answered_at_ms,
            rating,
            kind: ReviewPhase::Learning,
            state,
            elapsed_ms: if is_first { 0 } else { 600_000 },
            duration_ms: 4_000,
            stability: 0.2,
            difficulty: 6.4,
            interval_ms_before: if is_first { 0 } else { 600_000 },
            interval_ms_after: if is_first { 600_000 } else { TWO_DAYS_MS },
            desired_retention: 0.9,
        }
    }

    fn reviewed_progress() -> ReviewProgress {
        ReviewProgress {
            state: Some(ReviewCardState {
                state: ReviewPhase::Review,
                due_at_ms: SECOND_ANSWER_MS + TWO_DAYS_MS,
                stability: 2.4,
                difficulty: 6.2,
                interval_ms: TWO_DAYS_MS,
                reps: 2,
                lapses: 0,
                learning_step: 0,
                last_reviewed_at_ms: SECOND_ANSWER_MS,
                is_leech: false,
            }),
            log: vec![
                log_entry(FIRST_ANSWER_MS, ReviewRating::Again, ReviewPhase::Learning),
                log_entry(SECOND_ANSWER_MS, ReviewRating::Good, ReviewPhase::Review),
            ],
            hold: None,
        }
    }

    fn collection_with_progress(progress: ReviewProgress) -> (NamedTempFile, Connection) {
        let progress = HashMap::from([(FlashcardId(FLASHCARD_ID.to_owned()), progress)]);
        collection_of(written_package_with(&progress))
    }

    fn reviewed_collection() -> (NamedTempFile, Connection) {
        collection_with_progress(reviewed_progress())
    }

    fn first_card_queue(connection: &Connection) -> i64 {
        connection
            .query_row("SELECT queue FROM cards ORDER BY id LIMIT 1", [], |row| {
                row.get(0)
            })
            .expect("the card row exists")
    }

    #[test]
    fn writes_a_suspended_card_in_queue_minus_one() {
        let (_file, connection) = collection_with_progress(ReviewProgress {
            hold: Some(ReviewHoldKind::Suspended),
            ..reviewed_progress()
        });
        assert_eq!(first_card_queue(&connection), -1);
    }

    #[test]
    fn writes_a_buried_new_card_in_queue_minus_three() {
        let (_file, connection) = collection_with_progress(ReviewProgress {
            state: None,
            log: Vec::new(),
            hold: Some(ReviewHoldKind::Buried),
        });
        assert_eq!(first_card_queue(&connection), -3);
    }

    #[test]
    fn tags_a_leech() {
        let mut progress = reviewed_progress();
        if let Some(state) = progress.state.as_mut() {
            state.is_leech = true;
        }
        let (_file, connection) = collection_with_progress(progress);
        let tags: String = connection
            .query_row("SELECT tags FROM notes ORDER BY id LIMIT 1", [], |row| {
                row.get(0)
            })
            .expect("the note row exists");
        assert!(tags.split_whitespace().any(|tag| tag == "leech"));
    }

    #[test]
    fn writes_a_reviewed_card_with_its_schedule() {
        let (_file, connection) = reviewed_collection();
        let row: [i64; 8] = connection
            .query_row(
                "SELECT type, queue, due, ivl, factor, reps, lapses, left FROM cards ORDER BY id LIMIT 1",
                [],
                |row| {
                    Ok([
                        row.get(0)?,
                        row.get(1)?,
                        row.get(2)?,
                        row.get(3)?,
                        row.get(4)?,
                        row.get(5)?,
                        row.get(6)?,
                        row.get(7)?,
                    ])
                },
            )
            .expect("the card row exists");
        assert_eq!(row, [2, 2, 3, 2, 2500, 2, 0, 0]);
    }

    #[test]
    fn writes_a_reviewed_card_with_its_memory_state() {
        let (_file, connection) = reviewed_collection();
        let data: String = connection
            .query_row("SELECT data FROM cards ORDER BY id LIMIT 1", [], |row| {
                row.get(0)
            })
            .expect("the card row exists");
        assert_eq!(data, r#"{"d":6.2,"dr":0.9,"s":2.4}"#);
    }

    #[test]
    fn writes_the_review_log_of_a_reviewed_card() {
        let (_file, connection) = reviewed_collection();
        let mut statement = connection
            .prepare("SELECT id, cid, usn, ease, ivl, lastIvl, factor, time, type FROM revlog ORDER BY id")
            .expect("the query is valid");
        let rows: Vec<[i64; 9]> = statement
            .query_map([], |row| {
                Ok([
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                    row.get(7)?,
                    row.get(8)?,
                ])
            })
            .expect("the review log is read")
            .collect::<Result<_, _>>()
            .expect("every row is read");
        let card = 1_760_100_000_000;
        assert_eq!(
            rows,
            [
                [FIRST_ANSWER_MS as i64, card, -1, 1, -600, 0, 2500, 4000, 0],
                [SECOND_ANSWER_MS as i64, card, -1, 3, 2, -600, 2500, 4000, 0],
            ]
        );
    }

    #[test]
    fn writes_a_card_without_progress_as_new_beside_a_reviewed_one() {
        let (_file, connection) = reviewed_collection();
        let row: (i64, i64) = connection
            .query_row(
                "SELECT type, due FROM cards ORDER BY id LIMIT 1 OFFSET 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("the card row exists");
        assert_eq!(row, (0, 2));
    }
}

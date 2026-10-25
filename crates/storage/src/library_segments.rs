//! The text of library items: their segments with the words the manager set, and a document's chapter titles.

use easyimmerse_core::library::{
    LibraryEntry, LibraryItemId, LibrarySegment, LibraryText, LibraryWord, words_with_entry,
};
use rusqlite::{Connection, OptionalExtension, Row, params};

use crate::error::StorageError;
use crate::library_items::ensure_library_item_exists;
use crate::new_row::now_ms;
use crate::stored_integer::{read_json, read_optional_unsigned, to_stored_integer};

const SEGMENT_COLUMNS: &str = "segment_index, chapter_index, start_ms, end_ms, screenshot_at_ms, \
     text, translation, words_json";

/// Replaces an item's segments and chapter titles with the given text, in one transaction.
pub fn replace_library_segments(
    conn: &mut Connection,
    item_id: &LibraryItemId,
    text: &LibraryText,
) -> Result<LibraryText, StorageError> {
    let transaction = conn.transaction()?;
    ensure_library_item_exists(&transaction, item_id)?;
    transaction.execute(
        "DELETE FROM library_segments WHERE item_id = ?1",
        params![item_id.0],
    )?;
    for segment in &text.segments {
        insert_segment(&transaction, item_id, segment)?;
    }
    transaction.execute(
        "UPDATE library_items SET chapter_titles_json = ?2, updated_at_ms = ?3 WHERE id = ?1",
        params![
            item_id.0,
            serde_json::to_string(&text.chapter_titles)?,
            to_stored_integer(now_ms())
        ],
    )?;
    let stored = get_library_text(&transaction, item_id)?;
    transaction.commit()?;
    Ok(stored)
}

/// Replaces the words of one segment. The caller checks them against the segment's text first.
pub fn set_segment_words(
    conn: &Connection,
    item_id: &LibraryItemId,
    segment_index: u32,
    words: &[LibraryWord],
) -> Result<LibrarySegment, StorageError> {
    let updated = conn.execute(
        "UPDATE library_segments SET words_json = ?3 WHERE item_id = ?1 AND segment_index = ?2",
        params![item_id.0, segment_index, serde_json::to_string(words)?],
    )?;
    if updated == 0 {
        return Err(segment_not_found(item_id, segment_index));
    }
    get_segment(conn, item_id, segment_index)
}

/// Gives the entry to every word of the item whose text is `word_text`, in one transaction, and returns the item's text.
pub fn apply_library_entry(
    conn: &mut Connection,
    item_id: &LibraryItemId,
    word_text: &str,
    entry: &LibraryEntry,
) -> Result<LibraryText, StorageError> {
    let transaction = conn.transaction()?;
    let text = get_library_text(&transaction, item_id)?;
    for segment in &text.segments {
        if let Some(words) = words_with_entry(segment, word_text, entry) {
            set_segment_words(&transaction, item_id, segment.index, &words)?;
        }
    }
    let applied = get_library_text(&transaction, item_id)?;
    transaction.commit()?;
    Ok(applied)
}

/// Records the screenshot time of each listed segment, given as pairs of segment index and time, in one transaction.
pub fn set_screenshot_times(
    conn: &mut Connection,
    item_id: &LibraryItemId,
    screenshot_times: &[(u32, u64)],
) -> Result<(), StorageError> {
    let transaction = conn.transaction()?;
    for &(segment_index, at_ms) in screenshot_times {
        let updated = transaction.execute(
            "UPDATE library_segments SET screenshot_at_ms = ?3 \
             WHERE item_id = ?1 AND segment_index = ?2",
            params![item_id.0, segment_index, to_stored_integer(at_ms)],
        )?;
        if updated == 0 {
            return Err(segment_not_found(item_id, segment_index));
        }
    }
    transaction.commit()?;
    Ok(())
}

/// Returns an item's segments in order, with its chapter titles.
pub fn get_library_text(
    conn: &Connection,
    item_id: &LibraryItemId,
) -> Result<LibraryText, StorageError> {
    let chapter_titles_json: Option<String> = conn
        .query_row(
            "SELECT chapter_titles_json FROM library_items WHERE id = ?1",
            params![item_id.0],
            |row| row.get(0),
        )
        .optional()?
        .ok_or_else(|| StorageError::LibraryItemNotFound(item_id.0.clone()))?;
    let chapter_titles = match chapter_titles_json {
        Some(json) => serde_json::from_str(&json)?,
        None => Vec::new(),
    };
    let mut statement = conn.prepare(&format!(
        "SELECT {SEGMENT_COLUMNS} FROM library_segments WHERE item_id = ?1 ORDER BY segment_index"
    ))?;
    let segments = statement
        .query_map(params![item_id.0], read_segment)?
        .collect::<Result<_, _>>()?;
    Ok(LibraryText {
        segments,
        chapter_titles,
    })
}

fn get_segment(
    conn: &Connection,
    item_id: &LibraryItemId,
    segment_index: u32,
) -> Result<LibrarySegment, StorageError> {
    conn.query_row(
        &format!(
            "SELECT {SEGMENT_COLUMNS} FROM library_segments WHERE item_id = ?1 AND segment_index = ?2"
        ),
        params![item_id.0, segment_index],
        read_segment,
    )
    .optional()?
    .ok_or_else(|| segment_not_found(item_id, segment_index))
}

fn insert_segment(
    conn: &Connection,
    item_id: &LibraryItemId,
    segment: &LibrarySegment,
) -> Result<(), StorageError> {
    conn.execute(
        &format!(
            "INSERT INTO library_segments (item_id, {SEGMENT_COLUMNS}) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
        ),
        params![
            item_id.0,
            segment.index,
            segment.chapter_index,
            segment.start_ms.map(to_stored_integer),
            segment.end_ms.map(to_stored_integer),
            segment.screenshot_at_ms.map(to_stored_integer),
            segment.text,
            segment.translation,
            serde_json::to_string(&segment.words)?,
        ],
    )?;
    Ok(())
}

fn read_segment(row: &Row) -> rusqlite::Result<LibrarySegment> {
    Ok(LibrarySegment {
        index: row.get(0)?,
        chapter_index: row.get(1)?,
        start_ms: read_optional_unsigned(row, 2)?,
        end_ms: read_optional_unsigned(row, 3)?,
        screenshot_at_ms: read_optional_unsigned(row, 4)?,
        text: row.get(5)?,
        translation: row.get(6)?,
        words: read_json(row, 7)?,
    })
}

fn segment_not_found(item_id: &LibraryItemId, segment_index: u32) -> StorageError {
    StorageError::LibrarySegmentNotFound {
        item_id: item_id.0.clone(),
        segment_index,
    }
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::library::{LibraryEntry, LibraryItem, LibraryItemDraft, LibraryItemKind};
    use rusqlite::params;

    use super::*;
    use crate::Storage;
    use crate::library_settings::german_library_storage;

    fn storage_with_item() -> (Storage, LibraryItem) {
        let storage = german_library_storage();
        let item = storage
            .create_library_item(&LibraryItemDraft {
                title: "Film".to_string(),
                description: String::new(),
                translation_language: "en".to_string(),
                kind: LibraryItemKind::Video,
                difficulty: None,
                tags: Vec::new(),
            })
            .unwrap();
        (storage, item)
    }

    fn segment(index: u32) -> LibrarySegment {
        LibrarySegment {
            index,
            chapter_index: None,
            start_ms: Some(1_000),
            end_ms: Some(2_000),
            screenshot_at_ms: None,
            text: "Der Hund bellt".to_string(),
            translation: Some("The dog barks".to_string()),
            words: Vec::new(),
        }
    }

    fn text() -> LibraryText {
        LibraryText {
            segments: vec![segment(0), segment(1)],
            chapter_titles: vec![Some("Eins".to_string()), None],
        }
    }

    fn words() -> Vec<LibraryWord> {
        vec![LibraryWord {
            start: 4,
            end: 8,
            entry: LibraryEntry {
                term: "Hund".to_string(),
                reading: None,
                l1_definition: "dog".to_string(),
                l2_definition: "ein Haustier".to_string(),
            },
        }]
    }

    #[test]
    fn round_trips_an_items_text() {
        let (storage, item) = storage_with_item();
        storage.replace_library_segments(&item.id, &text()).unwrap();
        assert_eq!(storage.get_library_text(&item.id).unwrap(), text());
    }

    #[test]
    fn an_item_without_text_has_no_segments() {
        let (storage, item) = storage_with_item();
        assert_eq!(
            storage.get_library_text(&item.id).unwrap(),
            LibraryText {
                segments: Vec::new(),
                chapter_titles: Vec::new()
            }
        );
    }

    #[test]
    fn replacing_the_text_drops_the_earlier_segments() {
        let (storage, item) = storage_with_item();
        storage.replace_library_segments(&item.id, &text()).unwrap();
        let shorter = LibraryText {
            segments: vec![segment(0)],
            chapter_titles: Vec::new(),
        };
        storage
            .replace_library_segments(&item.id, &shorter)
            .unwrap();
        assert_eq!(storage.get_library_item(&item.id).unwrap().segment_count, 1);
    }

    #[test]
    fn counts_an_items_segments() {
        let (storage, item) = storage_with_item();
        storage.replace_library_segments(&item.id, &text()).unwrap();
        assert_eq!(storage.get_library_item(&item.id).unwrap().segment_count, 2);
    }

    #[test]
    fn round_trips_a_segments_words() {
        let (storage, item) = storage_with_item();
        storage.replace_library_segments(&item.id, &text()).unwrap();
        storage.set_segment_words(&item.id, 1, &words()).unwrap();
        let stored = storage.get_library_text(&item.id).unwrap();
        assert_eq!(stored.segments[1].words, words());
    }

    #[test]
    fn reports_words_for_an_unknown_segment() {
        let (storage, item) = storage_with_item();
        let result = storage.set_segment_words(&item.id, 5, &words());
        assert!(matches!(
            result,
            Err(StorageError::LibrarySegmentNotFound { .. })
        ));
    }

    #[test]
    fn records_screenshot_times() {
        let (storage, item) = storage_with_item();
        storage.replace_library_segments(&item.id, &text()).unwrap();
        storage
            .set_screenshot_times(&item.id, &[(0, 1_500), (1, 1_600)])
            .unwrap();
        let stored = storage.get_library_text(&item.id).unwrap();
        assert_eq!(stored.segments[1].screenshot_at_ms, Some(1_600));
    }

    #[test]
    fn deleting_an_item_deletes_its_segments() {
        let (storage, item) = storage_with_item();
        storage.replace_library_segments(&item.id, &text()).unwrap();
        storage.delete_library_item(&item.id).unwrap();
        let remaining: i64 = storage
            .read(|conn| {
                Ok(conn.query_row(
                    "SELECT COUNT(*) FROM library_segments WHERE item_id = ?1",
                    params![item.id.0],
                    |row| row.get(0),
                )?)
            })
            .unwrap();
        assert_eq!(remaining, 0);
    }
}

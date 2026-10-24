//! The items of the server's library, without their text. The table is server-local and does not sync.

use easyimmerse_core::library::{
    LibraryCover, LibraryDifficulty, LibraryError, LibraryItem, LibraryItemDraft, LibraryItemId,
    LibraryItemKind, LibraryItemStatus,
};
use rusqlite::{Connection, OptionalExtension, Row, params};

use crate::error::StorageError;
use crate::library_settings::library_language;
use crate::new_row::{generate_id, now_ms};
use crate::stored_integer::{read_json, read_optional_unsigned, read_unsigned, to_stored_integer};

const SELECTED_COLUMNS: &str = "id, title, description, translation_language, kind, difficulty, \
     tags_json, file_name, duration_ms, cover_at_ms, status, failure, \
     created_at_ms, updated_at_ms, \
     (SELECT COUNT(*) FROM library_segments s WHERE s.item_id = library_items.id), \
     cover_media_type IS NOT NULL, cover_kind";

/// Creates a draft item with no file and no text, refusing while the library's language is unset.
pub fn create_library_item(
    conn: &Connection,
    draft: &LibraryItemDraft,
) -> Result<LibraryItem, StorageError> {
    if library_language(conn)?.is_none() {
        return Err(StorageError::LibraryLanguageUnset);
    }
    let id = LibraryItemId(generate_id());
    conn.execute(
        "INSERT INTO library_items (id, title, description, translation_language, kind, \
         difficulty, tags_json, status, created_at_ms, updated_at_ms) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'draft', ?8, ?8)",
        params![
            id.0,
            draft.title,
            draft.description,
            draft.translation_language,
            draft.kind.as_str(),
            draft.difficulty.map(LibraryDifficulty::as_str),
            serde_json::to_string(&draft.tags)?,
            to_stored_integer(now_ms()),
        ],
    )?;
    get_library_item(conn, &id)
}

/// Replaces an item's metadata, whatever its status.
pub fn update_library_item(
    conn: &Connection,
    id: &LibraryItemId,
    draft: &LibraryItemDraft,
) -> Result<LibraryItem, StorageError> {
    let updated = conn.execute(
        "UPDATE library_items SET title = ?2, description = ?3, translation_language = ?4, \
         kind = ?5, difficulty = ?6, tags_json = ?7, updated_at_ms = ?8 WHERE id = ?1",
        params![
            id.0,
            draft.title,
            draft.description,
            draft.translation_language,
            draft.kind.as_str(),
            draft.difficulty.map(LibraryDifficulty::as_str),
            serde_json::to_string(&draft.tags)?,
            to_stored_integer(now_ms()),
        ],
    )?;
    ensure_one_row_changed(updated, id)?;
    get_library_item(conn, id)
}

pub fn get_library_item(
    conn: &Connection,
    id: &LibraryItemId,
) -> Result<LibraryItem, StorageError> {
    conn.query_row(
        &format!("SELECT {SELECTED_COLUMNS} FROM library_items WHERE id = ?1"),
        params![id.0],
        read_library_item,
    )
    .optional()?
    .ok_or_else(|| StorageError::LibraryItemNotFound(id.0.clone()))
}

/// Lists the published items, or every item when `include_unpublished` is true, by title.
pub fn list_library_items(
    conn: &Connection,
    include_unpublished: bool,
) -> Result<Vec<LibraryItem>, StorageError> {
    let mut statement = conn.prepare(&format!(
        "SELECT {SELECTED_COLUMNS} FROM library_items \
         WHERE ?1 OR status = 'published' ORDER BY title COLLATE NOCASE, created_at_ms"
    ))?;
    let items = statement
        .query_map(params![include_unpublished], read_library_item)?
        .collect::<Result<_, _>>()?;
    Ok(items)
}

/// Deletes an item together with its segments. Its files are the caller's to delete.
pub fn delete_library_item(conn: &Connection, id: &LibraryItemId) -> Result<(), StorageError> {
    let deleted = conn.execute("DELETE FROM library_items WHERE id = ?1", params![id.0])?;
    ensure_one_row_changed(deleted, id)
}

/// Records the name and size of the file uploaded for an item.
/// A cover taken from an earlier file no longer counts; an uploaded cover stays.
pub fn set_library_file(
    conn: &Connection,
    id: &LibraryItemId,
    file_name: &str,
    size_bytes: u64,
) -> Result<LibraryItem, StorageError> {
    let updated = conn.execute(
        "UPDATE library_items SET file_name = ?2, size_bytes = ?3, \
         cover_media_type = CASE WHEN cover_kind = 'uploaded' THEN cover_media_type END, \
         updated_at_ms = ?4 WHERE id = ?1",
        params![
            id.0,
            file_name,
            to_stored_integer(size_bytes),
            to_stored_integer(now_ms())
        ],
    )?;
    ensure_one_row_changed(updated, id)?;
    get_library_item(conn, id)
}

/// Records an item's status, with the message of a failure.
pub fn set_library_status(
    conn: &Connection,
    id: &LibraryItemId,
    status: &LibraryItemStatus,
) -> Result<LibraryItem, StorageError> {
    let failure = match status {
        LibraryItemStatus::Failed { message } => Some(message.as_str()),
        _ => None,
    };
    let updated = conn.execute(
        "UPDATE library_items SET status = ?2, failure = ?3, updated_at_ms = ?4 WHERE id = ?1",
        params![id.0, status.as_str(), failure, to_stored_integer(now_ms())],
    )?;
    ensure_one_row_changed(updated, id)?;
    get_library_item(conn, id)
}

/// Marks a draft or failed item as being published, and returns it.
/// Returns None, changing nothing, when the item is already published or being published.
pub fn begin_library_publish(
    conn: &Connection,
    id: &LibraryItemId,
) -> Result<Option<LibraryItem>, StorageError> {
    let updated = conn.execute(
        "UPDATE library_items SET status = 'processing', failure = NULL, updated_at_ms = ?2 \
         WHERE id = ?1 AND status IN ('draft', 'failed')",
        params![id.0, to_stored_integer(now_ms())],
    )?;
    if updated == 0 {
        ensure_library_item_exists(conn, id)?;
        return Ok(None);
    }
    get_library_item(conn, id).map(Some)
}

/// Marks every item that was being published as failed with the message, and returns how many there were.
/// The server calls it when it starts, since no publish outlives the process that ran it.
pub fn fail_interrupted_library_publishes(
    conn: &Connection,
    message: &str,
) -> Result<usize, StorageError> {
    Ok(conn.execute(
        "UPDATE library_items SET status = 'failed', failure = ?1, updated_at_ms = ?2 \
         WHERE status = 'processing'",
        params![message, to_stored_integer(now_ms())],
    )?)
}

/// Records the type of the cover picture now kept for the item, or that it has none.
pub fn set_library_cover(
    conn: &Connection,
    id: &LibraryItemId,
    media_type: Option<&str>,
) -> Result<LibraryItem, StorageError> {
    let updated = conn.execute(
        "UPDATE library_items SET cover_media_type = ?2, updated_at_ms = ?3 WHERE id = ?1",
        params![id.0, media_type, to_stored_integer(now_ms())],
    )?;
    ensure_one_row_changed(updated, id)?;
    get_library_item(conn, id)
}

/// Records where the item's cover picture comes from, leaving the picture itself as it is.
pub fn set_library_cover_choice(
    conn: &Connection,
    id: &LibraryItemId,
    cover: LibraryCover,
) -> Result<LibraryItem, StorageError> {
    let updated = conn.execute(
        "UPDATE library_items SET cover_kind = ?2, cover_at_ms = ?3, updated_at_ms = ?4 \
         WHERE id = ?1",
        params![
            id.0,
            cover.as_str(),
            cover.frame_at_ms().map(to_stored_integer),
            to_stored_integer(now_ms())
        ],
    )?;
    ensure_one_row_changed(updated, id)?;
    get_library_item(conn, id)
}

/// Records the length of a video or audio item, as probed when it is published.
pub fn set_library_duration(
    conn: &Connection,
    id: &LibraryItemId,
    duration_ms: Option<u64>,
) -> Result<LibraryItem, StorageError> {
    let updated = conn.execute(
        "UPDATE library_items SET duration_ms = ?2, updated_at_ms = ?3 WHERE id = ?1",
        params![
            id.0,
            duration_ms.map(to_stored_integer),
            to_stored_integer(now_ms())
        ],
    )?;
    ensure_one_row_changed(updated, id)?;
    get_library_item(conn, id)
}

/// Returns the tracks that learners of the item play, as the JSON of a `TrackSelection`, or None for the default tracks.
pub fn get_library_track_selection_json(
    conn: &Connection,
    id: &LibraryItemId,
) -> Result<Option<String>, StorageError> {
    conn.query_row(
        "SELECT track_selection_json FROM library_items WHERE id = ?1",
        params![id.0],
        |row| row.get(0),
    )
    .optional()?
    .ok_or_else(|| StorageError::LibraryItemNotFound(id.0.clone()))
}

/// Records the tracks that learners of the item play; None leaves the choice to the default tracks.
pub fn set_library_track_selection_json(
    conn: &Connection,
    id: &LibraryItemId,
    track_selection_json: Option<&str>,
) -> Result<(), StorageError> {
    let updated = conn.execute(
        "UPDATE library_items SET track_selection_json = ?2 WHERE id = ?1",
        params![id.0, track_selection_json],
    )?;
    ensure_one_row_changed(updated, id)
}

pub fn ensure_library_item_exists(
    conn: &Connection,
    id: &LibraryItemId,
) -> Result<(), StorageError> {
    let exists: bool = conn.query_row(
        "SELECT EXISTS (SELECT 1 FROM library_items WHERE id = ?1)",
        params![id.0],
        |row| row.get(0),
    )?;
    ensure_one_row_changed(usize::from(exists), id)
}

fn ensure_one_row_changed(changed: usize, id: &LibraryItemId) -> Result<(), StorageError> {
    if changed == 0 {
        Err(StorageError::LibraryItemNotFound(id.0.clone()))
    } else {
        Ok(())
    }
}

fn read_library_item(row: &Row) -> rusqlite::Result<LibraryItem> {
    let kind = parse_column(row, 4, LibraryItemKind::parse)?;
    let difficulty: Option<String> = row.get(5)?;
    let status_name: String = row.get(10)?;
    let status = LibraryItemStatus::parse(&status_name, row.get(11)?)
        .map_err(|error| conversion_failure(10, error))?;
    Ok(LibraryItem {
        id: LibraryItemId(row.get(0)?),
        title: row.get(1)?,
        description: row.get(2)?,
        translation_language: row.get(3)?,
        kind,
        difficulty: difficulty
            .map(|name| {
                LibraryDifficulty::parse(&name).map_err(|error| conversion_failure(5, error))
            })
            .transpose()?,
        tags: read_json(row, 6)?,
        file_name: row.get(7)?,
        duration_ms: read_optional_unsigned(row, 8)?,
        cover: read_cover(row)?,
        has_cover: row.get(15)?,
        segment_count: row.get(14)?,
        status,
        created_at_ms: read_unsigned(row, 12)?,
        updated_at_ms: read_unsigned(row, 13)?,
    })
}

fn read_cover(row: &Row) -> rusqlite::Result<LibraryCover> {
    let name: String = row.get(16)?;
    LibraryCover::parse(&name, read_optional_unsigned(row, 9)?)
        .map_err(|error| conversion_failure(16, error))
}

fn parse_column<T>(
    row: &Row,
    index: usize,
    parse: impl FnOnce(&str) -> Result<T, LibraryError>,
) -> rusqlite::Result<T> {
    let name: String = row.get(index)?;
    parse(&name).map_err(|error| conversion_failure(index, error))
}

fn conversion_failure(index: usize, error: LibraryError) -> rusqlite::Error {
    rusqlite::Error::FromSqlConversionFailure(index, rusqlite::types::Type::Text, Box::new(error))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Storage;
    use crate::library_settings::german_library_storage;

    fn draft(title: &str) -> LibraryItemDraft {
        LibraryItemDraft {
            title: title.to_string(),
            description: "A short film".to_string(),
            translation_language: "en".to_string(),
            kind: LibraryItemKind::Video,
            difficulty: Some(LibraryDifficulty::A2),
            tags: vec!["film".to_string()],
        }
    }

    #[test]
    fn creates_an_item_as_a_draft() {
        let storage = german_library_storage();
        let item = storage.create_library_item(&draft("Film")).unwrap();
        assert_eq!(item.status, LibraryItemStatus::Draft);
    }

    #[test]
    fn round_trips_an_items_metadata() {
        let storage = german_library_storage();
        let item = storage.create_library_item(&draft("Film")).unwrap();
        let read = storage.get_library_item(&item.id).unwrap();
        assert_eq!(
            LibraryItemDraft {
                title: read.title,
                description: read.description,
                translation_language: read.translation_language,
                kind: read.kind,
                difficulty: read.difficulty,
                tags: read.tags,
            },
            draft("Film")
        );
    }

    #[test]
    fn updates_an_items_metadata() {
        let storage = german_library_storage();
        let item = storage.create_library_item(&draft("Film")).unwrap();
        let updated = storage
            .update_library_item(&item.id, &draft("Renamed"))
            .unwrap();
        assert_eq!(updated.title, "Renamed");
    }

    #[test]
    fn records_an_uploaded_file() {
        let storage = german_library_storage();
        let item = storage.create_library_item(&draft("Film")).unwrap();
        let updated = storage.set_library_file(&item.id, "film.mp4", 10).unwrap();
        assert_eq!(updated.file_name, Some("film.mp4".to_string()));
    }

    #[test]
    fn round_trips_a_failure_message() {
        let storage = german_library_storage();
        let item = storage.create_library_item(&draft("Film")).unwrap();
        let failed = LibraryItemStatus::Failed {
            message: "no audio track".to_string(),
        };
        storage.set_library_status(&item.id, &failed).unwrap();
        assert_eq!(storage.get_library_item(&item.id).unwrap().status, failed);
    }

    #[test]
    fn a_published_video_has_no_cover_until_one_is_rendered() {
        let storage = german_library_storage();
        let item = storage.create_library_item(&draft("Film")).unwrap();
        let published = storage
            .set_library_status(&item.id, &LibraryItemStatus::Published)
            .unwrap();
        assert!(!published.has_cover);
    }

    #[test]
    fn records_a_cover_picture() {
        let storage = german_library_storage();
        let item = storage.create_library_item(&draft("Film")).unwrap();
        let updated = storage
            .set_library_cover(&item.id, Some("image/jpeg"))
            .unwrap();
        assert!(updated.has_cover);
    }

    #[test]
    fn a_new_item_takes_the_automatic_cover() {
        let storage = german_library_storage();
        let item = storage.create_library_item(&draft("Film")).unwrap();
        assert_eq!(item.cover, LibraryCover::Automatic);
    }

    #[test]
    fn round_trips_a_chosen_frame() {
        let storage = german_library_storage();
        let item = storage.create_library_item(&draft("Film")).unwrap();
        let frame = LibraryCover::Frame { at_ms: 3_000 };
        storage.set_library_cover_choice(&item.id, frame).unwrap();
        assert_eq!(storage.get_library_item(&item.id).unwrap().cover, frame);
    }

    fn item_with_cover(storage: &Storage, cover: LibraryCover) -> LibraryItem {
        let item = storage.create_library_item(&draft("Film")).unwrap();
        storage.set_library_cover_choice(&item.id, cover).unwrap();
        storage
            .set_library_cover(&item.id, Some("image/png"))
            .unwrap()
    }

    #[test]
    fn a_new_file_drops_a_cover_taken_from_the_old_one() {
        let storage = german_library_storage();
        let item = item_with_cover(&storage, LibraryCover::Automatic);
        let updated = storage.set_library_file(&item.id, "film.mp4", 10).unwrap();
        assert!(!updated.has_cover);
    }

    #[test]
    fn a_new_file_keeps_an_uploaded_cover() {
        let storage = german_library_storage();
        let item = item_with_cover(&storage, LibraryCover::Uploaded);
        let updated = storage.set_library_file(&item.id, "film.mp4", 10).unwrap();
        assert!(updated.has_cover);
    }

    #[test]
    fn begins_the_publish_of_a_draft() {
        let storage = german_library_storage();
        let item = storage.create_library_item(&draft("Film")).unwrap();
        let begun = storage.begin_library_publish(&item.id).unwrap();
        assert_eq!(
            begun.map(|item| item.status),
            Some(LibraryItemStatus::Processing)
        );
    }

    #[test]
    fn does_not_begin_a_second_publish() {
        let storage = german_library_storage();
        let item = storage.create_library_item(&draft("Film")).unwrap();
        storage.begin_library_publish(&item.id).unwrap();
        assert_eq!(storage.begin_library_publish(&item.id).unwrap(), None);
    }

    #[test]
    fn fails_the_publishes_a_stop_interrupted() {
        let storage = german_library_storage();
        let item = storage.create_library_item(&draft("Film")).unwrap();
        storage.begin_library_publish(&item.id).unwrap();
        storage
            .fail_interrupted_library_publishes("stopped")
            .unwrap();
        assert_eq!(
            storage.get_library_item(&item.id).unwrap().status,
            LibraryItemStatus::Failed {
                message: "stopped".to_string()
            }
        );
    }

    #[test]
    fn records_the_duration() {
        let storage = german_library_storage();
        let item = storage.create_library_item(&draft("Film")).unwrap();
        let updated = storage
            .set_library_duration(&item.id, Some(60_000))
            .unwrap();
        assert_eq!(updated.duration_ms, Some(60_000));
    }

    fn storage_with_draft_and_published() -> Storage {
        let storage = german_library_storage();
        storage.create_library_item(&draft("Draft")).unwrap();
        let published = storage.create_library_item(&draft("Published")).unwrap();
        storage
            .set_library_status(&published.id, &LibraryItemStatus::Published)
            .unwrap();
        storage
    }

    fn listed_titles(storage: &Storage, include_unpublished: bool) -> Vec<String> {
        storage
            .list_library_items(include_unpublished)
            .unwrap()
            .into_iter()
            .map(|item| item.title)
            .collect()
    }

    #[test]
    fn listing_hides_drafts() {
        let storage = storage_with_draft_and_published();
        assert_eq!(listed_titles(&storage, false), ["Published"]);
    }

    #[test]
    fn listing_for_a_manager_shows_drafts() {
        let storage = storage_with_draft_and_published();
        assert_eq!(listed_titles(&storage, true), ["Draft", "Published"]);
    }

    #[test]
    fn deletes_an_item() {
        let storage = german_library_storage();
        let item = storage.create_library_item(&draft("Film")).unwrap();
        storage.delete_library_item(&item.id).unwrap();
        assert!(matches!(
            storage.get_library_item(&item.id),
            Err(StorageError::LibraryItemNotFound(_))
        ));
    }

    #[test]
    fn a_new_item_plays_the_default_tracks() {
        let storage = Storage::open_in_memory().unwrap();
        let item = storage.create_library_item(&draft("Film")).unwrap();
        assert_eq!(
            storage.get_library_track_selection_json(&item.id).unwrap(),
            None
        );
    }

    #[test]
    fn round_trips_a_track_selection() {
        let storage = Storage::open_in_memory().unwrap();
        let item = storage.create_library_item(&draft("Film")).unwrap();
        let json = r#"{"video":0,"audio":2}"#;
        storage
            .set_library_track_selection_json(&item.id, Some(json))
            .unwrap();
        assert_eq!(
            storage.get_library_track_selection_json(&item.id).unwrap(),
            Some(json.to_string())
        );
    }

    #[test]
    fn reports_deleting_an_unknown_item() {
        let storage = german_library_storage();
        let result = storage.delete_library_item(&LibraryItemId("missing".to_string()));
        assert!(matches!(result, Err(StorageError::LibraryItemNotFound(_))));
    }
}

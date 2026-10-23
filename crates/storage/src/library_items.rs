//! The items of the server's library, without their text. The table is server-local and does not sync.

use easyimmerse_core::library::{
    LibraryDifficulty, LibraryError, LibraryItem, LibraryItemDraft, LibraryItemId, LibraryItemKind,
    LibraryItemStatus,
};
use rusqlite::{Connection, OptionalExtension, Row, params};

use crate::error::StorageError;
use crate::new_row::{generate_id, now_ms};
use crate::stored_integer::{read_json, read_optional_unsigned, read_unsigned, to_stored_integer};

const SELECTED_COLUMNS: &str = "id, title, description, language, translation_language, kind, \
     difficulty, tags_json, file_name, duration_ms, cover_at_ms, status, failure, \
     created_at_ms, updated_at_ms, \
     (SELECT COUNT(*) FROM library_segments s WHERE s.item_id = library_items.id)";

/// Creates a draft item with no file and no text.
pub fn create_library_item(
    conn: &Connection,
    draft: &LibraryItemDraft,
) -> Result<LibraryItem, StorageError> {
    let id = LibraryItemId(generate_id());
    conn.execute(
        "INSERT INTO library_items (id, title, description, language, translation_language, kind, \
         difficulty, tags_json, cover_at_ms, status, created_at_ms, updated_at_ms) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'draft', ?10, ?10)",
        params![
            id.0,
            draft.title,
            draft.description,
            draft.language,
            draft.translation_language,
            draft.kind.as_str(),
            draft.difficulty.map(LibraryDifficulty::as_str),
            serde_json::to_string(&draft.tags)?,
            draft.cover_at_ms.map(to_stored_integer),
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
        "UPDATE library_items SET title = ?2, description = ?3, language = ?4, \
         translation_language = ?5, kind = ?6, difficulty = ?7, tags_json = ?8, cover_at_ms = ?9, \
         updated_at_ms = ?10 WHERE id = ?1",
        params![
            id.0,
            draft.title,
            draft.description,
            draft.language,
            draft.translation_language,
            draft.kind.as_str(),
            draft.difficulty.map(LibraryDifficulty::as_str),
            serde_json::to_string(&draft.tags)?,
            draft.cover_at_ms.map(to_stored_integer),
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
pub fn set_library_file(
    conn: &Connection,
    id: &LibraryItemId,
    file_name: &str,
    size_bytes: u64,
) -> Result<LibraryItem, StorageError> {
    let updated = conn.execute(
        "UPDATE library_items SET file_name = ?2, size_bytes = ?3, updated_at_ms = ?4 WHERE id = ?1",
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

/// A video item has a cover once it is published, since the publish renders it.
fn read_library_item(row: &Row) -> rusqlite::Result<LibraryItem> {
    let kind = parse_column(row, 5, LibraryItemKind::parse)?;
    let difficulty: Option<String> = row.get(6)?;
    let status_name: String = row.get(11)?;
    let status = LibraryItemStatus::parse(&status_name, row.get(12)?)
        .map_err(|error| conversion_failure(11, error))?;
    Ok(LibraryItem {
        id: LibraryItemId(row.get(0)?),
        title: row.get(1)?,
        description: row.get(2)?,
        language: row.get(3)?,
        translation_language: row.get(4)?,
        kind,
        difficulty: difficulty
            .map(|name| {
                LibraryDifficulty::parse(&name).map_err(|error| conversion_failure(6, error))
            })
            .transpose()?,
        tags: read_json(row, 7)?,
        file_name: row.get(8)?,
        duration_ms: read_optional_unsigned(row, 9)?,
        cover_at_ms: read_optional_unsigned(row, 10)?,
        has_cover: kind == LibraryItemKind::Video && status == LibraryItemStatus::Published,
        segment_count: row.get(15)?,
        status,
        created_at_ms: read_unsigned(row, 13)?,
        updated_at_ms: read_unsigned(row, 14)?,
    })
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

    fn draft(title: &str) -> LibraryItemDraft {
        LibraryItemDraft {
            title: title.to_string(),
            description: "A short film".to_string(),
            language: "de".to_string(),
            translation_language: "en".to_string(),
            kind: LibraryItemKind::Video,
            difficulty: Some(LibraryDifficulty::Beginner),
            tags: vec!["film".to_string()],
            cover_at_ms: Some(3_000),
        }
    }

    #[test]
    fn creates_an_item_as_a_draft() {
        let storage = Storage::open_in_memory().unwrap();
        let item = storage.create_library_item(&draft("Film")).unwrap();
        assert_eq!(item.status, LibraryItemStatus::Draft);
    }

    #[test]
    fn round_trips_an_items_metadata() {
        let storage = Storage::open_in_memory().unwrap();
        let item = storage.create_library_item(&draft("Film")).unwrap();
        let read = storage.get_library_item(&item.id).unwrap();
        assert_eq!(
            LibraryItemDraft {
                title: read.title,
                description: read.description,
                language: read.language,
                translation_language: read.translation_language,
                kind: read.kind,
                difficulty: read.difficulty,
                tags: read.tags,
                cover_at_ms: read.cover_at_ms,
            },
            draft("Film")
        );
    }

    #[test]
    fn updates_an_items_metadata() {
        let storage = Storage::open_in_memory().unwrap();
        let item = storage.create_library_item(&draft("Film")).unwrap();
        let updated = storage
            .update_library_item(&item.id, &draft("Renamed"))
            .unwrap();
        assert_eq!(updated.title, "Renamed");
    }

    #[test]
    fn records_an_uploaded_file() {
        let storage = Storage::open_in_memory().unwrap();
        let item = storage.create_library_item(&draft("Film")).unwrap();
        let updated = storage.set_library_file(&item.id, "film.mp4", 10).unwrap();
        assert_eq!(updated.file_name, Some("film.mp4".to_string()));
    }

    #[test]
    fn round_trips_a_failure_message() {
        let storage = Storage::open_in_memory().unwrap();
        let item = storage.create_library_item(&draft("Film")).unwrap();
        let failed = LibraryItemStatus::Failed {
            message: "no audio track".to_string(),
        };
        storage.set_library_status(&item.id, &failed).unwrap();
        assert_eq!(storage.get_library_item(&item.id).unwrap().status, failed);
    }

    #[test]
    fn a_published_video_has_a_cover() {
        let storage = Storage::open_in_memory().unwrap();
        let item = storage.create_library_item(&draft("Film")).unwrap();
        let published = storage
            .set_library_status(&item.id, &LibraryItemStatus::Published)
            .unwrap();
        assert!(published.has_cover);
    }

    #[test]
    fn records_the_duration() {
        let storage = Storage::open_in_memory().unwrap();
        let item = storage.create_library_item(&draft("Film")).unwrap();
        let updated = storage
            .set_library_duration(&item.id, Some(60_000))
            .unwrap();
        assert_eq!(updated.duration_ms, Some(60_000));
    }

    fn storage_with_draft_and_published() -> Storage {
        let storage = Storage::open_in_memory().unwrap();
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
        let storage = Storage::open_in_memory().unwrap();
        let item = storage.create_library_item(&draft("Film")).unwrap();
        storage.delete_library_item(&item.id).unwrap();
        assert!(matches!(
            storage.get_library_item(&item.id),
            Err(StorageError::LibraryItemNotFound(_))
        ));
    }

    #[test]
    fn reports_deleting_an_unknown_item() {
        let storage = Storage::open_in_memory().unwrap();
        let result = storage.delete_library_item(&LibraryItemId("missing".to_string()));
        assert!(matches!(result, Err(StorageError::LibraryItemNotFound(_))));
    }
}

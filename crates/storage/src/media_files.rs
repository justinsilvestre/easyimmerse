use easyimmerse_core::library::LibraryItemId;
use easyimmerse_core::media_file::{MediaFile, MediaFileId, MediaFileSource, MediaOrigin};
use easyimmerse_core::project::ProjectId;
use easyimmerse_core::providers::media_source::MediaLocator;
use rusqlite::{Connection, OptionalExtension, Row, params};

use crate::error::StorageError;
use crate::new_row::{generate_id, now_ms};
use crate::owners::OwnerId;
use crate::projects::ensure_project_exists;
use crate::stored_integer::{read_unsigned, to_stored_integer};

const MEDIA_FILE_COLUMNS: &str = "id, project_id, name, source_kind, source_path, browser_file_size, \
     browser_file_last_modified_ms, created_at_ms, track_selection_json, origin_plugin, \
     origin_locator, translation_media_file_id, is_upload_chosen";
/// The stored columns and whether this server keeps a copy of the bytes, for reading.
const SELECTED_COLUMNS: &str = "id, project_id, name, source_kind, source_path, browser_file_size, \
     browser_file_last_modified_ms, created_at_ms, track_selection_json, origin_plugin, \
     origin_locator, translation_media_file_id, is_upload_chosen, \
     EXISTS (SELECT 1 FROM media_copies c WHERE c.media_file_id = media_files.id)";

/// Lists a project's media files, oldest first.
pub fn list_media_files(
    conn: &Connection,
    project_id: &ProjectId,
) -> Result<Vec<MediaFile>, StorageError> {
    let mut statement = conn.prepare(&format!(
        "SELECT {SELECTED_COLUMNS} FROM media_files WHERE project_id = ?1 \
         ORDER BY created_at_ms, rowid"
    ))?;
    let media_files = statement
        .query_map(params![project_id.0], read_media_file)?
        .collect::<Result<_, _>>()?;
    Ok(media_files)
}

/// Lists the owner's media files whose person chose to keep a copy on a server and of which the remote holds none,
/// oldest first.
pub fn list_media_files_to_upload(
    conn: &Connection,
    owner: &OwnerId,
    remote_id: &str,
) -> Result<Vec<MediaFile>, StorageError> {
    let mut statement = conn.prepare(&format!(
        "SELECT {SELECTED_COLUMNS} FROM media_files \
         WHERE is_upload_chosen = 1 \
         AND project_id IN (SELECT id FROM projects WHERE owner_id = ?1) \
         AND NOT EXISTS (SELECT 1 FROM remote_copies r \
             WHERE r.remote_id = ?2 AND r.media_file_id = media_files.id) \
         ORDER BY created_at_ms, rowid"
    ))?;
    let media_files = statement
        .query_map(params![owner.0, remote_id], read_media_file)?
        .collect::<Result<_, _>>()?;
    Ok(media_files)
}

pub fn get_media_file(conn: &Connection, id: &MediaFileId) -> Result<MediaFile, StorageError> {
    conn.query_row(
        &format!("SELECT {SELECTED_COLUMNS} FROM media_files WHERE id = ?1"),
        params![id.0],
        read_media_file,
    )
    .optional()?
    .ok_or_else(|| StorageError::MediaFileNotFound(id.0.clone()))
}

/// Finds the project's media file of the library item, the oldest when there are several.
pub fn find_library_media_file(
    conn: &Connection,
    project_id: &ProjectId,
    item_id: &LibraryItemId,
) -> Result<Option<MediaFile>, StorageError> {
    Ok(conn
        .query_row(
            &format!(
                "SELECT {SELECTED_COLUMNS} FROM media_files \
                 WHERE project_id = ?1 AND source_kind = 'library' AND source_path = ?2 \
                 ORDER BY created_at_ms, rowid LIMIT 1"
            ),
            params![project_id.0, item_id.0],
            read_media_file,
        )
        .optional()?)
}

/// Finds the owner's media file of the library item in any of its projects, the one in the project opened last when there are several.
pub fn find_owners_library_media_file(
    conn: &Connection,
    owner: &OwnerId,
    item_id: &LibraryItemId,
) -> Result<Option<MediaFile>, StorageError> {
    Ok(conn
        .query_row(
            &format!(
                "SELECT {SELECTED_COLUMNS} FROM media_files \
                 WHERE source_kind = 'library' AND source_path = ?2 \
                 AND project_id IN (SELECT id FROM projects WHERE owner_id = ?1) \
                 ORDER BY (SELECT last_opened_at_ms FROM projects p WHERE p.id = media_files.project_id) DESC, \
                 created_at_ms DESC, rowid DESC LIMIT 1"
            ),
            params![owner.0, item_id.0],
            read_media_file,
        )
        .optional()?)
}

/// Stores the track choice of every media file of the library item, in any project; `None` clears it.
pub fn set_library_media_track_selection_json(
    conn: &Connection,
    item_id: &LibraryItemId,
    track_selection_json: Option<&str>,
) -> Result<(), StorageError> {
    conn.execute(
        "UPDATE media_files SET track_selection_json = ?2 \
         WHERE source_kind = 'library' AND source_path = ?1",
        params![item_id.0, track_selection_json],
    )?;
    Ok(())
}

/// Adds a media file to a project and returns it with its new id and creation time.
pub fn add_media_file(
    conn: &Connection,
    project_id: &ProjectId,
    name: &str,
    source: &MediaFileSource,
) -> Result<MediaFile, StorageError> {
    ensure_project_exists(conn, project_id)?;
    let media_file = MediaFile {
        id: MediaFileId(generate_id()),
        project_id: project_id.clone(),
        name: name.to_string(),
        source: source.clone(),
        origin: None,
        created_at_ms: now_ms(),
        track_selection_json: None,
        translation_media_file_id: None,
        is_upload_chosen: false,
        has_stored_copy: false,
    };
    insert_media_file(conn, &media_file)?;
    Ok(media_file)
}

/// Records where a media-source plugin fetched the media file from.
pub fn set_media_file_origin(
    conn: &Connection,
    id: &MediaFileId,
    origin: &MediaOrigin,
) -> Result<(), StorageError> {
    let updated = conn.execute(
        "UPDATE media_files SET origin_plugin = ?2, origin_locator = ?3 WHERE id = ?1",
        params![id.0, origin.plugin, origin.locator.0],
    )?;
    ensure_one_row_changed(updated, id)
}

/// Pairs a document with the translation it is read beside; `None` clears the pairing.
/// The translation must be another media file of the same project.
pub fn set_translation_document(
    conn: &Connection,
    id: &MediaFileId,
    translation_media_file_id: Option<&MediaFileId>,
) -> Result<(), StorageError> {
    let media_file = get_media_file(conn, id)?;
    if let Some(translation_id) = translation_media_file_id {
        if translation_id == id {
            return Err(StorageError::PairedWithItself(id.0.clone()));
        }
        ensure_media_file_in_project(conn, &media_file.project_id, translation_id)?;
    }
    conn.execute(
        "UPDATE media_files SET translation_media_file_id = ?2 WHERE id = ?1",
        params![
            id.0,
            translation_media_file_id.map(|translation_id| &translation_id.0)
        ],
    )?;
    Ok(())
}

pub fn remove_media_file(conn: &Connection, id: &MediaFileId) -> Result<(), StorageError> {
    let removed = conn.execute("DELETE FROM media_files WHERE id = ?1", params![id.0])?;
    ensure_one_row_changed(removed, id)
}

/// Stores the user's track choice for a media file; `None` clears it.
pub fn set_track_selection_json(
    conn: &Connection,
    id: &MediaFileId,
    track_selection_json: Option<&str>,
) -> Result<(), StorageError> {
    let updated = conn.execute(
        "UPDATE media_files SET track_selection_json = ?2 WHERE id = ?1",
        params![id.0, track_selection_json],
    )?;
    ensure_one_row_changed(updated, id)
}

/// Lists every distinct local path that some media file still points at.
pub fn list_referenced_source_paths(conn: &Connection) -> Result<Vec<String>, StorageError> {
    let mut statement = conn.prepare(
        "SELECT DISTINCT source_path FROM media_files \
         WHERE source_kind = 'path' AND source_path IS NOT NULL ORDER BY source_path",
    )?;
    let paths = statement
        .query_map([], |row| row.get(0))?
        .collect::<Result<_, _>>()?;
    Ok(paths)
}

pub fn ensure_media_file_exists(conn: &Connection, id: &MediaFileId) -> Result<(), StorageError> {
    get_media_file(conn, id).map(|_| ())
}

/// Fails with `MediaFileNotFound` when the media file does not exist or belongs to another project.
pub fn ensure_media_file_in_project(
    conn: &Connection,
    project_id: &ProjectId,
    id: &MediaFileId,
) -> Result<(), StorageError> {
    if get_media_file(conn, id)?.project_id == *project_id {
        Ok(())
    } else {
        Err(StorageError::MediaFileNotFound(id.0.clone()))
    }
}

fn insert_media_file(conn: &Connection, media_file: &MediaFile) -> Result<(), StorageError> {
    let (source_kind, source_path, size, last_modified_ms) = source_columns(&media_file.source);
    conn.execute(
        &format!(
            "INSERT INTO media_files ({MEDIA_FILE_COLUMNS}) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)"
        ),
        params![
            media_file.id.0,
            media_file.project_id.0,
            media_file.name,
            source_kind,
            source_path,
            size,
            last_modified_ms,
            to_stored_integer(media_file.created_at_ms),
            media_file.track_selection_json,
            media_file.origin.as_ref().map(|origin| &origin.plugin),
            media_file.origin.as_ref().map(|origin| &origin.locator.0),
            media_file
                .translation_media_file_id
                .as_ref()
                .map(|id| &id.0),
            media_file.is_upload_chosen,
        ],
    )?;
    Ok(())
}

fn source_columns(
    source: &MediaFileSource,
) -> (&'static str, Option<&str>, Option<i64>, Option<i64>) {
    match source {
        MediaFileSource::Path { path } => ("path", Some(path), None, None),
        MediaFileSource::BrowserFile {
            size,
            last_modified_ms,
        } => (
            "browser_file",
            None,
            Some(to_stored_integer(*size)),
            Some(to_stored_integer(*last_modified_ms)),
        ),
        MediaFileSource::Library { item_id } => ("library", Some(&item_id.0), None, None),
    }
}

fn read_media_file(row: &Row) -> rusqlite::Result<MediaFile> {
    Ok(MediaFile {
        id: MediaFileId(row.get(0)?),
        project_id: ProjectId(row.get(1)?),
        name: row.get(2)?,
        source: read_source(row)?,
        origin: read_origin(row)?,
        created_at_ms: read_unsigned(row, 7)?,
        track_selection_json: row.get(8)?,
        translation_media_file_id: row.get::<_, Option<String>>(11)?.map(MediaFileId),
        is_upload_chosen: row.get(12)?,
        has_stored_copy: row.get(13)?,
    })
}

fn read_origin(row: &Row) -> rusqlite::Result<Option<MediaOrigin>> {
    let plugin: Option<String> = row.get(9)?;
    let locator: Option<String> = row.get(10)?;
    Ok(plugin.zip(locator).map(|(plugin, locator)| MediaOrigin {
        plugin,
        locator: MediaLocator(locator),
    }))
}

fn read_source(row: &Row) -> rusqlite::Result<MediaFileSource> {
    let kind: String = row.get(3)?;
    match kind.as_str() {
        "path" => Ok(MediaFileSource::Path { path: row.get(4)? }),
        "browser_file" => Ok(MediaFileSource::BrowserFile {
            size: read_unsigned(row, 5)?,
            last_modified_ms: read_unsigned(row, 6)?,
        }),
        "library" => Ok(MediaFileSource::Library {
            item_id: LibraryItemId(row.get(4)?),
        }),
        other => Err(rusqlite::Error::InvalidColumnType(
            3,
            format!("unknown media file source kind {other:?}"),
            rusqlite::types::Type::Text,
        )),
    }
}

fn ensure_one_row_changed(changed: usize, id: &MediaFileId) -> Result<(), StorageError> {
    if changed == 0 {
        Err(StorageError::MediaFileNotFound(id.0.clone()))
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Storage;

    fn project() -> ProjectId {
        ProjectId("placeholder-1".to_string())
    }

    fn path_source(path: &str) -> MediaFileSource {
        MediaFileSource::Path {
            path: path.to_string(),
        }
    }

    fn browser_source() -> MediaFileSource {
        MediaFileSource::BrowserFile {
            size: 1234,
            last_modified_ms: 5678,
        }
    }

    fn library_source() -> MediaFileSource {
        MediaFileSource::Library {
            item_id: LibraryItemId("item-1".to_string()),
        }
    }

    fn seeded_storage() -> Storage {
        let storage = Storage::open_in_memory().unwrap();
        crate::review_test_support::seed_known_placeholder_projects(&storage);
        storage
    }

    #[test]
    fn lists_nothing_for_a_project_without_media() {
        assert_eq!(
            seeded_storage().list_media_files(&project()).unwrap(),
            vec![]
        );
    }

    #[test]
    fn lists_an_added_media_file() {
        let storage = seeded_storage();
        let added = storage
            .add_media_file(&project(), "a.mp4", &path_source("/a.mp4"))
            .unwrap();
        assert_eq!(storage.list_media_files(&project()).unwrap(), vec![added]);
    }

    #[test]
    fn a_new_media_file_has_no_origin() {
        let storage = seeded_storage();
        let added = storage
            .add_media_file(&project(), "a.mp4", &path_source("/a.mp4"))
            .unwrap();
        assert_eq!(added.origin, None);
    }

    #[test]
    fn keeps_the_origin_once_set() {
        let storage = seeded_storage();
        let added = storage
            .add_media_file(&project(), "a.mp4", &path_source("/a.mp4"))
            .unwrap();
        let origin = MediaOrigin {
            plugin: "source".to_string(),
            locator: MediaLocator("https://example.com/a".to_string()),
        };
        storage.set_media_file_origin(&added.id, &origin).unwrap();
        assert_eq!(
            storage.get_media_file(&added.id).unwrap().origin,
            Some(origin)
        );
    }

    #[test]
    fn refuses_an_origin_for_an_unknown_media_file() {
        let storage = seeded_storage();
        let origin = MediaOrigin {
            plugin: "source".to_string(),
            locator: MediaLocator("x".to_string()),
        };
        let result = storage.set_media_file_origin(&MediaFileId("missing".to_string()), &origin);
        assert!(matches!(result, Err(StorageError::MediaFileNotFound(_))));
    }

    #[test]
    fn lists_the_oldest_media_file_first() {
        let storage = seeded_storage();
        storage
            .add_media_file(&project(), "first", &path_source("/1.mp4"))
            .unwrap();
        storage
            .add_media_file(&project(), "second", &path_source("/2.mp4"))
            .unwrap();
        let names: Vec<_> = storage
            .list_media_files(&project())
            .unwrap()
            .into_iter()
            .map(|file| file.name)
            .collect();
        assert_eq!(names, vec!["first", "second"]);
    }

    #[test]
    fn keeps_media_files_of_other_projects_out_of_the_list() {
        let storage = seeded_storage();
        storage
            .add_media_file(
                &ProjectId("placeholder-2".to_string()),
                "b",
                &path_source("/b.mp4"),
            )
            .unwrap();
        assert_eq!(storage.list_media_files(&project()).unwrap(), vec![]);
    }

    #[test]
    fn round_trips_a_browser_file_source() {
        let storage = seeded_storage();
        let added = storage
            .add_media_file(&project(), "b.webm", &browser_source())
            .unwrap();
        assert_eq!(
            storage.get_media_file(&added.id).unwrap().source,
            browser_source()
        );
    }

    #[test]
    fn round_trips_a_library_source() {
        let storage = seeded_storage();
        let added = storage
            .add_media_file(&project(), "Film", &library_source())
            .unwrap();
        assert_eq!(
            storage.get_media_file(&added.id).unwrap().source,
            library_source()
        );
    }

    #[test]
    fn finds_the_media_file_of_a_library_item() {
        let storage = seeded_storage();
        let added = storage
            .add_media_file(&project(), "Film", &library_source())
            .unwrap();
        let found = storage
            .find_library_media_file(&project(), &LibraryItemId("item-1".to_string()))
            .unwrap();
        assert_eq!(found, Some(added));
    }

    #[test]
    fn finds_no_library_media_file_in_another_project() {
        let storage = seeded_storage();
        storage
            .add_media_file(&project(), "Film", &library_source())
            .unwrap();
        let found = storage
            .find_library_media_file(
                &ProjectId("placeholder-2".to_string()),
                &LibraryItemId("item-1".to_string()),
            )
            .unwrap();
        assert_eq!(found, None);
    }

    #[test]
    fn finds_the_owners_media_file_of_a_library_item() {
        let storage = seeded_storage();
        let added = storage
            .add_media_file(&project(), "Film", &library_source())
            .unwrap();
        let found = storage
            .find_owners_library_media_file(
                &OwnerId::launch(),
                &LibraryItemId("item-1".to_string()),
            )
            .unwrap();
        assert_eq!(found, Some(added));
    }

    #[test]
    fn finds_no_media_file_of_a_library_item_for_another_owner() {
        let storage = seeded_storage();
        storage
            .add_media_file(&project(), "Film", &library_source())
            .unwrap();
        let other = crate::review_test_support::account_owner(&storage);
        let found = storage
            .find_owners_library_media_file(&other, &LibraryItemId("item-1".to_string()))
            .unwrap();
        assert_eq!(found, None);
    }

    #[test]
    fn stores_the_track_choice_of_every_media_file_of_a_library_item() {
        let storage = seeded_storage();
        let added = storage
            .add_media_file(
                &ProjectId("placeholder-2".to_string()),
                "Film",
                &library_source(),
            )
            .unwrap();
        let json = r#"{"video":0,"audio":2}"#;
        storage
            .set_library_media_track_selection_json(
                &LibraryItemId("item-1".to_string()),
                Some(json),
            )
            .unwrap();
        assert_eq!(
            storage
                .get_media_file(&added.id)
                .unwrap()
                .track_selection_json,
            Some(json.to_string())
        );
    }

    #[test]
    fn leaves_library_items_out_of_the_referenced_paths() {
        let storage = seeded_storage();
        storage
            .add_media_file(&project(), "Film", &library_source())
            .unwrap();
        assert!(storage.list_referenced_source_paths().unwrap().is_empty());
    }

    #[test]
    fn refuses_to_add_to_an_unknown_project() {
        let result = seeded_storage().add_media_file(
            &ProjectId("missing".to_string()),
            "a",
            &path_source("/a.mp4"),
        );
        assert!(matches!(result, Err(StorageError::ProjectNotFound(_))));
    }

    #[test]
    fn reports_an_unknown_media_file_as_not_found() {
        let result = seeded_storage().get_media_file(&MediaFileId("missing".to_string()));
        assert!(matches!(result, Err(StorageError::MediaFileNotFound(_))));
    }

    #[test]
    fn removes_a_media_file() {
        let storage = seeded_storage();
        let added = storage
            .add_media_file(&project(), "a", &path_source("/a.mp4"))
            .unwrap();
        storage.remove_media_file(&added.id).unwrap();
        assert_eq!(storage.list_media_files(&project()).unwrap(), vec![]);
    }

    #[test]
    fn removing_an_unknown_media_file_fails() {
        let result = seeded_storage().remove_media_file(&MediaFileId("missing".to_string()));
        assert!(matches!(result, Err(StorageError::MediaFileNotFound(_))));
    }

    #[test]
    fn stores_a_track_selection() {
        let storage = seeded_storage();
        let added = storage
            .add_media_file(&project(), "a", &path_source("/a.mp4"))
            .unwrap();
        storage
            .set_track_selection_json(&added.id, Some("{\"video\":0}"))
            .unwrap();
        assert_eq!(
            storage
                .get_media_file(&added.id)
                .unwrap()
                .track_selection_json,
            Some("{\"video\":0}".to_string())
        );
    }

    #[test]
    fn clears_a_track_selection() {
        let storage = seeded_storage();
        let added = storage
            .add_media_file(&project(), "a", &path_source("/a.mp4"))
            .unwrap();
        storage
            .set_track_selection_json(&added.id, Some("{}"))
            .unwrap();
        storage.set_track_selection_json(&added.id, None).unwrap();
        assert_eq!(
            storage
                .get_media_file(&added.id)
                .unwrap()
                .track_selection_json,
            None
        );
    }

    #[test]
    fn lists_each_referenced_path_once() {
        let storage = seeded_storage();
        for name in ["a", "b"] {
            storage
                .add_media_file(&project(), name, &path_source("/shared.mp4"))
                .unwrap();
        }
        storage
            .add_media_file(&project(), "c", &browser_source())
            .unwrap();
        assert_eq!(
            storage.list_referenced_source_paths().unwrap(),
            vec!["/shared.mp4"]
        );
    }

    #[test]
    fn deleting_a_project_removes_its_media_files() {
        let storage = seeded_storage();
        let added = storage
            .add_media_file(&project(), "a", &path_source("/a.mp4"))
            .unwrap();
        storage.delete_project(&project()).unwrap();
        assert!(matches!(
            storage.get_media_file(&added.id),
            Err(StorageError::MediaFileNotFound(_))
        ));
    }
}

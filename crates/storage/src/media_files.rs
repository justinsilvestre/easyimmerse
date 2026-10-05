use easyimmerse_core::media_file::{MediaFile, MediaFileId, MediaFileSource};
use easyimmerse_core::project::ProjectId;
use rusqlite::{Connection, OptionalExtension, Row, params};

use crate::error::StorageError;
use crate::new_row::{generate_id, now_ms};
use crate::projects::ensure_project_exists;
use crate::stored_integer::{read_unsigned, to_stored_integer};

const MEDIA_FILE_COLUMNS: &str = "id, project_id, name, source_kind, source_path, browser_file_size, \
     browser_file_last_modified_ms, created_at_ms, track_selection_json";

/// Lists a project's media files, oldest first.
pub fn list_media_files(
    conn: &Connection,
    project_id: &ProjectId,
) -> Result<Vec<MediaFile>, StorageError> {
    let mut statement = conn.prepare(&format!(
        "SELECT {MEDIA_FILE_COLUMNS} FROM media_files WHERE project_id = ?1 \
         ORDER BY created_at_ms, rowid"
    ))?;
    let media_files = statement
        .query_map(params![project_id.0], read_media_file)?
        .collect::<Result<_, _>>()?;
    Ok(media_files)
}

pub fn get_media_file(conn: &Connection, id: &MediaFileId) -> Result<MediaFile, StorageError> {
    conn.query_row(
        &format!("SELECT {MEDIA_FILE_COLUMNS} FROM media_files WHERE id = ?1"),
        params![id.0],
        read_media_file,
    )
    .optional()?
    .ok_or_else(|| StorageError::MediaFileNotFound(id.0.clone()))
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
        created_at_ms: now_ms(),
        track_selection_json: None,
    };
    insert_media_file(conn, &media_file)?;
    Ok(media_file)
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
         WHERE source_path IS NOT NULL ORDER BY source_path",
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
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
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
    }
}

fn read_media_file(row: &Row) -> rusqlite::Result<MediaFile> {
    Ok(MediaFile {
        id: MediaFileId(row.get(0)?),
        project_id: ProjectId(row.get(1)?),
        name: row.get(2)?,
        source: read_source(row)?,
        created_at_ms: read_unsigned(row, 7)?,
        track_selection_json: row.get(8)?,
    })
}

fn read_source(row: &Row) -> rusqlite::Result<MediaFileSource> {
    let kind: String = row.get(3)?;
    match kind.as_str() {
        "path" => Ok(MediaFileSource::Path { path: row.get(4)? }),
        "browser_file" => Ok(MediaFileSource::BrowserFile {
            size: read_unsigned(row, 5)?,
            last_modified_ms: read_unsigned(row, 6)?,
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

    fn seeded_storage() -> Storage {
        let storage = Storage::open_in_memory().unwrap();
        storage.seed_placeholder_projects().unwrap();
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

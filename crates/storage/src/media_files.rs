use easyimmerse_core::media_file::{MediaFile, MediaId, NewMediaFile};
use easyimmerse_core::project::ProjectId;
use rusqlite::{Connection, OptionalExtension, params};

use crate::enum_text::{from_enum_text, to_enum_text};
use crate::error::{StorageError, require_changed_row};
use crate::ids::generate_id;
use crate::projects::ensure_project_exists;
use crate::subtitle_tracks::list_subtitle_tracks;

const MEDIA_COLUMNS: &str = "id, name, kind, source_json, duration_ms, added_at";

/// Lists the media files of a project in the order they were added.
pub fn list_media_files(
    conn: &Connection,
    project_id: &ProjectId,
) -> Result<Vec<MediaFile>, StorageError> {
    let mut statement = conn.prepare(&format!(
        "SELECT {MEDIA_COLUMNS} FROM media_files WHERE project_id = ?1 ORDER BY added_at, rowid"
    ))?;
    let rows = statement
        .query_map(params![project_id.0], read_media_row)?
        .collect::<Result<Vec<_>, _>>()?;
    rows.into_iter()
        .map(|row| row.into_media_file(conn))
        .collect()
}

/// Loads one media file of a project with its subtitle tracks.
pub fn get_media_file(
    conn: &Connection,
    project_id: &ProjectId,
    media_id: &MediaId,
) -> Result<MediaFile, StorageError> {
    conn.query_row(
        &format!("SELECT {MEDIA_COLUMNS} FROM media_files WHERE id = ?1 AND project_id = ?2"),
        params![media_id.0, project_id.0],
        read_media_row,
    )
    .optional()?
    .ok_or_else(|| StorageError::MediaNotFound(media_id.0.clone()))?
    .into_media_file(conn)
}

pub fn add_media_file(
    conn: &Connection,
    project_id: &ProjectId,
    media: &NewMediaFile,
    now: &str,
) -> Result<MediaFile, StorageError> {
    ensure_project_exists(conn, project_id)?;
    let id = MediaId(generate_id());
    conn.execute(
        "INSERT INTO media_files (id, project_id, name, kind, source_json, added_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            id.0,
            project_id.0,
            media.name,
            to_enum_text(&media.kind)?,
            serde_json::to_string(&media.source)?,
            now
        ],
    )?;
    get_media_file(conn, project_id, &id)
}

pub fn set_media_duration(
    conn: &Connection,
    project_id: &ProjectId,
    media_id: &MediaId,
    duration_ms: u64,
) -> Result<MediaFile, StorageError> {
    let changed = conn.execute(
        "UPDATE media_files SET duration_ms = ?3 WHERE id = ?1 AND project_id = ?2",
        params![media_id.0, project_id.0, duration_ms],
    )?;
    require_changed_row(changed, StorageError::MediaNotFound(media_id.0.clone()))?;
    get_media_file(conn, project_id, media_id)
}

/// Removes a media file and its subtitle tracks. Flashcards made from it are kept, but no
/// longer refer to it.
pub fn remove_media_file(
    conn: &Connection,
    project_id: &ProjectId,
    media_id: &MediaId,
) -> Result<(), StorageError> {
    let changed = conn.execute(
        "DELETE FROM media_files WHERE id = ?1 AND project_id = ?2",
        params![media_id.0, project_id.0],
    )?;
    require_changed_row(changed, StorageError::MediaNotFound(media_id.0.clone()))
}

pub fn ensure_media_exists(
    conn: &Connection,
    project_id: &ProjectId,
    media_id: &MediaId,
) -> Result<(), StorageError> {
    conn.query_row(
        "SELECT 1 FROM media_files WHERE id = ?1 AND project_id = ?2",
        params![media_id.0, project_id.0],
        |_| Ok(()),
    )
    .optional()?
    .ok_or_else(|| StorageError::MediaNotFound(media_id.0.clone()))
}

/// One media row with its text-encoded columns still unparsed, so that the row callback
/// stays within rusqlite's error type.
struct MediaRow {
    id: String,
    name: String,
    kind: String,
    source_json: String,
    duration_ms: Option<u64>,
    added_at: String,
}

impl MediaRow {
    fn into_media_file(self, conn: &Connection) -> Result<MediaFile, StorageError> {
        let id = MediaId(self.id);
        Ok(MediaFile {
            subtitle_tracks: list_subtitle_tracks(conn, &id)?,
            id,
            name: self.name,
            kind: from_enum_text(&self.kind)?,
            source: serde_json::from_str(&self.source_json)?,
            duration_ms: self.duration_ms,
            added_at: self.added_at,
        })
    }
}

fn read_media_row(row: &rusqlite::Row) -> rusqlite::Result<MediaRow> {
    Ok(MediaRow {
        id: row.get(0)?,
        name: row.get(1)?,
        kind: row.get(2)?,
        source_json: row.get(3)?,
        duration_ms: row.get(4)?,
        added_at: row.get(5)?,
    })
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::media_file::{MediaId, MediaKind, MediaSource, NewMediaFile};
    use easyimmerse_core::project::ProjectId;

    use crate::test_support::{NOW, count_rows, settings, storage_with_project};
    use crate::{Storage, StorageError};

    fn video(name: &str) -> NewMediaFile {
        NewMediaFile {
            name: name.to_string(),
            kind: MediaKind::Video,
            source: MediaSource::Path {
                path: format!("/videos/{name}"),
            },
        }
    }

    fn storage_with_media() -> (Storage, ProjectId, MediaId) {
        let (storage, project_id) = storage_with_project();
        let media = storage
            .add_media_file(&project_id, &video("a.mp4"), NOW)
            .unwrap();
        (storage, project_id, media.id)
    }

    fn missing() -> MediaId {
        MediaId("missing".to_string())
    }

    #[test]
    fn adds_a_media_file_to_the_project() {
        let (storage, project_id, media_id) = storage_with_media();
        let project = storage.get_project(&project_id).unwrap();
        assert_eq!(project.media[0].id, media_id);
    }

    #[test]
    fn a_new_media_file_has_no_duration() {
        let (storage, project_id, media_id) = storage_with_media();
        let media = storage.get_media_file(&project_id, &media_id).unwrap();
        assert_eq!(media.duration_ms, None);
    }

    #[test]
    fn keeps_the_media_source() {
        let (storage, project_id, media_id) = storage_with_media();
        let media = storage.get_media_file(&project_id, &media_id).unwrap();
        assert_eq!(media.source, video("a.mp4").source);
    }

    #[test]
    fn lists_media_files_in_the_order_they_were_added() {
        let (storage, project_id, _) = storage_with_media();
        storage
            .add_media_file(&project_id, &video("b.mp4"), NOW)
            .unwrap();
        let names: Vec<String> = storage
            .get_project(&project_id)
            .unwrap()
            .media
            .into_iter()
            .map(|media| media.name)
            .collect();
        assert_eq!(names, vec!["a.mp4", "b.mp4"]);
    }

    #[test]
    fn adding_media_to_an_unknown_project_fails() {
        let storage = Storage::open_in_memory().unwrap();
        let result = storage.add_media_file(&ProjectId("missing".into()), &video("a.mp4"), NOW);
        assert!(matches!(result, Err(StorageError::ProjectNotFound(_))));
    }

    #[test]
    fn sets_the_duration_of_a_media_file() {
        let (storage, project_id, media_id) = storage_with_media();
        let media = storage
            .set_media_duration(&project_id, &media_id, 5000)
            .unwrap();
        assert_eq!(media.duration_ms, Some(5000));
    }

    #[test]
    fn setting_the_duration_of_unknown_media_fails() {
        let (storage, project_id, _) = storage_with_media();
        assert!(matches!(
            storage.set_media_duration(&project_id, &missing(), 5000),
            Err(StorageError::MediaNotFound(_))
        ));
    }

    #[test]
    fn does_not_find_media_through_another_project() {
        let (storage, _, media_id) = storage_with_media();
        let other = storage.create_project(&settings(), NOW).unwrap().id;
        assert!(matches!(
            storage.get_media_file(&other, &media_id),
            Err(StorageError::MediaNotFound(_))
        ));
    }

    #[test]
    fn removes_a_media_file() {
        let (storage, project_id, media_id) = storage_with_media();
        storage.remove_media_file(&project_id, &media_id).unwrap();
        assert!(storage.get_project(&project_id).unwrap().media.is_empty());
    }

    #[test]
    fn removing_unknown_media_fails() {
        let (storage, project_id, _) = storage_with_media();
        assert!(matches!(
            storage.remove_media_file(&project_id, &missing()),
            Err(StorageError::MediaNotFound(_))
        ));
    }

    #[test]
    fn deleting_the_project_removes_its_media() {
        let (storage, project_id, _) = storage_with_media();
        storage.delete_project(&project_id).unwrap();
        assert_eq!(count_rows(&storage, "media_files"), 0);
    }
}

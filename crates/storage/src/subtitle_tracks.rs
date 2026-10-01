use easyimmerse_core::media_file::{MediaId, NewSubtitleTrack, SubtitleTrack};
use easyimmerse_core::project::ProjectId;
use rusqlite::{Connection, params};

use crate::enum_text::{from_enum_text, to_enum_text};
use crate::error::{StorageError, require_changed_row};
use crate::ids::generate_id;
use crate::media_files::ensure_media_exists;

/// Lists the subtitle tracks of a media file in the order they were attached.
pub fn list_subtitle_tracks(
    conn: &Connection,
    media_id: &MediaId,
) -> Result<Vec<SubtitleTrack>, StorageError> {
    let mut statement = conn.prepare(
        "SELECT id, name, role, language, source_json FROM subtitle_tracks
         WHERE media_id = ?1 ORDER BY rowid",
    )?;
    let rows = statement
        .query_map(params![media_id.0], read_track_row)?
        .collect::<Result<Vec<_>, _>>()?;
    rows.into_iter()
        .map(TrackRow::into_subtitle_track)
        .collect()
}

pub fn add_subtitle_track(
    conn: &Connection,
    project_id: &ProjectId,
    media_id: &MediaId,
    track: &NewSubtitleTrack,
) -> Result<SubtitleTrack, StorageError> {
    ensure_media_exists(conn, project_id, media_id)?;
    let id = generate_id();
    conn.execute(
        "INSERT INTO subtitle_tracks (id, media_id, name, role, language, source_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            id,
            media_id.0,
            track.name,
            to_enum_text(&track.role)?,
            track.language,
            serde_json::to_string(&track.source)?
        ],
    )?;
    Ok(SubtitleTrack {
        id,
        name: track.name.clone(),
        role: track.role,
        language: track.language.clone(),
        source: track.source.clone(),
    })
}

pub fn remove_subtitle_track(
    conn: &Connection,
    project_id: &ProjectId,
    media_id: &MediaId,
    track_id: &str,
) -> Result<(), StorageError> {
    ensure_media_exists(conn, project_id, media_id)?;
    let changed = conn.execute(
        "DELETE FROM subtitle_tracks WHERE id = ?1 AND media_id = ?2",
        params![track_id, media_id.0],
    )?;
    require_changed_row(
        changed,
        StorageError::SubtitleTrackNotFound(track_id.to_string()),
    )
}

/// One track row with its text-encoded columns still unparsed, so that the row callback
/// stays within rusqlite's error type.
struct TrackRow {
    id: String,
    name: String,
    role: String,
    language: Option<String>,
    source_json: String,
}

impl TrackRow {
    fn into_subtitle_track(self) -> Result<SubtitleTrack, StorageError> {
        Ok(SubtitleTrack {
            id: self.id,
            name: self.name,
            role: from_enum_text(&self.role)?,
            language: self.language,
            source: serde_json::from_str(&self.source_json)?,
        })
    }
}

fn read_track_row(row: &rusqlite::Row) -> rusqlite::Result<TrackRow> {
    Ok(TrackRow {
        id: row.get(0)?,
        name: row.get(1)?,
        role: row.get(2)?,
        language: row.get(3)?,
        source_json: row.get(4)?,
    })
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::media_file::{
        MediaId, MediaKind, MediaSource, NewMediaFile, NewSubtitleTrack, SubtitleRole,
        SubtitleTrackSource,
    };
    use easyimmerse_core::project::ProjectId;

    use crate::test_support::{NOW, count_rows, storage_with_project};
    use crate::{Storage, StorageError};

    fn embedded_track() -> NewSubtitleTrack {
        NewSubtitleTrack {
            name: "English".to_string(),
            role: SubtitleRole::Target,
            language: Some("en".to_string()),
            source: SubtitleTrackSource::Embedded { track_id: 3 },
        }
    }

    fn storage_with_media() -> (Storage, ProjectId, MediaId) {
        let (storage, project_id) = storage_with_project();
        let media = NewMediaFile {
            name: "a.mp4".to_string(),
            kind: MediaKind::Video,
            source: MediaSource::BrowserFile {
                key: "k".to_string(),
            },
        };
        let media = storage.add_media_file(&project_id, &media, NOW).unwrap();
        (storage, project_id, media.id)
    }

    fn storage_with_track() -> (Storage, ProjectId, MediaId, String) {
        let (storage, project_id, media_id) = storage_with_media();
        let track = storage
            .add_subtitle_track(&project_id, &media_id, &embedded_track())
            .unwrap();
        (storage, project_id, media_id, track.id)
    }

    #[test]
    fn attaches_a_track_to_the_media_file() {
        let (storage, project_id, media_id, _) = storage_with_track();
        let media = storage.get_media_file(&project_id, &media_id).unwrap();
        assert_eq!(media.subtitle_tracks[0].source, embedded_track().source);
    }

    #[test]
    fn returns_the_stored_track() {
        let (storage, project_id, media_id, track_id) = storage_with_track();
        let media = storage.get_media_file(&project_id, &media_id).unwrap();
        assert_eq!(media.subtitle_tracks[0].id, track_id);
    }

    #[test]
    fn attaching_a_track_to_unknown_media_fails() {
        let (storage, project_id, _) = storage_with_media();
        let result = storage.add_subtitle_track(
            &project_id,
            &MediaId("missing".to_string()),
            &embedded_track(),
        );
        assert!(matches!(result, Err(StorageError::MediaNotFound(_))));
    }

    #[test]
    fn removes_a_track() {
        let (storage, project_id, media_id, track_id) = storage_with_track();
        storage
            .remove_subtitle_track(&project_id, &media_id, &track_id)
            .unwrap();
        let media = storage.get_media_file(&project_id, &media_id).unwrap();
        assert!(media.subtitle_tracks.is_empty());
    }

    #[test]
    fn removing_an_unknown_track_fails() {
        let (storage, project_id, media_id, _) = storage_with_track();
        assert!(matches!(
            storage.remove_subtitle_track(&project_id, &media_id, "missing"),
            Err(StorageError::SubtitleTrackNotFound(_))
        ));
    }

    #[test]
    fn removing_the_media_file_removes_its_tracks() {
        let (storage, project_id, media_id, _) = storage_with_track();
        storage.remove_media_file(&project_id, &media_id).unwrap();
        assert_eq!(count_rows(&storage, "subtitle_tracks"), 0);
    }
}

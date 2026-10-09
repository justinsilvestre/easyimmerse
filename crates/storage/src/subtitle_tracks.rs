use easyimmerse_core::media_file::MediaFileId;
use easyimmerse_core::subtitle_track::{SubtitleSelection, SubtitleTrack, SubtitleTrackId};
use easyimmerse_core::text_source::TextSource;
use easyimmerse_core::timed_text::TimedTextFormat;
use rusqlite::{Connection, OptionalExtension, Row, params};

use crate::error::StorageError;
use crate::media_files::ensure_media_file_exists;
use crate::new_row::{generate_id, now_ms};
use crate::stored_integer::{read_json, read_unsigned, to_stored_integer};

const TRACK_COLUMNS: &str = "id, media_file_id, name, format, source_json, sample, created_at_ms";

/// A subtitle track together with where its text comes from.
#[derive(Debug, Clone, PartialEq)]
pub struct StoredSubtitleTrack {
    pub track: SubtitleTrack,
    pub source: TextSource,
}

/// What a new track is made of, beyond the media file it belongs to.
#[derive(Debug, Clone, PartialEq)]
pub struct NewSubtitleTrack {
    pub name: String,
    pub format: TimedTextFormat,
    pub source: TextSource,
    pub sample: Option<String>,
}

/// Lists a media file's subtitle tracks, oldest first.
pub fn list_subtitle_tracks(
    conn: &Connection,
    media_file_id: &MediaFileId,
) -> Result<Vec<SubtitleTrack>, StorageError> {
    let mut statement = conn.prepare(&format!(
        "SELECT {TRACK_COLUMNS} FROM subtitle_tracks WHERE media_file_id = ?1 \
         ORDER BY created_at_ms, rowid"
    ))?;
    let tracks = statement
        .query_map(params![media_file_id.0], |row| Ok(read_track(row)?.track))?
        .collect::<Result<_, _>>()?;
    Ok(tracks)
}

pub fn get_subtitle_track(
    conn: &Connection,
    id: &SubtitleTrackId,
) -> Result<StoredSubtitleTrack, StorageError> {
    conn.query_row(
        &format!("SELECT {TRACK_COLUMNS} FROM subtitle_tracks WHERE id = ?1"),
        params![id.0],
        read_track,
    )
    .optional()?
    .ok_or_else(|| StorageError::SubtitleTrackNotFound(id.0.clone()))
}

pub fn add_subtitle_track(
    conn: &Connection,
    media_file_id: &MediaFileId,
    track: &NewSubtitleTrack,
) -> Result<SubtitleTrack, StorageError> {
    ensure_media_file_exists(conn, media_file_id)?;
    let id = SubtitleTrackId(generate_id());
    conn.execute(
        &format!(
            "INSERT INTO subtitle_tracks ({TRACK_COLUMNS}) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
        ),
        params![
            id.0,
            media_file_id.0,
            track.name,
            format_name(track.format),
            serde_json::to_string(&track.source)?,
            track.sample,
            to_stored_integer(now_ms()),
        ],
    )?;
    Ok(get_subtitle_track(conn, &id)?.track)
}

/// Removes a track and takes it out of its media file's selection.
pub fn remove_subtitle_track(conn: &Connection, id: &SubtitleTrackId) -> Result<(), StorageError> {
    let stored = get_subtitle_track(conn, id)?;
    let selection = get_subtitle_selection(conn, &stored.track.media_file_id)?.without_track(id);
    write_subtitle_selection(conn, &stored.track.media_file_id, &selection)?;
    conn.execute("DELETE FROM subtitle_tracks WHERE id = ?1", params![id.0])?;
    Ok(())
}

pub fn get_subtitle_selection(
    conn: &Connection,
    media_file_id: &MediaFileId,
) -> Result<SubtitleSelection, StorageError> {
    conn.query_row(
        "SELECT target_subtitle_track_id, translation_subtitle_track_id \
         FROM media_files WHERE id = ?1",
        params![media_file_id.0],
        |row| {
            Ok(SubtitleSelection {
                target_track_id: row.get::<_, Option<String>>(0)?.map(SubtitleTrackId),
                translation_track_id: row.get::<_, Option<String>>(1)?.map(SubtitleTrackId),
            })
        },
    )
    .optional()?
    .ok_or_else(|| StorageError::MediaFileNotFound(media_file_id.0.clone()))
}

/// Stores which tracks the media file shows. Each named track must belong to the media file.
pub fn set_subtitle_selection(
    conn: &Connection,
    media_file_id: &MediaFileId,
    selection: &SubtitleSelection,
) -> Result<(), StorageError> {
    ensure_media_file_exists(conn, media_file_id)?;
    for track_id in [&selection.target_track_id, &selection.translation_track_id]
        .into_iter()
        .flatten()
    {
        ensure_track_in_media_file(conn, media_file_id, track_id)?;
    }
    write_subtitle_selection(conn, media_file_id, selection)
}

fn write_subtitle_selection(
    conn: &Connection,
    media_file_id: &MediaFileId,
    selection: &SubtitleSelection,
) -> Result<(), StorageError> {
    conn.execute(
        "UPDATE media_files SET target_subtitle_track_id = ?2, translation_subtitle_track_id = ?3 \
         WHERE id = ?1",
        params![
            media_file_id.0,
            selection.target_track_id.as_ref().map(|id| &id.0),
            selection.translation_track_id.as_ref().map(|id| &id.0),
        ],
    )?;
    Ok(())
}

fn ensure_track_in_media_file(
    conn: &Connection,
    media_file_id: &MediaFileId,
    track_id: &SubtitleTrackId,
) -> Result<(), StorageError> {
    let stored = get_subtitle_track(conn, track_id)?;
    if stored.track.media_file_id == *media_file_id {
        Ok(())
    } else {
        Err(StorageError::SubtitleTrackNotFound(track_id.0.clone()))
    }
}

fn format_name(format: TimedTextFormat) -> &'static str {
    match format {
        TimedTextFormat::Srt => "srt",
        TimedTextFormat::Vtt => "vtt",
    }
}

fn parse_format(name: &str, index: usize) -> rusqlite::Result<TimedTextFormat> {
    match name {
        "srt" => Ok(TimedTextFormat::Srt),
        "vtt" => Ok(TimedTextFormat::Vtt),
        other => Err(rusqlite::Error::InvalidColumnType(
            index,
            format!("unknown subtitle format {other:?}"),
            rusqlite::types::Type::Text,
        )),
    }
}

fn read_track(row: &Row) -> rusqlite::Result<StoredSubtitleTrack> {
    let format: String = row.get(3)?;
    Ok(StoredSubtitleTrack {
        track: SubtitleTrack {
            id: SubtitleTrackId(row.get(0)?),
            media_file_id: MediaFileId(row.get(1)?),
            name: row.get(2)?,
            format: parse_format(&format, 3)?,
            sample: row.get(5)?,
            created_at_ms: read_unsigned(row, 6)?,
        },
        source: read_json(row, 4)?,
    })
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::media_file::MediaFileSource;
    use easyimmerse_core::project::ProjectId;
    use easyimmerse_core::subtitle_track::SubtitleRole;

    use super::*;
    use crate::Storage;

    fn storage_with_media() -> (Storage, MediaFileId) {
        let storage = Storage::open_in_memory().unwrap();
        storage.seed_placeholder_projects().unwrap();
        let media = storage
            .add_media_file(
                &ProjectId("placeholder-1".to_string()),
                "a.mp4",
                &MediaFileSource::Path {
                    path: "/a.mp4".to_string(),
                },
            )
            .unwrap();
        (storage, media.id)
    }

    fn new_track(name: &str) -> NewSubtitleTrack {
        NewSubtitleTrack {
            name: name.to_string(),
            format: TimedTextFormat::Srt,
            source: TextSource::Inline {
                text: "1\n00:00:00,500 --> 00:00:01,500\nHi".to_string(),
            },
            sample: Some("Hi".to_string()),
        }
    }

    #[test]
    fn lists_nothing_for_a_media_file_without_tracks() {
        let (storage, media) = storage_with_media();
        assert_eq!(storage.list_subtitle_tracks(&media).unwrap(), vec![]);
    }

    #[test]
    fn an_added_track_is_listed() {
        let (storage, media) = storage_with_media();
        let added = storage
            .add_subtitle_track(&media, &new_track("a.srt"))
            .unwrap();
        assert_eq!(storage.list_subtitle_tracks(&media).unwrap(), vec![added]);
    }

    #[test]
    fn an_added_track_keeps_its_source() {
        let (storage, media) = storage_with_media();
        let added = storage
            .add_subtitle_track(&media, &new_track("a.srt"))
            .unwrap();
        assert_eq!(
            storage.get_subtitle_track(&added.id).unwrap().source,
            new_track("a.srt").source
        );
    }

    #[test]
    fn refuses_a_track_for_an_unknown_media_file() {
        let (storage, _) = storage_with_media();
        let result =
            storage.add_subtitle_track(&MediaFileId("missing".to_string()), &new_track("a"));
        assert!(matches!(result, Err(StorageError::MediaFileNotFound(_))));
    }

    #[test]
    fn a_new_media_file_shows_no_subtitles() {
        let (storage, media) = storage_with_media();
        assert_eq!(
            storage.get_subtitle_selection(&media).unwrap(),
            SubtitleSelection::default()
        );
    }

    #[test]
    fn stores_the_selection() {
        let (storage, media) = storage_with_media();
        let added = storage
            .add_subtitle_track(&media, &new_track("a.srt"))
            .unwrap();
        let selection = SubtitleSelection::default().with_role(SubtitleRole::Target, added.id);
        storage.set_subtitle_selection(&media, &selection).unwrap();
        assert_eq!(storage.get_subtitle_selection(&media).unwrap(), selection);
    }

    #[test]
    fn refuses_a_selection_naming_a_track_of_another_media_file() {
        let (storage, media) = storage_with_media();
        let other = storage
            .add_media_file(
                &ProjectId("placeholder-1".to_string()),
                "b.mp4",
                &MediaFileSource::Path {
                    path: "/b.mp4".to_string(),
                },
            )
            .unwrap();
        let foreign = storage
            .add_subtitle_track(&other.id, &new_track("b.srt"))
            .unwrap();
        let result = storage.set_subtitle_selection(
            &media,
            &SubtitleSelection::default().with_role(SubtitleRole::Target, foreign.id),
        );
        assert!(matches!(
            result,
            Err(StorageError::SubtitleTrackNotFound(_))
        ));
    }

    #[test]
    fn removing_a_track_takes_it_out_of_the_selection() {
        let (storage, media) = storage_with_media();
        let added = storage
            .add_subtitle_track(&media, &new_track("a.srt"))
            .unwrap();
        storage
            .set_subtitle_selection(
                &media,
                &SubtitleSelection::default().with_role(SubtitleRole::Target, added.id.clone()),
            )
            .unwrap();
        storage.remove_subtitle_track(&added.id).unwrap();
        assert_eq!(
            storage.get_subtitle_selection(&media).unwrap(),
            SubtitleSelection::default()
        );
    }

    #[test]
    fn removing_an_unknown_track_fails() {
        let (storage, _) = storage_with_media();
        let result = storage.remove_subtitle_track(&SubtitleTrackId("missing".to_string()));
        assert!(matches!(
            result,
            Err(StorageError::SubtitleTrackNotFound(_))
        ));
    }

    #[test]
    fn removing_the_media_file_removes_its_tracks() {
        let (storage, media) = storage_with_media();
        let added = storage
            .add_subtitle_track(&media, &new_track("a.srt"))
            .unwrap();
        storage.remove_media_file(&media).unwrap();
        assert!(matches!(
            storage.get_subtitle_track(&added.id),
            Err(StorageError::SubtitleTrackNotFound(_))
        ));
    }
}

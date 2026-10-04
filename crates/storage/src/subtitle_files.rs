use easyimmerse_core::media_file::{MediaFileId, SubtitleSelection};
use easyimmerse_core::subtitle_file::SubtitleFileId;
use easyimmerse_core::timed_text::TimedTextFormat;
use rusqlite::{Connection, Row, params};

use crate::error::StorageError;
use crate::media_files::{get_media_file, set_subtitle_selection};
use crate::stored_values::{
    enum_from_text, enum_to_text, now_ms, random_id, read_unsigned, to_stored_integer,
};

/// A subtitles file as stored: its text as added, not yet parsed into cues.
#[derive(Debug, Clone, PartialEq)]
pub struct StoredSubtitleFile {
    pub id: SubtitleFileId,
    pub media_file_id: MediaFileId,
    pub name: String,
    pub language: Option<String>,
    pub text: String,
    pub format: TimedTextFormat,
    pub created_at_ms: u64,
}

/// What the user adds as a subtitles file.
#[derive(Debug, Clone, PartialEq)]
pub struct NewSubtitleFile {
    pub name: String,
    pub language: Option<String>,
    pub text: String,
    /// The format the text parsed as.
    pub format: TimedTextFormat,
}

/// Lists a media file's subtitles files, oldest first.
pub fn list_subtitle_files(
    conn: &Connection,
    media_file_id: &MediaFileId,
) -> Result<Vec<StoredSubtitleFile>, StorageError> {
    let mut statement = conn.prepare(
        "SELECT id, media_file_id, name, language, text, format, created_at_ms \
         FROM subtitle_files WHERE media_file_id = ?1 ORDER BY created_at_ms, rowid",
    )?;
    let rows = statement.query_map(params![media_file_id.0], read_subtitle_file_row)?;
    rows.map(|row| row?.into_stored_subtitle_file()).collect()
}

pub fn add_subtitle_file(
    conn: &Connection,
    media_file_id: &MediaFileId,
    file: &NewSubtitleFile,
) -> Result<StoredSubtitleFile, StorageError> {
    get_media_file(conn, media_file_id)?;
    let stored = StoredSubtitleFile {
        id: SubtitleFileId(random_id()),
        media_file_id: media_file_id.clone(),
        name: file.name.clone(),
        language: file.language.clone(),
        text: file.text.clone(),
        format: file.format,
        created_at_ms: now_ms(),
    };
    conn.execute(
        "INSERT INTO subtitle_files (id, media_file_id, name, language, text, format, created_at_ms) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            stored.id.0,
            stored.media_file_id.0,
            stored.name,
            stored.language,
            stored.text,
            enum_to_text(&stored.format)?,
            to_stored_integer(stored.created_at_ms),
        ],
    )?;
    Ok(stored)
}

/// Removes a subtitles file and clears the media file's subtitle selection where it named
/// the file.
pub fn remove_subtitle_file(
    conn: &mut Connection,
    media_file_id: &MediaFileId,
    id: &SubtitleFileId,
) -> Result<(), StorageError> {
    let transaction = conn.transaction()?;
    let removed = transaction.execute(
        "DELETE FROM subtitle_files WHERE id = ?1 AND media_file_id = ?2",
        params![id.0, media_file_id.0],
    )?;
    if removed == 0 {
        return Err(StorageError::SubtitleFileNotFound(id.0.clone()));
    }
    let selection = get_media_file(&transaction, media_file_id)?.subtitle_selection;
    set_subtitle_selection(
        &transaction,
        media_file_id,
        &without_file(selection, &subtitle_file_track_id(id)),
    )?;
    transaction.commit()?;
    Ok(())
}

/// The subtitle track id that names a subtitles file in a `SubtitleSelection`.
pub fn subtitle_file_track_id(id: &SubtitleFileId) -> String {
    format!("file:{}", id.0)
}

fn without_file(selection: SubtitleSelection, track_id: &str) -> SubtitleSelection {
    let keep = |chosen: Option<String>| chosen.filter(|chosen| chosen != track_id);
    SubtitleSelection {
        target: keep(selection.target),
        translation: keep(selection.translation),
    }
}

/// One row with its format still unparsed, so that the row callback stays within rusqlite's
/// error type.
struct SubtitleFileRow {
    id: String,
    media_file_id: String,
    name: String,
    language: Option<String>,
    text: String,
    format: String,
    created_at_ms: u64,
}

impl SubtitleFileRow {
    fn into_stored_subtitle_file(self) -> Result<StoredSubtitleFile, StorageError> {
        Ok(StoredSubtitleFile {
            id: SubtitleFileId(self.id),
            media_file_id: MediaFileId(self.media_file_id),
            name: self.name,
            language: self.language,
            text: self.text,
            format: enum_from_text(self.format)?,
            created_at_ms: self.created_at_ms,
        })
    }
}

fn read_subtitle_file_row(row: &Row) -> rusqlite::Result<SubtitleFileRow> {
    Ok(SubtitleFileRow {
        id: row.get(0)?,
        media_file_id: row.get(1)?,
        name: row.get(2)?,
        language: row.get(3)?,
        text: row.get(4)?,
        format: row.get(5)?,
        created_at_ms: read_unsigned(row, 6)?,
    })
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::media_file::MediaFileSource;
    use easyimmerse_core::project::ProjectId;

    use super::*;
    use crate::Storage;

    fn storage_with_media_file() -> (Storage, MediaFileId) {
        let storage = Storage::open_in_memory().unwrap();
        storage.seed_placeholder_projects().unwrap();
        let source = MediaFileSource::Path {
            path: "/a.mp4".to_string(),
        };
        let media_file = storage
            .add_media_file(&ProjectId("placeholder-1".to_string()), "a", &source)
            .unwrap();
        (storage, media_file.id)
    }

    fn new_file(name: &str) -> NewSubtitleFile {
        NewSubtitleFile {
            name: name.to_string(),
            language: Some("es".to_string()),
            text: "WEBVTT\n".to_string(),
            format: TimedTextFormat::Vtt,
        }
    }

    #[test]
    fn lists_an_added_file() {
        let (storage, media_file_id) = storage_with_media_file();
        let added = storage
            .add_subtitle_file(&media_file_id, &new_file("a.vtt"))
            .unwrap();
        assert_eq!(
            storage.list_subtitle_files(&media_file_id).unwrap(),
            vec![added]
        );
    }

    #[test]
    fn refuses_to_add_to_an_unknown_media_file() {
        let (storage, _) = storage_with_media_file();
        let result =
            storage.add_subtitle_file(&MediaFileId("missing".to_string()), &new_file("a.vtt"));
        assert!(matches!(result, Err(StorageError::MediaFileNotFound(_))));
    }

    #[test]
    fn removes_a_file() {
        let (storage, media_file_id) = storage_with_media_file();
        let added = storage
            .add_subtitle_file(&media_file_id, &new_file("a.vtt"))
            .unwrap();
        storage
            .remove_subtitle_file(&media_file_id, &added.id)
            .unwrap();
        assert_eq!(storage.list_subtitle_files(&media_file_id).unwrap(), vec![]);
    }

    #[test]
    fn removing_a_file_clears_the_selection_that_named_it() {
        let (storage, media_file_id) = storage_with_media_file();
        let added = storage
            .add_subtitle_file(&media_file_id, &new_file("a.vtt"))
            .unwrap();
        let selection = SubtitleSelection {
            target: Some(subtitle_file_track_id(&added.id)),
            translation: Some("embedded:2".to_string()),
        };
        storage
            .set_subtitle_selection(&media_file_id, &selection)
            .unwrap();
        storage
            .remove_subtitle_file(&media_file_id, &added.id)
            .unwrap();
        assert_eq!(
            storage
                .get_media_file(&media_file_id)
                .unwrap()
                .subtitle_selection,
            SubtitleSelection {
                target: None,
                translation: Some("embedded:2".to_string()),
            }
        );
    }

    #[test]
    fn removing_an_unknown_file_fails() {
        let (storage, media_file_id) = storage_with_media_file();
        let result =
            storage.remove_subtitle_file(&media_file_id, &SubtitleFileId("missing".to_string()));
        assert!(matches!(result, Err(StorageError::SubtitleFileNotFound(_))));
    }

    #[test]
    fn removing_the_media_file_removes_its_subtitles_files() {
        let (storage, media_file_id) = storage_with_media_file();
        storage
            .add_subtitle_file(&media_file_id, &new_file("a.vtt"))
            .unwrap();
        storage.remove_media_file(&media_file_id).unwrap();
        assert_eq!(storage.list_subtitle_files(&media_file_id).unwrap(), vec![]);
    }
}

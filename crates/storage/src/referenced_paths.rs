//! Whether media files or subtitle tracks still name local paths.
//! Both look paths up exactly as stored, so callers pass paths in the form they were stored in.

use std::path::MAIN_SEPARATOR;

use rusqlite::{Connection, params};

use crate::error::StorageError;

/// Whether a media file or a subtitle track names `path`.
pub fn is_path_referenced(conn: &Connection, path: &str) -> Result<bool, StorageError> {
    let referenced = conn.query_row(
        "SELECT EXISTS (SELECT 1 FROM media_files WHERE source_path = ?1) \
         OR EXISTS (SELECT 1 FROM subtitle_tracks \
                    WHERE json_extract(source_json, '$.path') = ?1)",
        params![path],
        |row| row.get(0),
    )?;
    Ok(referenced)
}

/// Whether a media file or a subtitle track names a path inside the directory `dir`.
pub fn is_path_referenced_inside(conn: &Connection, dir: &str) -> Result<bool, StorageError> {
    // Every path inside `dir` sorts between `dir` followed by the platform's separator and `dir`
    // followed by the character after the separator, which is ASCII like the separator itself.
    let after_separator = char::from(MAIN_SEPARATOR as u8 + 1);
    let dir = dir.trim_end_matches(MAIN_SEPARATOR);
    let (lower, upper) = (
        format!("{dir}{MAIN_SEPARATOR}"),
        format!("{dir}{after_separator}"),
    );
    let referenced = conn.query_row(
        "SELECT EXISTS (SELECT 1 FROM media_files \
                        WHERE source_path >= ?1 AND source_path < ?2) \
         OR EXISTS (SELECT 1 FROM subtitle_tracks \
                    WHERE json_extract(source_json, '$.path') >= ?1 \
                    AND json_extract(source_json, '$.path') < ?2)",
        params![lower, upper],
        |row| row.get(0),
    )?;
    Ok(referenced)
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::media_file::{MediaFileId, MediaFileSource};
    use easyimmerse_core::project::ProjectId;
    use easyimmerse_core::text_source::TextSource;
    use easyimmerse_core::timed_text::TimedTextFormat;

    use crate::{NewSubtitleTrack, Storage};

    /// Spells `path` with the platform's separator, as stored paths are spelled.
    fn native(path: &str) -> String {
        path.replace('/', std::path::MAIN_SEPARATOR_STR)
    }

    fn storage_with_media(path: &str) -> (Storage, MediaFileId) {
        let storage = Storage::open_in_memory().unwrap();
        storage.seed_placeholder_projects().unwrap();
        let source = MediaFileSource::Path {
            path: path.to_string(),
        };
        let media = storage
            .add_media_file(&ProjectId("placeholder-1".to_string()), "a", &source)
            .unwrap();
        (storage, media.id)
    }

    fn storage_with_track(path: &str) -> Storage {
        let (storage, media) = storage_with_media(&native("/media/a.mp4"));
        let track = NewSubtitleTrack {
            name: "a.srt".to_string(),
            format: TimedTextFormat::Srt,
            source: TextSource::Path {
                path: path.to_string(),
            },
            sample: None,
        };
        storage.add_subtitle_track(&media, &track).unwrap();
        storage
    }

    #[test]
    fn counts_a_path_named_by_a_media_file_as_referenced() {
        let (storage, _) = storage_with_media(&native("/media/item/a.mp4"));
        assert!(
            storage
                .is_path_referenced(&native("/media/item/a.mp4"))
                .unwrap()
        );
    }

    #[test]
    fn counts_a_path_named_by_a_subtitle_track_as_referenced() {
        let storage = storage_with_track(&native("/media/item/a.srt"));
        assert!(
            storage
                .is_path_referenced(&native("/media/item/a.srt"))
                .unwrap()
        );
    }

    #[test]
    fn counts_a_path_nothing_names_as_unreferenced() {
        let storage = storage_with_track(&native("/media/item/a.srt"));
        assert!(
            !storage
                .is_path_referenced(&native("/media/item/b.srt"))
                .unwrap()
        );
    }

    #[test]
    fn finds_a_media_file_inside_a_directory() {
        let (storage, _) = storage_with_media(&native("/media/item/a.mp4"));
        assert!(
            storage
                .is_path_referenced_inside(&native("/media/item"))
                .unwrap()
        );
    }

    #[test]
    fn finds_a_subtitle_track_deep_inside_a_directory() {
        let storage = storage_with_track(&native("/media/item/subtitles-1/a.srt"));
        assert!(
            storage
                .is_path_referenced_inside(&native("/media/item"))
                .unwrap()
        );
    }

    #[test]
    fn ignores_a_sibling_directory_sharing_a_name_prefix() {
        let storage = storage_with_track(&native("/media/item2/a.srt"));
        assert!(
            !storage
                .is_path_referenced_inside(&native("/media/item"))
                .unwrap()
        );
    }

    #[test]
    fn ignores_the_directory_path_itself() {
        let (storage, _) = storage_with_media(&native("/media/item"));
        assert!(
            !storage
                .is_path_referenced_inside(&native("/media/item"))
                .unwrap()
        );
    }
}

//! The words that name a synced row for the person, as a conflict notice shows them.

use rusqlite::{Connection, OptionalExtension, params};

use super::apply_pushed::text_of;
use super::codec::RowData;
use super::tables::SyncTable;
use crate::error::StorageError;
use crate::owners::OwnerId;

/// Names the row, such as "a flashcard in Spanish practice" or "whether translations are shown".
/// Reads the project's name here, or from the pulled data when the project is not here.
pub fn describe_row(
    conn: &Connection,
    owner: &OwnerId,
    table: SyncTable,
    key: &str,
    data: Option<&RowData>,
) -> Result<String, StorageError> {
    let thing = match table {
        SyncTable::Projects => {
            let name = project_name(conn, key)?.or_else(|| data.and_then(|d| text_of(d, "name")));
            return Ok(name.map_or_else(
                || "the settings of a project".to_string(),
                |name| format!("the settings of {name}"),
            ));
        }
        SyncTable::Preferences => return describe_preference(conn, owner, key),
        SyncTable::ReviewParameters => return Ok("the review parameters".to_string()),
        SyncTable::Dictionaries => {
            let title = data.and_then(|data| text_of(data, "title"));
            return Ok(title.map_or_else(
                || "a dictionary".to_string(),
                |title| format!("the dictionary {title}"),
            ));
        }
        SyncTable::MediaFiles => "a media file",
        SyncTable::SubtitleTracks => "a subtitle track",
        SyncTable::Alignments => "an alignment",
        SyncTable::Flashcards => "a flashcard",
        SyncTable::ReviewLog => "a review answer",
        SyncTable::ReviewHolds => "the review hold of a flashcard",
        SyncTable::ReviewDayAllowances => "the review allowance of a day",
        SyncTable::AnkiPendingDeletions => "a flashcard to delete from Anki",
    };
    let project_id = project_of(conn, owner, table, key, data)?;
    let name = match project_id {
        Some(project_id) => project_name(conn, &project_id)?,
        None => None,
    };
    Ok(name.map_or_else(|| thing.to_string(), |name| format!("{thing} in {name}")))
}

/// Names a preference in plain words, with the name of the media file that a position preference is for.
fn describe_preference(
    conn: &Connection,
    owner: &OwnerId,
    key: &str,
) -> Result<String, StorageError> {
    let (position, media_file_id, fallback) = match key {
        "showTranslations" => return Ok("whether translations are shown".to_string()),
        "showReviewIntervals" => return Ok("whether review intervals are shown".to_string()),
        _ => match key.split_once(':') {
            Some(("readingLocation", id)) => ("the reading position", id, "a document"),
            Some(("playbackPosition", id)) => ("the playback position", id, "a media file"),
            _ => return Ok(format!("the setting {key}")),
        },
    };
    let name = media_file_name(conn, owner, media_file_id)?;
    Ok(format!(
        "{position} in {}",
        name.as_deref().unwrap_or(fallback)
    ))
}

fn media_file_name(
    conn: &Connection,
    owner: &OwnerId,
    media_file_id: &str,
) -> Result<Option<String>, StorageError> {
    Ok(conn
        .query_row(
            "SELECT m.name FROM media_files m JOIN projects p ON p.id = m.project_id \
             WHERE m.id = ?1 AND p.owner_id = ?2",
            params![media_file_id, owner.0],
            |row| row.get(0),
        )
        .optional()?)
}

/// The project a row belongs to: from its registry entry here, else from its data.
fn project_of(
    conn: &Connection,
    owner: &OwnerId,
    table: SyncTable,
    key: &str,
    data: Option<&RowData>,
) -> Result<Option<String>, StorageError> {
    let registered: Option<Option<String>> = conn
        .query_row(
            "SELECT project_id FROM sync_rows WHERE table_name = ?1 AND row_key = ?2 AND owner_id = ?3",
            params![table.as_str(), key, owner.0],
            |row| row.get(0),
        )
        .optional()?;
    if let Some(Some(project_id)) = registered {
        return Ok(Some(project_id));
    }
    let Some(data) = data else {
        return Ok(None);
    };
    if let Some(project_id) = text_of(data, "project_id") {
        return Ok(Some(project_id));
    }
    let Some(media_file_id) = text_of(data, "media_file_id") else {
        return Ok(None);
    };
    Ok(conn
        .query_row(
            "SELECT project_id FROM media_files WHERE id = ?1",
            params![media_file_id],
            |row| row.get(0),
        )
        .optional()?)
}

fn project_name(conn: &Connection, project_id: &str) -> Result<Option<String>, StorageError> {
    Ok(conn
        .query_row(
            "SELECT name FROM projects WHERE id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .optional()?)
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::media_file::MediaFileSource;

    use super::*;
    use crate::Storage;
    use crate::review_test_support::{launch, make_flashcard, project, seeded_storage};

    fn describe(storage: &Storage, table: SyncTable, key: &str) -> String {
        storage
            .write(|conn| describe_row(conn, &launch(), table, key, None))
            .unwrap()
    }

    #[test]
    fn names_a_flashcard_by_its_project() {
        let storage = seeded_storage();
        let flashcard = make_flashcard(&storage, &project(), "Haus");
        let name = storage.get_project(&project()).unwrap().settings.name;
        assert_eq!(
            describe(&storage, SyncTable::Flashcards, &flashcard.0),
            format!("a flashcard in {name}")
        );
    }

    #[test]
    fn names_a_preference_in_plain_words() {
        let storage = seeded_storage();
        assert_eq!(
            describe(&storage, SyncTable::Preferences, "showTranslations"),
            "whether translations are shown"
        );
    }

    #[test]
    fn names_a_reading_position_by_its_document() {
        let storage = seeded_storage();
        let media_file = storage
            .add_media_file(
                &project(),
                "Der Prozess.epub",
                &MediaFileSource::Path {
                    path: "/books/Der Prozess.epub".to_string(),
                },
            )
            .unwrap();
        let key = format!("readingLocation:{}", media_file.id.0);
        assert_eq!(
            describe(&storage, SyncTable::Preferences, &key),
            "the reading position in Der Prozess.epub"
        );
    }

    #[test]
    fn names_the_reading_position_of_a_document_not_here_without_its_name() {
        let storage = seeded_storage();
        assert_eq!(
            describe(&storage, SyncTable::Preferences, "readingLocation:missing"),
            "the reading position in a document"
        );
    }

    #[test]
    fn names_a_row_of_an_unknown_project_without_it() {
        let storage = seeded_storage();
        assert_eq!(
            describe(&storage, SyncTable::Flashcards, "missing"),
            "a flashcard"
        );
    }
}

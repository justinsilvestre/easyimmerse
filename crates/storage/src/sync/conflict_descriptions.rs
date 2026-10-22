//! The words that name a synced row for the person, as a conflict notice shows them.

use rusqlite::Connection;
use serde_json::Value;

use super::apply_pushed::text_of;
use super::codec::{RowData, read_row};
use super::conflict_parents::{media_file_of, project_name, project_of};
use super::tables::SyncTable;
use crate::error::StorageError;
use crate::owners::OwnerId;

/// What a conflict notice says of a row: the row itself, and the project and media file it belongs to.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RowNames {
    /// Names the row itself, such as "a flashcard" or "the reading position".
    pub description: String,
    pub project_name: Option<String>,
    pub media_file_name: Option<String>,
}

impl RowNames {
    fn alone(description: impl Into<String>) -> Self {
        Self {
            description: description.into(),
            project_name: None,
            media_file_name: None,
        }
    }
}

/// Names the row, and the project and media file it belongs to while they are here.
/// Reads what it needs from the pulled data, or from the row here when there is no pulled data.
pub fn describe_row(
    conn: &Connection,
    owner: &OwnerId,
    table: SyncTable,
    key: &str,
    data: Option<&RowData>,
) -> Result<RowNames, StorageError> {
    let local = match data {
        Some(_) => None,
        None => read_row(conn, owner, table.spec(), key)?,
    };
    let data = data.or(local.as_ref());
    match table {
        SyncTable::Projects => describe_project(conn, key, data),
        SyncTable::Preferences => describe_preference(conn, owner, key),
        SyncTable::ReviewParameters => Ok(RowNames::alone("the review parameters")),
        SyncTable::Dictionaries => Ok(RowNames::alone(
            data.and_then(|data| text_of(data, "title")).map_or_else(
                || "a dictionary".to_string(),
                |title| format!("the dictionary {title}"),
            ),
        )),
        _ => describe_project_row(conn, owner, table, key, data),
    }
}

fn describe_project(
    conn: &Connection,
    key: &str,
    data: Option<&RowData>,
) -> Result<RowNames, StorageError> {
    let name = project_name(conn, key)?.or_else(|| data.and_then(|d| text_of(d, "name")));
    Ok(match name {
        Some(name) => RowNames {
            project_name: Some(name),
            ..RowNames::alone("the project's settings")
        },
        None => RowNames::alone("the settings of a project"),
    })
}

/// Names a row that belongs to a project, and possibly to one of its media files.
fn describe_project_row(
    conn: &Connection,
    owner: &OwnerId,
    table: SyncTable,
    key: &str,
    data: Option<&RowData>,
) -> Result<RowNames, StorageError> {
    let media_file_id = match table {
        SyncTable::MediaFiles => Some(key.to_string()),
        _ => data.and_then(|data| text_of(data, "media_file_id")),
    };
    let media_file = match media_file_id {
        Some(id) => media_file_of(conn, owner, &id)?,
        None => None,
    };
    let media_file_name = media_file.map(|file| file.name).or_else(|| {
        (table == SyncTable::MediaFiles)
            .then(|| data.and_then(|data| text_of(data, "name")))
            .flatten()
    });
    let project_name = match project_of(conn, owner, table, key, data)? {
        Some(project_id) => project_name(conn, &project_id)?,
        None => None,
    };
    Ok(RowNames {
        description: describe_item(table, data),
        project_name,
        media_file_name,
    })
}

fn describe_item(table: SyncTable, data: Option<&RowData>) -> String {
    let thing = match table {
        SyncTable::Flashcards => match data.and_then(flashcard_word) {
            Some(word) => return format!("the flashcard \u{201c}{word}\u{201d}"),
            None => "a flashcard",
        },
        SyncTable::MediaFiles => "the media file",
        SyncTable::SubtitleTracks => "a subtitle track",
        SyncTable::Alignments => "an alignment",
        SyncTable::ReviewLog => "a review answer",
        SyncTable::ReviewHolds => "the review hold of a flashcard",
        SyncTable::ReviewDayAllowances => "the review allowance of a day",
        SyncTable::AnkiPendingDeletions => "a flashcard to delete from Anki",
        SyncTable::Projects
        | SyncTable::Preferences
        | SyncTable::ReviewParameters
        | SyncTable::Dictionaries => "an item",
    };
    thing.to_string()
}

fn flashcard_word(data: &RowData) -> Option<String> {
    let content: Value = serde_json::from_str(&text_of(data, "content_json")?).ok()?;
    let word = content.get("word")?.as_str()?.trim();
    (!word.is_empty()).then(|| word.to_string())
}

/// Names a preference in plain words, with the media file that a position preference is for.
fn describe_preference(
    conn: &Connection,
    owner: &OwnerId,
    key: &str,
) -> Result<RowNames, StorageError> {
    let (position, media_file_id, fallback) = match key {
        "showTranslations" => return Ok(RowNames::alone("whether translations are shown")),
        "showReviewIntervals" => {
            return Ok(RowNames::alone("whether review intervals are shown"));
        }
        _ => match key.split_once(':') {
            Some(("readingLocation", id)) => ("the reading position", id, "a document"),
            Some(("playbackPosition", id)) => ("the playback position", id, "a media file"),
            _ => return Ok(RowNames::alone(format!("the setting {key}"))),
        },
    };
    let Some(media_file) = media_file_of(conn, owner, media_file_id)? else {
        return Ok(RowNames::alone(format!("{position} in {fallback}")));
    };
    Ok(RowNames {
        description: position.to_string(),
        project_name: project_name(conn, &media_file.project_id)?,
        media_file_name: Some(media_file.name),
    })
}

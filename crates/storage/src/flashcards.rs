use easyimmerse_core::flashcard::{Flashcard, FlashcardId, NewFlashcard};
use easyimmerse_core::media_file::MediaId;
use easyimmerse_core::project::ProjectId;
use easyimmerse_core::time_range::TimeRange;
use rusqlite::{Connection, OptionalExtension, params};

use crate::error::{StorageError, require_changed_row};
use crate::ids::generate_id;
use crate::media_files::ensure_media_exists;
use crate::projects::ensure_project_exists;

const FLASHCARD_COLUMNS: &str =
    "id, media_id, fields_json, tags_json, clip_start_ms, clip_end_ms, screenshot_ms, created_at";

/// Lists the flashcards of a project, oldest first.
pub fn list_flashcards(
    conn: &Connection,
    project_id: &ProjectId,
) -> Result<Vec<Flashcard>, StorageError> {
    ensure_project_exists(conn, project_id)?;
    let mut statement = conn.prepare(&format!(
        "SELECT {FLASHCARD_COLUMNS} FROM flashcards WHERE project_id = ?1
         ORDER BY created_at, rowid"
    ))?;
    let rows = statement
        .query_map(params![project_id.0], read_flashcard_row)?
        .collect::<Result<Vec<_>, _>>()?;
    rows.into_iter().map(FlashcardRow::into_flashcard).collect()
}

/// Saves a flashcard. Its `media_id`, when set, must name a media file of the same project.
pub fn insert_flashcard(
    conn: &Connection,
    project_id: &ProjectId,
    card: &NewFlashcard,
    now: &str,
) -> Result<Flashcard, StorageError> {
    ensure_project_exists(conn, project_id)?;
    ensure_card_media_exists(conn, project_id, card)?;
    let id = FlashcardId(generate_id());
    conn.execute(
        "INSERT INTO flashcards (id, project_id, media_id, fields_json, tags_json,
             clip_start_ms, clip_end_ms, screenshot_ms, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            id.0,
            project_id.0,
            card.media_id.as_ref().map(|media_id| &media_id.0),
            serde_json::to_string(&card.fields)?,
            serde_json::to_string(&card.tags)?,
            card.clip.map(|clip| clip.start_ms),
            card.clip.map(|clip| clip.end_ms),
            card.screenshot_ms,
            now
        ],
    )?;
    get_flashcard(conn, project_id, &id)
}

/// Replaces everything about a flashcard except its id and creation time.
pub fn update_flashcard(
    conn: &Connection,
    project_id: &ProjectId,
    id: &FlashcardId,
    card: &NewFlashcard,
) -> Result<Flashcard, StorageError> {
    ensure_card_media_exists(conn, project_id, card)?;
    let changed = conn.execute(
        "UPDATE flashcards SET media_id = ?3, fields_json = ?4, tags_json = ?5,
             clip_start_ms = ?6, clip_end_ms = ?7, screenshot_ms = ?8
         WHERE id = ?1 AND project_id = ?2",
        params![
            id.0,
            project_id.0,
            card.media_id.as_ref().map(|media_id| &media_id.0),
            serde_json::to_string(&card.fields)?,
            serde_json::to_string(&card.tags)?,
            card.clip.map(|clip| clip.start_ms),
            card.clip.map(|clip| clip.end_ms),
            card.screenshot_ms
        ],
    )?;
    require_changed_row(changed, StorageError::FlashcardNotFound(id.0.clone()))?;
    get_flashcard(conn, project_id, id)
}

pub fn delete_flashcard(
    conn: &Connection,
    project_id: &ProjectId,
    id: &FlashcardId,
) -> Result<(), StorageError> {
    let changed = conn.execute(
        "DELETE FROM flashcards WHERE id = ?1 AND project_id = ?2",
        params![id.0, project_id.0],
    )?;
    require_changed_row(changed, StorageError::FlashcardNotFound(id.0.clone()))
}

fn ensure_card_media_exists(
    conn: &Connection,
    project_id: &ProjectId,
    card: &NewFlashcard,
) -> Result<(), StorageError> {
    match &card.media_id {
        Some(media_id) => ensure_media_exists(conn, project_id, media_id),
        None => Ok(()),
    }
}

fn get_flashcard(
    conn: &Connection,
    project_id: &ProjectId,
    id: &FlashcardId,
) -> Result<Flashcard, StorageError> {
    conn.query_row(
        &format!("SELECT {FLASHCARD_COLUMNS} FROM flashcards WHERE id = ?1 AND project_id = ?2"),
        params![id.0, project_id.0],
        read_flashcard_row,
    )
    .optional()?
    .ok_or_else(|| StorageError::FlashcardNotFound(id.0.clone()))?
    .into_flashcard()
}

/// One flashcard row with its JSON columns still unparsed, so that the row callback stays
/// within rusqlite's error type.
struct FlashcardRow {
    id: String,
    media_id: Option<String>,
    fields_json: String,
    tags_json: String,
    clip_start_ms: Option<u64>,
    clip_end_ms: Option<u64>,
    screenshot_ms: Option<u64>,
    created_at: String,
}

impl FlashcardRow {
    fn into_flashcard(self) -> Result<Flashcard, StorageError> {
        Ok(Flashcard {
            id: FlashcardId(self.id),
            media_id: self.media_id.map(MediaId),
            fields: serde_json::from_str(&self.fields_json)?,
            tags: serde_json::from_str(&self.tags_json)?,
            clip: clip_from_columns(self.clip_start_ms, self.clip_end_ms),
            screenshot_ms: self.screenshot_ms,
            created_at: self.created_at,
        })
    }
}

fn clip_from_columns(start_ms: Option<u64>, end_ms: Option<u64>) -> Option<TimeRange> {
    Some(TimeRange {
        start_ms: start_ms?,
        end_ms: end_ms?,
    })
}

fn read_flashcard_row(row: &rusqlite::Row) -> rusqlite::Result<FlashcardRow> {
    Ok(FlashcardRow {
        id: row.get(0)?,
        media_id: row.get(1)?,
        fields_json: row.get(2)?,
        tags_json: row.get(3)?,
        clip_start_ms: row.get(4)?,
        clip_end_ms: row.get(5)?,
        screenshot_ms: row.get(6)?,
        created_at: row.get(7)?,
    })
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::flashcard::{
        FlashcardField, FlashcardFieldKind, FlashcardId, NewFlashcard,
    };
    use easyimmerse_core::media_file::{MediaId, MediaKind, MediaSource, NewMediaFile};
    use easyimmerse_core::project::ProjectId;
    use easyimmerse_core::time_range::TimeRange;

    use crate::test_support::{NOW, count_rows, storage_with_project};
    use crate::{Storage, StorageError};

    const LATER: &str = "2026-10-01T10:05:00.000Z";

    fn card(word: &str) -> NewFlashcard {
        NewFlashcard {
            media_id: None,
            fields: vec![FlashcardField {
                kind: FlashcardFieldKind::Word,
                value: word.to_string(),
            }],
            tags: vec!["german".to_string()],
            clip: Some(TimeRange {
                start_ms: 500,
                end_ms: 1500,
            }),
            screenshot_ms: Some(1000),
        }
    }

    fn storage_with_card() -> (Storage, ProjectId, FlashcardId) {
        let (storage, project_id) = storage_with_project();
        let card = storage
            .insert_flashcard(&project_id, &card("Katze"), NOW)
            .unwrap();
        (storage, project_id, card.id)
    }

    fn words(storage: &Storage, project_id: &ProjectId) -> Vec<String> {
        storage
            .list_flashcards(project_id)
            .unwrap()
            .into_iter()
            .map(|card| card.fields[0].value.clone())
            .collect()
    }

    fn missing() -> FlashcardId {
        FlashcardId("missing".to_string())
    }

    fn card_for_media(media_id: &MediaId) -> NewFlashcard {
        NewFlashcard {
            media_id: Some(media_id.clone()),
            ..card("Katze")
        }
    }

    /// Stores a project with one media file and a flashcard made from it.
    fn storage_with_media_card() -> (Storage, ProjectId, MediaId) {
        let (storage, project_id) = storage_with_project();
        let media = NewMediaFile {
            name: "a.mp4".to_string(),
            kind: MediaKind::Video,
            source: MediaSource::BrowserFile {
                key: "k".to_string(),
            },
        };
        let media_id = storage.add_media_file(&project_id, &media, NOW).unwrap().id;
        storage
            .insert_flashcard(&project_id, &card_for_media(&media_id), NOW)
            .unwrap();
        (storage, project_id, media_id)
    }

    #[test]
    fn inserts_a_flashcard_with_its_clip() {
        let (storage, project_id, _) = storage_with_card();
        assert_eq!(
            storage.list_flashcards(&project_id).unwrap()[0].clip,
            card("Katze").clip
        );
    }

    #[test]
    fn records_the_creation_time() {
        let (storage, project_id, _) = storage_with_card();
        assert_eq!(
            storage.list_flashcards(&project_id).unwrap()[0].created_at,
            NOW
        );
    }

    #[test]
    fn keeps_a_missing_clip_missing() {
        let (storage, project_id) = storage_with_project();
        let without_clip = NewFlashcard {
            clip: None,
            ..card("Katze")
        };
        let stored = storage
            .insert_flashcard(&project_id, &without_clip, NOW)
            .unwrap();
        assert_eq!(stored.clip, None);
    }

    #[test]
    fn lists_flashcards_oldest_first() {
        let (storage, project_id) = storage_with_project();
        storage
            .insert_flashcard(&project_id, &card("Hund"), LATER)
            .unwrap();
        storage
            .insert_flashcard(&project_id, &card("Katze"), NOW)
            .unwrap();
        assert_eq!(words(&storage, &project_id), vec!["Katze", "Hund"]);
    }

    #[test]
    fn listing_the_flashcards_of_an_unknown_project_fails() {
        let storage = Storage::open_in_memory().unwrap();
        assert!(matches!(
            storage.list_flashcards(&ProjectId("missing".to_string())),
            Err(StorageError::ProjectNotFound(_))
        ));
    }

    #[test]
    fn inserting_into_an_unknown_project_fails() {
        let storage = Storage::open_in_memory().unwrap();
        let result = storage.insert_flashcard(&ProjectId("missing".into()), &card("Katze"), NOW);
        assert!(matches!(result, Err(StorageError::ProjectNotFound(_))));
    }

    #[test]
    fn keeps_the_media_reference_of_a_flashcard() {
        let (storage, project_id, media_id) = storage_with_media_card();
        let cards = storage.list_flashcards(&project_id).unwrap();
        assert_eq!(cards[0].media_id, Some(media_id));
    }

    #[test]
    fn inserting_a_flashcard_for_unknown_media_fails() {
        let (storage, project_id) = storage_with_project();
        let result = storage.insert_flashcard(
            &project_id,
            &card_for_media(&MediaId("missing".to_string())),
            NOW,
        );
        assert!(matches!(result, Err(StorageError::MediaNotFound(_))));
    }

    #[test]
    fn removing_the_media_file_clears_the_reference_of_its_flashcards() {
        let (storage, project_id, media_id) = storage_with_media_card();
        storage.remove_media_file(&project_id, &media_id).unwrap();
        let cards = storage.list_flashcards(&project_id).unwrap();
        assert_eq!(cards[0].media_id, None);
    }

    #[test]
    fn removing_the_media_file_keeps_its_flashcards() {
        let (storage, project_id, media_id) = storage_with_media_card();
        storage.remove_media_file(&project_id, &media_id).unwrap();
        assert_eq!(storage.list_flashcards(&project_id).unwrap().len(), 1);
    }

    #[test]
    fn updates_a_flashcard() {
        let (storage, project_id, id) = storage_with_card();
        storage
            .update_flashcard(&project_id, &id, &card("Kater"))
            .unwrap();
        assert_eq!(words(&storage, &project_id), vec!["Kater"]);
    }

    #[test]
    fn updating_keeps_the_creation_time() {
        let (storage, project_id, id) = storage_with_card();
        let updated = storage
            .update_flashcard(&project_id, &id, &card("Kater"))
            .unwrap();
        assert_eq!(updated.created_at, NOW);
    }

    #[test]
    fn updating_a_flashcard_to_unknown_media_fails() {
        let (storage, project_id, id) = storage_with_card();
        let result = storage.update_flashcard(
            &project_id,
            &id,
            &card_for_media(&MediaId("missing".to_string())),
        );
        assert!(matches!(result, Err(StorageError::MediaNotFound(_))));
    }

    #[test]
    fn updating_an_unknown_flashcard_fails() {
        let (storage, project_id, _) = storage_with_card();
        assert!(matches!(
            storage.update_flashcard(&project_id, &missing(), &card("Kater")),
            Err(StorageError::FlashcardNotFound(_))
        ));
    }

    #[test]
    fn deletes_a_flashcard() {
        let (storage, project_id, id) = storage_with_card();
        storage.delete_flashcard(&project_id, &id).unwrap();
        assert!(storage.list_flashcards(&project_id).unwrap().is_empty());
    }

    #[test]
    fn deleting_an_unknown_flashcard_fails() {
        let (storage, project_id, _) = storage_with_card();
        assert!(matches!(
            storage.delete_flashcard(&project_id, &missing()),
            Err(StorageError::FlashcardNotFound(_))
        ));
    }

    #[test]
    fn deleting_the_project_deletes_its_flashcards() {
        let (storage, project_id, _) = storage_with_card();
        storage.delete_project(&project_id).unwrap();
        assert_eq!(count_rows(&storage, "flashcards"), 0);
    }
}

use easyimmerse_core::flashcard::{Flashcard, FlashcardFieldKey, FlashcardFields, FlashcardId};
use easyimmerse_core::media_file::MediaFileId;
use easyimmerse_core::project::ProjectId;
use rusqlite::{Connection, OptionalExtension, Row, params};

use crate::error::StorageError;
use crate::projects::ensure_project_exists;
use crate::stored_values::{now_ms, random_id, read_unsigned, to_stored_integer};

const FLASHCARD_COLUMNS: &str = "id, project_id, media_file_id, fields_json, included_fields_json, \
     screenshot_data_url IS NOT NULL, created_at_ms, updated_at_ms";

/// What the user saves in a flashcard.
#[derive(Debug, Clone, PartialEq)]
pub struct FlashcardDraft {
    pub media_file_id: Option<MediaFileId>,
    pub fields: FlashcardFields,
    pub included_fields: Vec<FlashcardFieldKey>,
    pub screenshot: ScreenshotChange,
}

/// What saving a flashcard does to its stored screenshot image.
#[derive(Debug, Clone, PartialEq)]
pub enum ScreenshotChange {
    Keep,
    /// Stores the given data URL in place of any earlier image.
    Replace(String),
    Remove,
}

/// Lists a project's flashcards, oldest first, optionally only those of one media file.
pub fn list_flashcards(
    conn: &Connection,
    project_id: &ProjectId,
    media_file_id: Option<&MediaFileId>,
) -> Result<Vec<Flashcard>, StorageError> {
    ensure_project_exists(conn, project_id)?;
    let mut statement = conn.prepare(&format!(
        "SELECT {FLASHCARD_COLUMNS} FROM flashcards \
         WHERE project_id = ?1 AND (?2 IS NULL OR media_file_id = ?2) \
         ORDER BY created_at_ms, rowid"
    ))?;
    let rows = statement.query_map(
        params![project_id.0, media_file_id.map(|id| &id.0)],
        read_flashcard_row,
    )?;
    rows.map(|row| row?.into_flashcard()).collect()
}

pub fn get_flashcard(
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

/// Adds a flashcard to a project. Fails with `MediaFileNotFound` when the draft names a media
/// file of another project.
pub fn insert_flashcard(
    conn: &Connection,
    project_id: &ProjectId,
    draft: &FlashcardDraft,
) -> Result<Flashcard, StorageError> {
    ensure_project_exists(conn, project_id)?;
    ensure_media_file_in_project(conn, project_id, draft.media_file_id.as_ref())?;
    let id = FlashcardId(random_id());
    let now = to_stored_integer(now_ms());
    let screenshot = match &draft.screenshot {
        ScreenshotChange::Replace(data_url) => Some(data_url),
        ScreenshotChange::Keep | ScreenshotChange::Remove => None,
    };
    conn.execute(
        "INSERT INTO flashcards (id, project_id, media_file_id, fields_json, \
         included_fields_json, screenshot_data_url, created_at_ms, updated_at_ms) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
        params![
            id.0,
            project_id.0,
            draft.media_file_id.as_ref().map(|id| &id.0),
            serde_json::to_string(&draft.fields)?,
            serde_json::to_string(&draft.included_fields)?,
            screenshot,
            now,
        ],
    )?;
    get_flashcard(conn, project_id, &id)
}

pub fn update_flashcard(
    conn: &Connection,
    project_id: &ProjectId,
    id: &FlashcardId,
    draft: &FlashcardDraft,
) -> Result<Flashcard, StorageError> {
    ensure_media_file_in_project(conn, project_id, draft.media_file_id.as_ref())?;
    let (keeps_screenshot, screenshot) = match &draft.screenshot {
        ScreenshotChange::Keep => (true, None),
        ScreenshotChange::Replace(data_url) => (false, Some(data_url)),
        ScreenshotChange::Remove => (false, None),
    };
    let updated = conn.execute(
        "UPDATE flashcards SET media_file_id = ?3, fields_json = ?4, included_fields_json = ?5, \
         screenshot_data_url = CASE WHEN ?6 THEN screenshot_data_url ELSE ?7 END, \
         updated_at_ms = ?8 \
         WHERE id = ?1 AND project_id = ?2",
        params![
            id.0,
            project_id.0,
            draft.media_file_id.as_ref().map(|id| &id.0),
            serde_json::to_string(&draft.fields)?,
            serde_json::to_string(&draft.included_fields)?,
            keeps_screenshot,
            screenshot,
            to_stored_integer(now_ms()),
        ],
    )?;
    ensure_one_row_changed(updated, id)?;
    get_flashcard(conn, project_id, id)
}

pub fn delete_flashcard(
    conn: &Connection,
    project_id: &ProjectId,
    id: &FlashcardId,
) -> Result<(), StorageError> {
    let deleted = conn.execute(
        "DELETE FROM flashcards WHERE id = ?1 AND project_id = ?2",
        params![id.0, project_id.0],
    )?;
    ensure_one_row_changed(deleted, id)
}

/// Returns the data URL of a flashcard's screenshot, or `None` when it has none.
pub fn get_flashcard_screenshot(
    conn: &Connection,
    project_id: &ProjectId,
    id: &FlashcardId,
) -> Result<Option<String>, StorageError> {
    conn.query_row(
        "SELECT screenshot_data_url FROM flashcards WHERE id = ?1 AND project_id = ?2",
        params![id.0, project_id.0],
        |row| row.get(0),
    )
    .optional()?
    .ok_or_else(|| StorageError::FlashcardNotFound(id.0.clone()))
}

fn ensure_media_file_in_project(
    conn: &Connection,
    project_id: &ProjectId,
    media_file_id: Option<&MediaFileId>,
) -> Result<(), StorageError> {
    let Some(media_file_id) = media_file_id else {
        return Ok(());
    };
    let exists: bool = conn.query_row(
        "SELECT EXISTS (SELECT 1 FROM media_files WHERE id = ?1 AND project_id = ?2)",
        params![media_file_id.0, project_id.0],
        |row| row.get(0),
    )?;
    if exists {
        Ok(())
    } else {
        Err(StorageError::MediaFileNotFound(media_file_id.0.clone()))
    }
}

fn ensure_one_row_changed(changed: usize, id: &FlashcardId) -> Result<(), StorageError> {
    if changed == 0 {
        Err(StorageError::FlashcardNotFound(id.0.clone()))
    } else {
        Ok(())
    }
}

/// One flashcard row with its JSON columns still unparsed, so that the row callback stays
/// within rusqlite's error type.
struct FlashcardRow {
    id: String,
    project_id: String,
    media_file_id: Option<String>,
    fields_json: String,
    included_fields_json: String,
    has_screenshot_image: bool,
    created_at_ms: u64,
    updated_at_ms: u64,
}

impl FlashcardRow {
    fn into_flashcard(self) -> Result<Flashcard, StorageError> {
        Ok(Flashcard {
            id: FlashcardId(self.id),
            project_id: ProjectId(self.project_id),
            media_file_id: self.media_file_id.map(MediaFileId),
            fields: serde_json::from_str(&self.fields_json)?,
            included_fields: serde_json::from_str(&self.included_fields_json)?,
            has_screenshot_image: self.has_screenshot_image,
            created_at_ms: self.created_at_ms,
            updated_at_ms: self.updated_at_ms,
        })
    }
}

fn read_flashcard_row(row: &Row) -> rusqlite::Result<FlashcardRow> {
    Ok(FlashcardRow {
        id: row.get(0)?,
        project_id: row.get(1)?,
        media_file_id: row.get(2)?,
        fields_json: row.get(3)?,
        included_fields_json: row.get(4)?,
        has_screenshot_image: row.get(5)?,
        created_at_ms: read_unsigned(row, 6)?,
        updated_at_ms: read_unsigned(row, 7)?,
    })
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::media_file::MediaFileSource;

    use super::*;
    use crate::Storage;

    const DATA_URL: &str = "data:image/png;base64,AAAA";

    fn project() -> ProjectId {
        ProjectId("placeholder-1".to_string())
    }

    fn other_project() -> ProjectId {
        ProjectId("placeholder-2".to_string())
    }

    fn seeded_storage() -> Storage {
        let storage = Storage::open_in_memory().unwrap();
        storage.seed_placeholder_projects().unwrap();
        storage
    }

    fn fields(word: &str) -> FlashcardFields {
        FlashcardFields {
            word: word.to_string(),
            word_pronunciation: String::new(),
            l1_definition: String::new(),
            l2_definition: String::new(),
            text_context: String::new(),
            text_context_translation: String::new(),
            text_context_pronunciation: String::new(),
            audio_context: None,
            screenshot_at_ms: Some(1000),
            tags: vec![],
        }
    }

    fn draft(word: &str, screenshot: ScreenshotChange) -> FlashcardDraft {
        FlashcardDraft {
            media_file_id: None,
            fields: fields(word),
            included_fields: vec![FlashcardFieldKey::Word],
            screenshot,
        }
    }

    fn add_media_file(storage: &Storage, project_id: &ProjectId) -> MediaFileId {
        let source = MediaFileSource::Path {
            path: "/a.mp4".to_string(),
        };
        storage.add_media_file(project_id, "a", &source).unwrap().id
    }

    fn insert(storage: &Storage, draft: &FlashcardDraft) -> Flashcard {
        storage.insert_flashcard(&project(), draft).unwrap()
    }

    #[test]
    fn lists_an_inserted_flashcard() {
        let storage = seeded_storage();
        let card = insert(&storage, &draft("gato", ScreenshotChange::Keep));
        assert_eq!(
            storage.list_flashcards(&project(), None).unwrap(),
            vec![card]
        );
    }

    #[test]
    fn lists_the_oldest_flashcard_first() {
        let storage = seeded_storage();
        insert(&storage, &draft("uno", ScreenshotChange::Keep));
        insert(&storage, &draft("dos", ScreenshotChange::Keep));
        let words: Vec<_> = storage
            .list_flashcards(&project(), None)
            .unwrap()
            .into_iter()
            .map(|card| card.fields.word)
            .collect();
        assert_eq!(words, vec!["uno", "dos"]);
    }

    #[test]
    fn narrows_the_list_to_one_media_file() {
        let storage = seeded_storage();
        let media_file_id = add_media_file(&storage, &project());
        let with_media = FlashcardDraft {
            media_file_id: Some(media_file_id.clone()),
            ..draft("gato", ScreenshotChange::Keep)
        };
        insert(&storage, &with_media);
        insert(&storage, &draft("perro", ScreenshotChange::Keep));
        let cards = storage
            .list_flashcards(&project(), Some(&media_file_id))
            .unwrap();
        assert_eq!(cards.len(), 1);
    }

    #[test]
    fn listing_an_unknown_project_fails() {
        let result = seeded_storage().list_flashcards(&ProjectId("missing".to_string()), None);
        assert!(matches!(result, Err(StorageError::ProjectNotFound(_))));
    }

    #[test]
    fn refuses_a_media_file_of_another_project() {
        let storage = seeded_storage();
        let foreign = FlashcardDraft {
            media_file_id: Some(add_media_file(&storage, &other_project())),
            ..draft("gato", ScreenshotChange::Keep)
        };
        let result = storage.insert_flashcard(&project(), &foreign);
        assert!(matches!(result, Err(StorageError::MediaFileNotFound(_))));
    }

    #[test]
    fn stores_a_screenshot() {
        let storage = seeded_storage();
        let card = insert(
            &storage,
            &draft("gato", ScreenshotChange::Replace(DATA_URL.to_string())),
        );
        assert_eq!(
            storage
                .get_flashcard_screenshot(&project(), &card.id)
                .unwrap(),
            Some(DATA_URL.to_string())
        );
    }

    #[test]
    fn reports_a_stored_screenshot() {
        let storage = seeded_storage();
        let card = insert(
            &storage,
            &draft("gato", ScreenshotChange::Replace(DATA_URL.to_string())),
        );
        assert!(card.has_screenshot_image);
    }

    #[test]
    fn keeps_the_screenshot_on_update() {
        let storage = seeded_storage();
        let card = insert(
            &storage,
            &draft("gato", ScreenshotChange::Replace(DATA_URL.to_string())),
        );
        let updated = storage
            .update_flashcard(&project(), &card.id, &draft("gata", ScreenshotChange::Keep))
            .unwrap();
        assert!(updated.has_screenshot_image);
    }

    #[test]
    fn removes_the_screenshot_on_update() {
        let storage = seeded_storage();
        let card = insert(
            &storage,
            &draft("gato", ScreenshotChange::Replace(DATA_URL.to_string())),
        );
        storage
            .update_flashcard(
                &project(),
                &card.id,
                &draft("gato", ScreenshotChange::Remove),
            )
            .unwrap();
        assert_eq!(
            storage
                .get_flashcard_screenshot(&project(), &card.id)
                .unwrap(),
            None
        );
    }

    #[test]
    fn updates_the_fields() {
        let storage = seeded_storage();
        let card = insert(&storage, &draft("gato", ScreenshotChange::Keep));
        let updated = storage
            .update_flashcard(&project(), &card.id, &draft("gata", ScreenshotChange::Keep))
            .unwrap();
        assert_eq!(updated.fields.word, "gata");
    }

    #[test]
    fn does_not_update_a_flashcard_through_another_project() {
        let storage = seeded_storage();
        let card = insert(&storage, &draft("gato", ScreenshotChange::Keep));
        let result = storage.update_flashcard(
            &other_project(),
            &card.id,
            &draft("gata", ScreenshotChange::Keep),
        );
        assert!(matches!(result, Err(StorageError::FlashcardNotFound(_))));
    }

    #[test]
    fn deletes_a_flashcard() {
        let storage = seeded_storage();
        let card = insert(&storage, &draft("gato", ScreenshotChange::Keep));
        storage.delete_flashcard(&project(), &card.id).unwrap();
        assert_eq!(storage.list_flashcards(&project(), None).unwrap(), vec![]);
    }

    #[test]
    fn removing_its_media_file_keeps_the_flashcard_without_one() {
        let storage = seeded_storage();
        let media_file_id = add_media_file(&storage, &project());
        let with_media = FlashcardDraft {
            media_file_id: Some(media_file_id.clone()),
            ..draft("gato", ScreenshotChange::Keep)
        };
        let card = insert(&storage, &with_media);
        storage.remove_media_file(&media_file_id).unwrap();
        assert_eq!(
            storage
                .get_flashcard(&project(), &card.id)
                .unwrap()
                .media_file_id,
            None
        );
    }

    #[test]
    fn counts_the_flashcards_of_a_project() {
        let storage = seeded_storage();
        insert(&storage, &draft("gato", ScreenshotChange::Keep));
        assert_eq!(storage.list_projects().unwrap()[0].flashcard_count, 1);
    }
}

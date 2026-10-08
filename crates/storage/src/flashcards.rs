use easyimmerse_core::flashcard::{Flashcard, FlashcardDraft, FlashcardId};
use easyimmerse_core::media_file::MediaFileId;
use easyimmerse_core::project::ProjectId;
use rusqlite::{Connection, OptionalExtension, Row, params};

use crate::error::StorageError;
use crate::media_files::ensure_media_file_in_project;
use crate::new_row::now_ms;
use crate::projects::ensure_project_exists;
use crate::stored_integer::{read_json, read_unsigned, to_stored_integer};

const FLASHCARD_COLUMNS: &str = "id, project_id, media_file_id, cue_index, word_start, \
     content_json, included_fields_json, created_at_ms, updated_at_ms";

/// Lists a project's flashcards, oldest first.
pub fn list_flashcards(
    conn: &Connection,
    project_id: &ProjectId,
) -> Result<Vec<Flashcard>, StorageError> {
    let mut statement = conn.prepare(&format!(
        "SELECT {FLASHCARD_COLUMNS} FROM flashcards WHERE project_id = ?1 \
         ORDER BY created_at_ms, rowid"
    ))?;
    let flashcards = statement
        .query_map(params![project_id.0], read_flashcard)?
        .collect::<Result<_, _>>()?;
    Ok(flashcards)
}

pub fn get_flashcard(conn: &Connection, id: &FlashcardId) -> Result<Flashcard, StorageError> {
    conn.query_row(
        &format!("SELECT {FLASHCARD_COLUMNS} FROM flashcards WHERE id = ?1"),
        params![id.0],
        read_flashcard,
    )
    .optional()?
    .ok_or_else(|| StorageError::FlashcardNotFound(id.0.clone()))
}

/// Saves a flashcard in the project under the id the client chose for it.
/// Saving again under an id the project already holds replaces that flashcard, so that a retried request leaves one flashcard.
/// Its media file, when named, must belong to the same project.
pub fn create_flashcard(
    conn: &Connection,
    project_id: &ProjectId,
    id: &FlashcardId,
    draft: &FlashcardDraft,
) -> Result<Flashcard, StorageError> {
    ensure_project_exists(conn, project_id)?;
    ensure_media_file_matches(conn, project_id, draft.media_file_id.as_ref())?;
    let now = to_stored_integer(now_ms());
    let saved = conn.execute(
        &format!(
            "INSERT INTO flashcards ({FLASHCARD_COLUMNS}) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8) \
             ON CONFLICT(id) DO UPDATE SET media_file_id = excluded.media_file_id, \
             cue_index = excluded.cue_index, word_start = excluded.word_start, \
             content_json = excluded.content_json, \
             included_fields_json = excluded.included_fields_json, updated_at_ms = excluded.updated_at_ms \
             WHERE flashcards.project_id = excluded.project_id"
        ),
        params![
            id.0,
            project_id.0,
            draft.media_file_id.as_ref().map(|media| &media.0),
            draft.cue_index,
            draft.word_start,
            serde_json::to_string(&draft.content)?,
            serde_json::to_string(&draft.included_fields)?,
            now,
        ],
    )?;
    if saved == 0 {
        return Err(StorageError::FlashcardIdTaken(id.0.clone()));
    }
    get_flashcard(conn, id)
}

/// Replaces a flashcard's content and fields and returns it as it now stands.
pub fn update_flashcard(
    conn: &Connection,
    id: &FlashcardId,
    draft: &FlashcardDraft,
) -> Result<Flashcard, StorageError> {
    let current = get_flashcard(conn, id)?;
    ensure_media_file_matches(conn, &current.project_id, draft.media_file_id.as_ref())?;
    conn.execute(
        "UPDATE flashcards SET media_file_id = ?2, cue_index = ?3, word_start = ?4, \
         content_json = ?5, included_fields_json = ?6, updated_at_ms = ?7 WHERE id = ?1",
        params![
            id.0,
            draft.media_file_id.as_ref().map(|media| &media.0),
            draft.cue_index,
            draft.word_start,
            serde_json::to_string(&draft.content)?,
            serde_json::to_string(&draft.included_fields)?,
            to_stored_integer(now_ms()),
        ],
    )?;
    get_flashcard(conn, id)
}

pub fn delete_flashcard(conn: &Connection, id: &FlashcardId) -> Result<(), StorageError> {
    let deleted = conn.execute("DELETE FROM flashcards WHERE id = ?1", params![id.0])?;
    if deleted == 0 {
        return Err(StorageError::FlashcardNotFound(id.0.clone()));
    }
    Ok(())
}

fn ensure_media_file_matches(
    conn: &Connection,
    project_id: &ProjectId,
    media_file_id: Option<&MediaFileId>,
) -> Result<(), StorageError> {
    match media_file_id {
        Some(media_file_id) => ensure_media_file_in_project(conn, project_id, media_file_id),
        None => Ok(()),
    }
}

fn read_flashcard(row: &Row) -> rusqlite::Result<Flashcard> {
    Ok(Flashcard {
        id: FlashcardId(row.get(0)?),
        project_id: ProjectId(row.get(1)?),
        media_file_id: row.get::<_, Option<String>>(2)?.map(MediaFileId),
        cue_index: row.get(3)?,
        word_start: row.get(4)?,
        content: read_json(row, 5)?,
        included_fields: read_json(row, 6)?,
        created_at_ms: read_unsigned(row, 7)?,
        updated_at_ms: read_unsigned(row, 8)?,
    })
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::flashcard::{AudioClip, FlashcardContent, FlashcardFieldKey};
    use easyimmerse_core::media_file::MediaFileSource;

    use super::*;
    use crate::Storage;

    fn project() -> ProjectId {
        ProjectId("placeholder-1".to_string())
    }

    fn seeded_storage() -> Storage {
        let storage = Storage::open_in_memory().unwrap();
        storage.seed_placeholder_projects().unwrap();
        storage
    }

    fn add_media(storage: &Storage, project_id: &ProjectId) -> MediaFileId {
        storage
            .add_media_file(
                project_id,
                "a.mp4",
                &MediaFileSource::Path {
                    path: "/a.mp4".to_string(),
                },
            )
            .unwrap()
            .id
    }

    fn new_id() -> FlashcardId {
        FlashcardId(crate::new_row::generate_id())
    }

    fn draft(media_file_id: Option<MediaFileId>, word: &str) -> FlashcardDraft {
        FlashcardDraft {
            media_file_id,
            cue_index: Some(3),
            word_start: Some(8),
            content: FlashcardContent {
                word: word.to_string(),
                word_pronunciation: String::new(),
                l1_definition: String::new(),
                l2_definition: String::new(),
                text_context: "Der Hund will fressen.".to_string(),
                text_context_translation: String::new(),
                text_context_pronunciation: String::new(),
                audio_context: Some(AudioClip {
                    start_ms: 5400,
                    end_ms: 8200,
                }),
                screenshot: None,
                tags: vec!["sample".to_string()],
            },
            included_fields: vec![FlashcardFieldKey::Word, FlashcardFieldKey::TextContext],
        }
    }

    #[test]
    fn lists_nothing_for_a_project_without_flashcards() {
        assert_eq!(
            seeded_storage().list_flashcards(&project()).unwrap(),
            vec![]
        );
    }

    #[test]
    fn a_created_flashcard_keeps_its_content() {
        let storage = seeded_storage();
        let created = storage
            .create_flashcard(&project(), &new_id(), &draft(None, "fressen"))
            .unwrap();
        assert_eq!(created.content, draft(None, "fressen").content);
    }

    #[test]
    fn a_created_flashcard_keeps_where_its_word_begins() {
        let storage = seeded_storage();
        let created = storage
            .create_flashcard(&project(), &new_id(), &draft(None, "fressen"))
            .unwrap();
        assert_eq!(created.word_start, Some(8));
    }

    #[test]
    fn a_created_flashcard_is_listed() {
        let storage = seeded_storage();
        let created = storage
            .create_flashcard(&project(), &new_id(), &draft(None, "fressen"))
            .unwrap();
        assert_eq!(storage.list_flashcards(&project()).unwrap(), vec![created]);
    }

    #[test]
    fn creating_again_under_the_same_id_leaves_one_flashcard() {
        let storage = seeded_storage();
        let id = new_id();
        storage
            .create_flashcard(&project(), &id, &draft(None, "fressen"))
            .unwrap();
        storage
            .create_flashcard(&project(), &id, &draft(None, "fressen"))
            .unwrap();
        assert_eq!(storage.list_flashcards(&project()).unwrap().len(), 1);
    }

    #[test]
    fn creating_again_under_the_same_id_keeps_the_latest_content() {
        let storage = seeded_storage();
        let id = new_id();
        storage
            .create_flashcard(&project(), &id, &draft(None, "fressen"))
            .unwrap();
        let again = storage
            .create_flashcard(&project(), &id, &draft(None, "essen"))
            .unwrap();
        assert_eq!(again.content.word, "essen");
    }

    #[test]
    fn refuses_an_id_that_belongs_to_another_project() {
        let storage = seeded_storage();
        let id = new_id();
        storage
            .create_flashcard(&project(), &id, &draft(None, "fressen"))
            .unwrap();
        let other = ProjectId("placeholder-2".to_string());
        assert!(matches!(
            storage.create_flashcard(&other, &id, &draft(None, "fressen")),
            Err(StorageError::FlashcardIdTaken(_))
        ));
    }

    #[test]
    fn lists_the_oldest_flashcard_first() {
        let storage = seeded_storage();
        storage
            .create_flashcard(&project(), &new_id(), &draft(None, "first"))
            .unwrap();
        storage
            .create_flashcard(&project(), &new_id(), &draft(None, "second"))
            .unwrap();
        let words: Vec<_> = storage
            .list_flashcards(&project())
            .unwrap()
            .into_iter()
            .map(|card| card.content.word)
            .collect();
        assert_eq!(words, vec!["first", "second"]);
    }

    #[test]
    fn refuses_a_flashcard_for_an_unknown_project() {
        let result = seeded_storage().create_flashcard(
            &ProjectId("missing".to_string()),
            &new_id(),
            &draft(None, "x"),
        );
        assert!(matches!(result, Err(StorageError::ProjectNotFound(_))));
    }

    #[test]
    fn refuses_a_media_file_of_another_project() {
        let storage = seeded_storage();
        let other = add_media(&storage, &ProjectId("placeholder-2".to_string()));
        let result = storage.create_flashcard(&project(), &new_id(), &draft(Some(other), "x"));
        assert!(matches!(result, Err(StorageError::MediaFileNotFound(_))));
    }

    #[test]
    fn updating_replaces_the_content() {
        let storage = seeded_storage();
        let created = storage
            .create_flashcard(&project(), &new_id(), &draft(None, "fressen"))
            .unwrap();
        let updated = storage
            .update_flashcard(&created.id, &draft(None, "essen"))
            .unwrap();
        assert_eq!(updated.content.word, "essen");
    }

    #[test]
    fn updating_replaces_where_the_word_begins() {
        let storage = seeded_storage();
        let created = storage
            .create_flashcard(&project(), &new_id(), &draft(None, "fressen"))
            .unwrap();
        let without_start = FlashcardDraft {
            word_start: None,
            ..draft(None, "fressen")
        };
        let updated = storage
            .update_flashcard(&created.id, &without_start)
            .unwrap();
        assert_eq!(updated.word_start, None);
    }

    #[test]
    fn updating_an_unknown_flashcard_fails() {
        let result = seeded_storage()
            .update_flashcard(&FlashcardId("missing".to_string()), &draft(None, "x"));
        assert!(matches!(result, Err(StorageError::FlashcardNotFound(_))));
    }

    #[test]
    fn deletes_a_flashcard() {
        let storage = seeded_storage();
        let created = storage
            .create_flashcard(&project(), &new_id(), &draft(None, "fressen"))
            .unwrap();
        storage.delete_flashcard(&created.id).unwrap();
        assert_eq!(storage.list_flashcards(&project()).unwrap(), vec![]);
    }

    #[test]
    fn deleting_an_unknown_flashcard_fails() {
        let result = seeded_storage().delete_flashcard(&FlashcardId("missing".to_string()));
        assert!(matches!(result, Err(StorageError::FlashcardNotFound(_))));
    }

    #[test]
    fn removing_the_media_file_keeps_the_flashcard_without_it() {
        let storage = seeded_storage();
        let media = add_media(&storage, &project());
        let created = storage
            .create_flashcard(
                &project(),
                &new_id(),
                &draft(Some(media.clone()), "fressen"),
            )
            .unwrap();
        storage.remove_media_file(&media).unwrap();
        assert_eq!(
            storage.get_flashcard(&created.id).unwrap().media_file_id,
            None
        );
    }

    #[test]
    fn counts_the_flashcards_of_the_project() {
        let storage = seeded_storage();
        storage
            .create_flashcard(&project(), &new_id(), &draft(None, "fressen"))
            .unwrap();
        assert_eq!(storage.get_project(&project()).unwrap().flashcard_count, 1);
    }
}

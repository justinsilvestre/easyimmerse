//! The notes still to be deleted from Anki, for flashcards deleted while their project sends to Anki through AnkiConnect.

use easyimmerse_core::flashcard::{AnkiPendingDeletion, Flashcard, FlashcardId};
use easyimmerse_core::project::ProjectId;
use rusqlite::{Connection, Row, params};

use crate::error::StorageError;
use crate::new_row::now_ms;
use crate::projects::ensure_project_exists;
use crate::stored_integer::{read_unsigned, to_stored_integer};

/// Records that the flashcard's note is to be deleted from Anki, when its project sends to Anki through AnkiConnect.
/// The flashcard need not have a note yet, since a send in flight may be creating one.
pub fn record_anki_pending_deletion(
    conn: &Connection,
    flashcard: &Flashcard,
) -> Result<(), StorageError> {
    conn.execute(
        "INSERT OR REPLACE INTO anki_pending_deletions (flashcard_id, project_id, word, requested_at_ms) \
         SELECT ?1, id, ?3, ?4 FROM projects WHERE id = ?2 AND flashcard_destination = 'anki_connect'",
        params![
            flashcard.id.0,
            flashcard.project_id.0,
            flashcard.content.word,
            to_stored_integer(now_ms()),
        ],
    )?;
    Ok(())
}

/// Forgets the pending deletion of a flashcard's note, as when the flashcard is saved again under its id.
pub fn forget_anki_pending_deletion(
    conn: &Connection,
    id: &FlashcardId,
) -> Result<(), StorageError> {
    conn.execute(
        "DELETE FROM anki_pending_deletions WHERE flashcard_id = ?1",
        params![id.0],
    )?;
    Ok(())
}

/// Lists the project's pending deletions, oldest first.
pub fn list_anki_pending_deletions(
    conn: &Connection,
    project_id: &ProjectId,
) -> Result<Vec<AnkiPendingDeletion>, StorageError> {
    ensure_project_exists(conn, project_id)?;
    let mut statement = conn.prepare(
        "SELECT flashcard_id, word, requested_at_ms FROM anki_pending_deletions \
         WHERE project_id = ?1 ORDER BY requested_at_ms, rowid",
    )?;
    let deletions = statement
        .query_map(params![project_id.0], read_deletion)?
        .collect::<Result<_, _>>()?;
    Ok(deletions)
}

/// Removes a flashcard's pending deletion from the project. A flashcard without one is passed over.
pub fn clear_anki_pending_deletion(
    conn: &Connection,
    project_id: &ProjectId,
    flashcard_id: &FlashcardId,
) -> Result<(), StorageError> {
    ensure_project_exists(conn, project_id)?;
    conn.execute(
        "DELETE FROM anki_pending_deletions WHERE project_id = ?1 AND flashcard_id = ?2",
        params![project_id.0, flashcard_id.0],
    )?;
    Ok(())
}

fn read_deletion(row: &Row) -> rusqlite::Result<AnkiPendingDeletion> {
    Ok(AnkiPendingDeletion {
        flashcard_id: FlashcardId(row.get(0)?),
        word: row.get(1)?,
        requested_at_ms: read_unsigned(row, 2)?,
    })
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::flashcard::{FlashcardContent, FlashcardDraft};
    use easyimmerse_core::project::FlashcardDestination;

    use super::*;
    use crate::Storage;

    fn project() -> ProjectId {
        ProjectId("placeholder-1".to_string())
    }

    fn storage_sending_to(destination: Option<FlashcardDestination>) -> Storage {
        let storage = Storage::open_in_memory().unwrap();
        storage.seed_placeholder_projects().unwrap();
        storage
            .set_flashcard_destination(&project(), destination)
            .unwrap();
        storage
    }

    fn draft(word: &str) -> FlashcardDraft {
        FlashcardDraft {
            media_file_id: None,
            cue_index: None,
            word_start: None,
            content: FlashcardContent {
                word: word.to_string(),
                word_pronunciation: String::new(),
                l1_definition: String::new(),
                l2_definition: String::new(),
                text_context: String::new(),
                text_context_translation: String::new(),
                text_context_pronunciation: String::new(),
                audio_context: None,
                screenshot: None,
                tags: vec![],
            },
            included_fields: vec![],
        }
    }

    fn create(storage: &Storage, word: &str) -> FlashcardId {
        let id = FlashcardId(crate::new_row::generate_id());
        storage
            .create_flashcard(&project(), &id, &draft(word))
            .unwrap()
            .id
    }

    /// Creates and deletes a flashcard with the given word, returning its id.
    fn delete_new(storage: &Storage, word: &str) -> FlashcardId {
        let id = create(storage, word);
        storage.delete_flashcard(&id).unwrap();
        id
    }

    fn listed_words(storage: &Storage) -> Vec<String> {
        storage
            .list_anki_pending_deletions(&project())
            .unwrap()
            .into_iter()
            .map(|deletion| deletion.word)
            .collect()
    }

    #[test]
    fn deleting_a_flashcard_sent_through_anki_connect_records_its_deletion() {
        let storage = storage_sending_to(Some(FlashcardDestination::AnkiConnect));
        let id = delete_new(&storage, "fressen");
        let listed = storage.list_anki_pending_deletions(&project()).unwrap();
        assert_eq!(
            listed
                .into_iter()
                .map(|deletion| deletion.flashcard_id)
                .collect::<Vec<_>>(),
            vec![id]
        );
    }

    #[test]
    fn a_pending_deletion_keeps_the_word() {
        let storage = storage_sending_to(Some(FlashcardDestination::AnkiConnect));
        delete_new(&storage, "fressen");
        assert_eq!(listed_words(&storage), vec!["fressen"]);
    }

    #[test]
    fn deleting_a_flashcard_exported_as_a_package_records_nothing() {
        let storage = storage_sending_to(Some(FlashcardDestination::AnkiPackage));
        delete_new(&storage, "fressen");
        assert_eq!(listed_words(&storage), Vec::<String>::new());
    }

    #[test]
    fn deleting_a_flashcard_without_a_destination_records_nothing() {
        let storage = storage_sending_to(None);
        delete_new(&storage, "fressen");
        assert_eq!(listed_words(&storage), Vec::<String>::new());
    }

    #[test]
    fn lists_the_oldest_deletion_first() {
        let storage = storage_sending_to(Some(FlashcardDestination::AnkiConnect));
        delete_new(&storage, "first");
        delete_new(&storage, "second");
        assert_eq!(listed_words(&storage), vec!["first", "second"]);
    }

    #[test]
    fn lists_only_the_deletions_of_the_project() {
        let storage = storage_sending_to(Some(FlashcardDestination::AnkiConnect));
        delete_new(&storage, "fressen");
        let other = ProjectId("placeholder-2".to_string());
        assert_eq!(storage.list_anki_pending_deletions(&other).unwrap(), vec![]);
    }

    #[test]
    fn clearing_removes_the_deletion() {
        let storage = storage_sending_to(Some(FlashcardDestination::AnkiConnect));
        let id = delete_new(&storage, "fressen");
        storage
            .clear_anki_pending_deletion(&project(), &id)
            .unwrap();
        assert_eq!(listed_words(&storage), Vec::<String>::new());
    }

    #[test]
    fn clearing_a_flashcard_without_a_deletion_succeeds() {
        let storage = storage_sending_to(Some(FlashcardDestination::AnkiConnect));
        let result =
            storage.clear_anki_pending_deletion(&project(), &FlashcardId("missing".to_string()));
        assert!(result.is_ok());
    }

    #[test]
    fn clearing_in_an_unknown_project_fails() {
        let storage = storage_sending_to(None);
        let result = storage.clear_anki_pending_deletion(
            &ProjectId("missing".to_string()),
            &FlashcardId("f1".to_string()),
        );
        assert!(matches!(result, Err(StorageError::ProjectNotFound(_))));
    }

    #[test]
    fn listing_an_unknown_project_fails() {
        let result =
            storage_sending_to(None).list_anki_pending_deletions(&ProjectId("missing".to_string()));
        assert!(matches!(result, Err(StorageError::ProjectNotFound(_))));
    }

    #[test]
    fn saving_the_flashcard_again_forgets_its_deletion() {
        let storage = storage_sending_to(Some(FlashcardDestination::AnkiConnect));
        let id = delete_new(&storage, "fressen");
        storage
            .create_flashcard(&project(), &id, &draft("fressen"))
            .unwrap();
        assert_eq!(listed_words(&storage), Vec::<String>::new());
    }

    #[test]
    fn deleting_the_project_removes_its_deletions() {
        let storage = storage_sending_to(Some(FlashcardDestination::AnkiConnect));
        delete_new(&storage, "fressen");
        storage.delete_project(&project()).unwrap();
        let count: i64 = storage
            .read(|conn| {
                Ok(
                    conn.query_row("SELECT count(*) FROM anki_pending_deletions", [], |row| {
                        row.get(0)
                    })?,
                )
            })
            .unwrap();
        assert_eq!(count, 0);
    }
}

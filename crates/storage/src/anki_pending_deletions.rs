//! The deleted flashcards that had reached Anki, whose notes may still be there.

use easyimmerse_core::flashcard::{AnkiPendingDeletion, Flashcard, FlashcardId};
use easyimmerse_core::project::ProjectId;
use rusqlite::{Connection, Row, params};

use crate::error::StorageError;
use crate::new_row::now_ms;
use crate::projects::ensure_project_exists;
use crate::stored_integer::{read_unsigned, to_stored_integer};

/// The condition, on the `projects` row, under which a deletion is recorded: someone will deal with it,
/// AnkiConnect by deleting the note, or the user from the list on the project screen.
const RECORDS_DELETIONS: &str = "(uses_anki_connect = 1 OR lists_anki_deletions = 1)";

/// Records that the flashcard's notes may still be in Anki,
/// when the flashcard reached Anki, marked as exported or sent through AnkiConnect, and its project uses AnkiConnect or lists such deletions.
/// A flashcard whose note a send in flight is still creating gets its deletion once that send is recorded.
pub fn record_anki_pending_deletion(
    conn: &Connection,
    flashcard: &Flashcard,
) -> Result<(), StorageError> {
    if flashcard.exported_at_ms.is_none() && flashcard.sent_at_ms.is_none() {
        return Ok(());
    }
    conn.execute(
        &format!(
            "INSERT OR REPLACE INTO anki_pending_deletions \
             (flashcard_id, project_id, word, requested_at_ms) \
             SELECT ?1, id, ?3, ?4 FROM projects WHERE id = ?2 AND {RECORDS_DELETIONS}"
        ),
        params![
            flashcard.id.0,
            flashcard.project_id.0,
            flashcard.content.word,
            to_stored_integer(now_ms()),
        ],
    )?;
    Ok(())
}

/// Records that the note a send put into Anki for a flashcard deleted since the send began may still be there,
/// when the project uses AnkiConnect or lists such deletions. The word is gone with the flashcard, so the deletion keeps an empty one.
/// An id that a flashcard still has, or that the app could not have made, is passed over.
/// A deletion already recorded keeps its word.
pub fn record_anki_pending_deletion_of_gone(
    conn: &Connection,
    project_id: &ProjectId,
    flashcard_id: &FlashcardId,
) -> Result<(), StorageError> {
    if !flashcard_id.is_well_formed() {
        return Ok(());
    }
    conn.execute(
        &format!(
            "INSERT INTO anki_pending_deletions (flashcard_id, project_id, word, requested_at_ms) \
             SELECT ?1, id, '', ?3 FROM projects WHERE id = ?2 AND {RECORDS_DELETIONS} \
             AND NOT EXISTS (SELECT 1 FROM flashcards WHERE flashcards.id = ?1) \
             ON CONFLICT (flashcard_id) DO NOTHING"
        ),
        params![flashcard_id.0, project_id.0, to_stored_integer(now_ms())],
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
        "SELECT flashcard_id, word, requested_at_ms \
         FROM anki_pending_deletions \
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

/// Removes the named deletions from the project, as when the user marks them done. A flashcard without one is passed over.
pub fn clear_anki_pending_deletions(
    conn: &mut Connection,
    project_id: &ProjectId,
    flashcard_ids: &[FlashcardId],
) -> Result<(), StorageError> {
    let transaction = conn.transaction()?;
    ensure_project_exists(&transaction, project_id)?;
    for flashcard_id in flashcard_ids {
        clear_anki_pending_deletion(&transaction, project_id, flashcard_id)?;
    }
    transaction.commit()?;
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

    use super::*;
    use crate::Storage;

    fn project() -> ProjectId {
        ProjectId("placeholder-1".to_string())
    }

    /// A storage whose first placeholder project uses AnkiConnect or not, and does not list deletions.
    fn storage_using_anki_connect(uses_anki_connect: bool) -> Storage {
        let storage = storage_listing_deletions(false);
        storage
            .set_uses_anki_connect(&project(), uses_anki_connect)
            .unwrap();
        storage
    }

    /// A storage whose first placeholder project does not use AnkiConnect, and lists deletions or not.
    fn storage_listing_deletions(lists_anki_deletions: bool) -> Storage {
        let storage = Storage::open_in_memory().unwrap();
        storage.seed_placeholder_projects().unwrap();
        set_listing(&storage, lists_anki_deletions);
        storage
    }

    fn set_listing(storage: &Storage, lists_anki_deletions: bool) {
        let mut settings = storage.get_project(&project()).unwrap().settings;
        settings.lists_anki_deletions = lists_anki_deletions;
        storage.update_project(&project(), &settings).unwrap();
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

    /// Gives the flashcard a note in Anki, as a send does.
    fn give_note(storage: &Storage, id: &FlashcardId) {
        storage
            .record_anki_send(&project(), std::slice::from_ref(id), 1)
            .unwrap();
    }

    /// Creates a flashcard with the given word, exports it, marking it exported or not, and deletes it, returning its id.
    fn delete_exported(storage: &Storage, word: &str, is_marked: bool) -> FlashcardId {
        let id = create(storage, word);
        storage
            .record_anki_export(&crate::DeliveredPackage {
                project_id: project(),
                flashcard_ids: vec![id.clone()],
                exported_at_ms: is_marked.then_some(1),
            })
            .unwrap();
        storage.delete_flashcard(&id).unwrap();
        id
    }

    /// Creates a flashcard with the given word, gives it a note in Anki and deletes it, returning its id.
    fn delete_sent(storage: &Storage, word: &str) -> FlashcardId {
        let id = create(storage, word);
        give_note(storage, &id);
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
    fn deleting_a_flashcard_that_reached_anki_records_its_deletion() {
        let storage = storage_using_anki_connect(true);
        let id = delete_sent(&storage, "fressen");
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
    fn deleting_a_flashcard_that_never_reached_anki_records_nothing() {
        let storage = storage_using_anki_connect(true);
        let id = create(&storage, "fressen");
        storage.delete_flashcard(&id).unwrap();
        assert_eq!(listed_words(&storage), Vec::<String>::new());
    }

    #[test]
    fn a_pending_deletion_keeps_the_word() {
        let storage = storage_using_anki_connect(true);
        delete_sent(&storage, "fressen");
        assert_eq!(listed_words(&storage), vec!["fressen"]);
    }

    #[test]
    fn deleting_a_flashcard_while_anki_connect_is_off_and_nothing_is_listed_records_nothing() {
        let storage = storage_using_anki_connect(false);
        delete_sent(&storage, "fressen");
        assert_eq!(listed_words(&storage), Vec::<String>::new());
    }

    #[test]
    fn deleting_a_sent_flashcard_records_it_while_the_project_lists_deletions() {
        let storage = storage_listing_deletions(true);
        delete_sent(&storage, "fressen");
        assert_eq!(listed_words(&storage), vec!["fressen"]);
    }

    #[test]
    fn deleting_a_flashcard_marked_as_exported_records_it_while_the_project_lists_deletions() {
        let storage = storage_listing_deletions(true);
        delete_exported(&storage, "fressen", true);
        assert_eq!(listed_words(&storage), vec!["fressen"]);
    }

    #[test]
    fn deleting_a_flashcard_marked_as_exported_records_it_while_anki_connect_is_on() {
        let storage = storage_using_anki_connect(true);
        delete_exported(&storage, "fressen", true);
        assert_eq!(listed_words(&storage), vec!["fressen"]);
    }

    #[test]
    fn deleting_a_flashcard_only_in_an_unmarked_export_records_nothing() {
        let storage = storage_listing_deletions(true);
        delete_exported(&storage, "fressen", false);
        assert_eq!(listed_words(&storage), Vec::<String>::new());
    }

    #[test]
    fn turning_the_listing_off_keeps_the_deletions_already_listed() {
        let storage = storage_listing_deletions(true);
        delete_sent(&storage, "fressen");
        set_listing(&storage, false);
        assert_eq!(listed_words(&storage), vec!["fressen"]);
    }

    #[test]
    fn lists_the_oldest_deletion_first() {
        let storage = storage_using_anki_connect(true);
        delete_sent(&storage, "first");
        delete_sent(&storage, "second");
        assert_eq!(listed_words(&storage), vec!["first", "second"]);
    }

    #[test]
    fn lists_only_the_deletions_of_the_project() {
        let storage = storage_using_anki_connect(true);
        delete_sent(&storage, "fressen");
        let other = ProjectId("placeholder-2".to_string());
        assert_eq!(storage.list_anki_pending_deletions(&other).unwrap(), vec![]);
    }

    #[test]
    fn clearing_removes_the_deletion() {
        let storage = storage_using_anki_connect(true);
        let id = delete_sent(&storage, "fressen");
        storage
            .clear_anki_pending_deletion(&project(), &id)
            .unwrap();
        assert_eq!(listed_words(&storage), Vec::<String>::new());
    }

    #[test]
    fn clearing_several_removes_the_named_deletions() {
        let storage = storage_using_anki_connect(true);
        let first = delete_sent(&storage, "first");
        let second = delete_sent(&storage, "second");
        storage
            .clear_anki_pending_deletions(&project(), &[first, second])
            .unwrap();
        assert_eq!(listed_words(&storage), Vec::<String>::new());
    }

    #[test]
    fn clearing_several_keeps_the_deletions_not_named() {
        let storage = storage_using_anki_connect(true);
        let first = delete_sent(&storage, "first");
        delete_sent(&storage, "second");
        storage
            .clear_anki_pending_deletions(&project(), &[first])
            .unwrap();
        assert_eq!(listed_words(&storage), vec!["second"]);
    }

    #[test]
    fn clearing_several_in_an_unknown_project_fails() {
        let storage = storage_using_anki_connect(true);
        let result = storage.clear_anki_pending_deletions(&ProjectId("missing".to_string()), &[]);
        assert!(matches!(result, Err(StorageError::ProjectNotFound(_))));
    }

    #[test]
    fn clearing_a_flashcard_without_a_deletion_succeeds() {
        let storage = storage_using_anki_connect(true);
        let result =
            storage.clear_anki_pending_deletion(&project(), &FlashcardId("missing".to_string()));
        assert!(result.is_ok());
    }

    #[test]
    fn clearing_in_an_unknown_project_fails() {
        let storage = storage_using_anki_connect(false);
        let result = storage.clear_anki_pending_deletion(
            &ProjectId("missing".to_string()),
            &FlashcardId("f1".to_string()),
        );
        assert!(matches!(result, Err(StorageError::ProjectNotFound(_))));
    }

    #[test]
    fn listing_an_unknown_project_fails() {
        let result = storage_using_anki_connect(false)
            .list_anki_pending_deletions(&ProjectId("missing".to_string()));
        assert!(matches!(result, Err(StorageError::ProjectNotFound(_))));
    }

    #[test]
    fn saving_the_flashcard_again_forgets_its_deletion() {
        let storage = storage_using_anki_connect(true);
        let id = delete_sent(&storage, "fressen");
        storage
            .create_flashcard(&project(), &id, &draft("fressen"))
            .unwrap();
        assert_eq!(listed_words(&storage), Vec::<String>::new());
    }

    #[test]
    fn deleting_the_project_removes_its_deletions() {
        let storage = storage_using_anki_connect(true);
        delete_sent(&storage, "fressen");
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

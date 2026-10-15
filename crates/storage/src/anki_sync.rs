//! Records of where a project's flashcards went: into an Anki package, or to Anki through AnkiConnect.

use easyimmerse_core::flashcard::FlashcardId;
use easyimmerse_core::project::ProjectId;
use rusqlite::{Connection, params};

use crate::anki_pending_deletions::record_anki_pending_deletion_of_gone;
use crate::error::StorageError;
use crate::projects::ensure_project_exists;
use crate::stored_integer::to_stored_integer;

/// Records that the flashcards were written into an Anki package at `exported_at_ms`, in one transaction.
/// A flashcard deleted since the export began is passed over.
pub fn record_anki_export(
    conn: &mut Connection,
    project_id: &ProjectId,
    ids: &[FlashcardId],
    exported_at_ms: u64,
) -> Result<(), StorageError> {
    let transaction = conn.transaction()?;
    ensure_project_exists(&transaction, project_id)?;
    for id in ids {
        transaction.execute(
            "UPDATE flashcards SET exported_at_ms = ?2 WHERE id = ?1",
            params![id.0, to_stored_integer(exported_at_ms)],
        )?;
    }
    transaction.commit()?;
    Ok(())
}

/// Stores the id of the note AnkiConnect created for each of the project's flashcards, in one transaction.
/// A flashcard of another project is passed over,
/// and the note of a flashcard deleted since the send began is recorded as to be deleted from Anki.
pub fn record_anki_notes_sent(
    conn: &mut Connection,
    project_id: &ProjectId,
    notes: &[(FlashcardId, u64)],
) -> Result<(), StorageError> {
    let transaction = conn.transaction()?;
    ensure_project_exists(&transaction, project_id)?;
    for (id, anki_note_id) in notes {
        transaction.execute(
            "UPDATE flashcards SET anki_note_id = ?2 WHERE id = ?1 AND project_id = ?3",
            params![id.0, to_stored_integer(*anki_note_id), project_id.0],
        )?;
        record_anki_pending_deletion_of_gone(&transaction, project_id, id)?;
    }
    transaction.commit()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::flashcard::{FlashcardContent, FlashcardDraft};

    use super::*;
    use crate::Storage;

    fn project() -> ProjectId {
        ProjectId("placeholder-1".to_string())
    }

    fn missing() -> FlashcardId {
        FlashcardId("missing".to_string())
    }

    /// A storage holding the placeholder projects, the first of which uses AnkiConnect.
    fn seeded_storage() -> Storage {
        let storage = Storage::open_in_memory().unwrap();
        storage.seed_placeholder_projects().unwrap();
        storage.set_uses_anki_connect(&project(), true).unwrap();
        storage
    }

    fn create(storage: &Storage) -> FlashcardId {
        let draft = FlashcardDraft {
            media_file_id: None,
            cue_index: None,
            word_start: None,
            content: FlashcardContent {
                word: "fressen".to_string(),
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
        };
        let id = FlashcardId(crate::new_row::generate_id());
        storage
            .create_flashcard(&project(), &id, &draft)
            .unwrap()
            .id
    }

    #[test]
    fn an_export_records_the_time() {
        let storage = seeded_storage();
        let id = create(&storage);
        storage
            .record_anki_export(&project(), std::slice::from_ref(&id), 1_000)
            .unwrap();
        assert_eq!(
            storage.get_flashcard(&id).unwrap().exported_at_ms,
            Some(1_000)
        );
    }

    #[test]
    fn an_export_passes_over_a_flashcard_that_is_gone() {
        let storage = seeded_storage();
        let id = create(&storage);
        storage
            .record_anki_export(&project(), &[missing(), id.clone()], 1_000)
            .unwrap();
        assert_eq!(
            storage.get_flashcard(&id).unwrap().exported_at_ms,
            Some(1_000)
        );
    }

    #[test]
    fn an_export_of_an_unknown_project_fails() {
        let result = seeded_storage().record_anki_export(&ProjectId("missing".to_string()), &[], 1);
        assert!(matches!(result, Err(StorageError::ProjectNotFound(_))));
    }

    #[test]
    fn a_send_stores_the_note_ids() {
        let storage = seeded_storage();
        let id = create(&storage);
        storage
            .record_anki_notes_sent(&project(), &[(id.clone(), 1_700_000_000_000)])
            .unwrap();
        assert_eq!(
            storage.get_flashcard(&id).unwrap().anki_note_id,
            Some(1_700_000_000_000)
        );
    }

    #[test]
    fn a_send_passes_over_a_flashcard_that_is_gone() {
        let storage = seeded_storage();
        let id = create(&storage);
        storage
            .record_anki_notes_sent(&project(), &[(missing(), 1), (id.clone(), 2)])
            .unwrap();
        assert_eq!(storage.get_flashcard(&id).unwrap().anki_note_id, Some(2));
    }

    fn listed_deletion_ids(storage: &Storage) -> Vec<FlashcardId> {
        storage
            .list_anki_pending_deletions(&project())
            .unwrap()
            .into_iter()
            .map(|deletion| deletion.flashcard_id)
            .collect()
    }

    #[test]
    fn a_send_records_the_deletion_of_the_note_of_a_flashcard_deleted_since() {
        let storage = seeded_storage();
        let id = create(&storage);
        storage.delete_flashcard(&id).unwrap();
        storage
            .record_anki_notes_sent(&project(), &[(id.clone(), 1)])
            .unwrap();
        assert_eq!(listed_deletion_ids(&storage), vec![id]);
    }

    #[test]
    fn a_send_keeps_the_word_of_a_deletion_already_recorded() {
        let storage = seeded_storage();
        let id = create(&storage);
        storage
            .record_anki_notes_sent(&project(), &[(id.clone(), 1)])
            .unwrap();
        storage.delete_flashcard(&id).unwrap();
        storage
            .record_anki_notes_sent(&project(), &[(id, 1)])
            .unwrap();
        let words: Vec<String> = storage
            .list_anki_pending_deletions(&project())
            .unwrap()
            .into_iter()
            .map(|deletion| deletion.word)
            .collect();
        assert_eq!(words, vec!["fressen"]);
    }

    #[test]
    fn a_send_records_no_deletion_for_a_flashcard_that_still_exists() {
        let storage = seeded_storage();
        let id = create(&storage);
        storage
            .record_anki_notes_sent(&project(), &[(id, 1)])
            .unwrap();
        assert_eq!(listed_deletion_ids(&storage), Vec::<FlashcardId>::new());
    }

    #[test]
    fn a_send_records_no_deletion_for_an_id_the_app_could_not_have_made() {
        let storage = seeded_storage();
        storage
            .record_anki_notes_sent(&project(), &[(missing(), 1)])
            .unwrap();
        assert_eq!(listed_deletion_ids(&storage), Vec::<FlashcardId>::new());
    }

    #[test]
    fn a_send_gives_no_note_id_to_a_flashcard_of_another_project() {
        let storage = seeded_storage();
        let id = create(&storage);
        storage
            .record_anki_notes_sent(&ProjectId("placeholder-2".to_string()), &[(id.clone(), 1)])
            .unwrap();
        assert_eq!(storage.get_flashcard(&id).unwrap().anki_note_id, None);
    }

    #[test]
    fn a_send_to_an_unknown_project_fails() {
        let result =
            seeded_storage().record_anki_notes_sent(&ProjectId("missing".to_string()), &[]);
        assert!(matches!(result, Err(StorageError::ProjectNotFound(_))));
    }
}

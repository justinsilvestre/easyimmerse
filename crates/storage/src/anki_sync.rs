//! Records of where a project's flashcards went: into an Anki package, or to Anki through AnkiConnect.

use easyimmerse_core::flashcard::FlashcardId;
use easyimmerse_core::project::{FlashcardDestination, ProjectId};
use rusqlite::{Connection, params};

use crate::error::StorageError;
use crate::projects::set_flashcard_destination;
use crate::stored_integer::to_stored_integer;

/// Records that the flashcards were written into an Anki package at `exported_at_ms`, and makes the package
/// the project's flashcard destination, in one transaction. A flashcard deleted since the export began is passed over.
pub fn record_anki_export(
    conn: &mut Connection,
    project_id: &ProjectId,
    ids: &[FlashcardId],
    exported_at_ms: u64,
) -> Result<(), StorageError> {
    let transaction = conn.transaction()?;
    for id in ids {
        transaction.execute(
            "UPDATE flashcards SET exported_at_ms = ?2 WHERE id = ?1",
            params![id.0, to_stored_integer(exported_at_ms)],
        )?;
    }
    set_flashcard_destination(
        &transaction,
        project_id,
        Some(FlashcardDestination::AnkiPackage),
    )?;
    transaction.commit()?;
    Ok(())
}

/// Stores the id of the note AnkiConnect created for each flashcard, and makes AnkiConnect the project's
/// flashcard destination, in one transaction. A flashcard deleted since the send began is passed over.
pub fn record_anki_notes_sent(
    conn: &mut Connection,
    project_id: &ProjectId,
    notes: &[(FlashcardId, u64)],
) -> Result<(), StorageError> {
    let transaction = conn.transaction()?;
    for (id, anki_note_id) in notes {
        transaction.execute(
            "UPDATE flashcards SET anki_note_id = ?2 WHERE id = ?1",
            params![id.0, to_stored_integer(*anki_note_id)],
        )?;
    }
    set_flashcard_destination(
        &transaction,
        project_id,
        Some(FlashcardDestination::AnkiConnect),
    )?;
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

    fn seeded_storage() -> Storage {
        let storage = Storage::open_in_memory().unwrap();
        storage.seed_placeholder_projects().unwrap();
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
    fn an_export_makes_the_package_the_destination() {
        let storage = seeded_storage();
        let id = create(&storage);
        storage
            .record_anki_export(&project(), &[id], 1_000)
            .unwrap();
        assert_eq!(
            storage
                .get_project(&project())
                .unwrap()
                .flashcard_destination,
            Some(FlashcardDestination::AnkiPackage)
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
    fn a_send_makes_anki_connect_the_destination() {
        let storage = seeded_storage();
        storage.record_anki_notes_sent(&project(), &[]).unwrap();
        assert_eq!(
            storage
                .get_project(&project())
                .unwrap()
                .flashcard_destination,
            Some(FlashcardDestination::AnkiConnect)
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

    #[test]
    fn a_send_to_an_unknown_project_fails() {
        let result =
            seeded_storage().record_anki_notes_sent(&ProjectId("missing".to_string()), &[]);
        assert!(matches!(result, Err(StorageError::ProjectNotFound(_))));
    }
}

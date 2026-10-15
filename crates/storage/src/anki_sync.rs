//! Records of how a project's flashcards reached Anki: in an Anki package, or through AnkiConnect.

use easyimmerse_core::flashcard::FlashcardId;
use easyimmerse_core::project::ProjectId;
use rusqlite::{Connection, params};

use crate::anki_pending_deletions::{
    clear_anki_pending_deletion, record_anki_pending_deletion_of_gone,
};
use crate::error::StorageError;
use crate::projects::ensure_project_exists;
use crate::stored_integer::to_stored_integer;

/// What an Anki package held, recorded once it reached the user.
#[derive(Debug, Clone, PartialEq)]
pub struct DeliveredPackage {
    pub project_id: ProjectId,
    pub flashcard_ids: Vec<FlashcardId>,
    /// The time the flashcards were read, which marks them exported, or `None` when the export does not mark them.
    pub exported_at_ms: Option<u64>,
    /// The deleted flashcards whose notes the package marks for deletion.
    pub marked_deletions: Vec<FlashcardId>,
}

/// Records a delivered package in one transaction: a package held its flashcards, which are marked exported when it says so,
/// and the deletions it marked are dealt with. A flashcard deleted since the export began is passed over.
pub fn record_anki_export(
    conn: &mut Connection,
    package: &DeliveredPackage,
) -> Result<(), StorageError> {
    let transaction = conn.transaction()?;
    ensure_project_exists(&transaction, &package.project_id)?;
    for id in &package.flashcard_ids {
        transaction.execute(
            "UPDATE flashcards SET was_packaged = 1, \
             exported_at_ms = coalesce(?2, exported_at_ms) WHERE id = ?1",
            params![id.0, package.exported_at_ms.map(to_stored_integer)],
        )?;
    }
    for id in &package.marked_deletions {
        clear_anki_pending_deletion(&transaction, &package.project_id, id)?;
    }
    transaction.commit()?;
    Ok(())
}

/// Records that AnkiConnect put the project's flashcards into Anki as they were read at `sent_at_ms`, in one transaction.
/// A flashcard of another project is passed over,
/// and the note of a flashcard deleted since the send began is recorded as to be deleted from Anki.
pub fn record_anki_send(
    conn: &mut Connection,
    project_id: &ProjectId,
    ids: &[FlashcardId],
    sent_at_ms: u64,
) -> Result<(), StorageError> {
    let transaction = conn.transaction()?;
    ensure_project_exists(&transaction, project_id)?;
    for id in ids {
        transaction.execute(
            "UPDATE flashcards SET sent_at_ms = ?2 WHERE id = ?1 AND project_id = ?3",
            params![id.0, to_stored_integer(sent_at_ms), project_id.0],
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

    /// A delivered package of the project's flashcards, marking no deletion.
    fn package(
        project_id: &ProjectId,
        ids: &[FlashcardId],
        exported_at_ms: Option<u64>,
    ) -> DeliveredPackage {
        DeliveredPackage {
            project_id: project_id.clone(),
            flashcard_ids: ids.to_vec(),
            exported_at_ms,
            marked_deletions: vec![],
        }
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
            .record_anki_export(&package(&project(), std::slice::from_ref(&id), Some(1_000)))
            .unwrap();
        assert_eq!(
            storage.get_flashcard(&id).unwrap().exported_at_ms,
            Some(1_000)
        );
    }

    #[test]
    fn an_export_records_that_a_package_held_the_flashcards() {
        let storage = seeded_storage();
        let id = create(&storage);
        storage
            .record_anki_export(&package(&project(), std::slice::from_ref(&id), Some(1_000)))
            .unwrap();
        assert!(storage.get_flashcard(&id).unwrap().was_packaged);
    }

    #[test]
    fn an_export_not_marking_the_flashcards_leaves_when_they_were_exported() {
        let storage = seeded_storage();
        let id = create(&storage);
        storage
            .record_anki_export(&package(&project(), std::slice::from_ref(&id), Some(1_000)))
            .unwrap();
        storage
            .record_anki_export(&package(&project(), std::slice::from_ref(&id), None))
            .unwrap();
        assert_eq!(
            storage.get_flashcard(&id).unwrap().exported_at_ms,
            Some(1_000)
        );
    }

    #[test]
    fn an_export_not_marking_the_flashcards_still_records_that_a_package_held_them() {
        let storage = seeded_storage();
        let id = create(&storage);
        storage
            .record_anki_export(&package(&project(), std::slice::from_ref(&id), None))
            .unwrap();
        assert!(storage.get_flashcard(&id).unwrap().was_packaged);
    }

    #[test]
    fn an_export_clears_the_deletions_it_marked() {
        let storage = seeded_storage();
        let id = create(&storage);
        storage
            .record_anki_send(&project(), std::slice::from_ref(&id), 1)
            .unwrap();
        storage.delete_flashcard(&id).unwrap();
        let delivered = DeliveredPackage {
            marked_deletions: vec![id],
            ..package(&project(), &[], Some(2))
        };
        storage.record_anki_export(&delivered).unwrap();
        assert_eq!(listed_deletion_ids(&storage), Vec::<FlashcardId>::new());
    }

    #[test]
    fn an_export_passes_over_a_flashcard_that_is_gone() {
        let storage = seeded_storage();
        let id = create(&storage);
        storage
            .record_anki_export(&package(&project(), &[missing(), id.clone()], Some(1_000)))
            .unwrap();
        assert_eq!(
            storage.get_flashcard(&id).unwrap().exported_at_ms,
            Some(1_000)
        );
    }

    #[test]
    fn an_export_of_an_unknown_project_fails() {
        let result = seeded_storage().record_anki_export(&package(
            &ProjectId("missing".to_string()),
            &[],
            Some(1),
        ));
        assert!(matches!(result, Err(StorageError::ProjectNotFound(_))));
    }

    #[test]
    fn a_send_records_the_time_the_flashcards_were_read() {
        let storage = seeded_storage();
        let id = create(&storage);
        storage
            .record_anki_send(&project(), std::slice::from_ref(&id), 1_700)
            .unwrap();
        assert_eq!(storage.get_flashcard(&id).unwrap().sent_at_ms, Some(1_700));
    }

    #[test]
    fn a_send_passes_over_a_flashcard_that_is_gone() {
        let storage = seeded_storage();
        let id = create(&storage);
        storage
            .record_anki_send(&project(), &[missing(), id.clone()], 2)
            .unwrap();
        assert_eq!(storage.get_flashcard(&id).unwrap().sent_at_ms, Some(2));
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
            .record_anki_send(&project(), std::slice::from_ref(&id), 1)
            .unwrap();
        assert_eq!(listed_deletion_ids(&storage), vec![id]);
    }

    #[test]
    fn a_send_keeps_the_word_of_a_deletion_already_recorded() {
        let storage = seeded_storage();
        let id = create(&storage);
        storage
            .record_anki_send(&project(), std::slice::from_ref(&id), 1)
            .unwrap();
        storage.delete_flashcard(&id).unwrap();
        storage.record_anki_send(&project(), &[id], 1).unwrap();
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
        storage.record_anki_send(&project(), &[id], 1).unwrap();
        assert_eq!(listed_deletion_ids(&storage), Vec::<FlashcardId>::new());
    }

    #[test]
    fn a_send_records_no_deletion_for_an_id_the_app_could_not_have_made() {
        let storage = seeded_storage();
        storage
            .record_anki_send(&project(), &[missing()], 1)
            .unwrap();
        assert_eq!(listed_deletion_ids(&storage), Vec::<FlashcardId>::new());
    }

    #[test]
    fn a_send_marks_no_flashcard_of_another_project_sent() {
        let storage = seeded_storage();
        let id = create(&storage);
        storage
            .record_anki_send(
                &ProjectId("placeholder-2".to_string()),
                std::slice::from_ref(&id),
                1,
            )
            .unwrap();
        assert_eq!(storage.get_flashcard(&id).unwrap().sent_at_ms, None);
    }

    #[test]
    fn a_send_to_an_unknown_project_fails() {
        let result = seeded_storage().record_anki_send(&ProjectId("missing".to_string()), &[], 1);
        assert!(matches!(result, Err(StorageError::ProjectNotFound(_))));
    }
}

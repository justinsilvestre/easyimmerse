use easyimmerse_core::dictionary::DictionarySource;
use easyimmerse_core::media_file::{MediaFile, MediaFileSource};
use easyimmerse_core::project::ProjectId;
use easyimmerse_core::review::{ReviewAllowanceRequest, ReviewRating};
use rusqlite::params;

use super::changes::SyncChange;
use super::codec::{RowData, delete_row, read_row, stamp, write_row};
use super::sync_test_support::storage_with_remote;
use super::tables::SyncTable;
use crate::new_row::now_ms;
use crate::owners::OwnerId;
use crate::review_test_support::{
    NOON_MS, launch, make_flashcard, other_project, project, project_settings, rate, seeded_storage,
};
use crate::{DictionaryId, Storage};

fn all_changes(storage: &Storage) -> Vec<SyncChange> {
    storage.changes_since(&launch(), 0, 10_000).unwrap().changes
}

fn change_of(storage: &Storage, table: SyncTable, key: &str) -> Option<SyncChange> {
    all_changes(storage)
        .into_iter()
        .find(|change| change.table == table && change.key == key)
}

fn add_media(storage: &Storage, project_id: &ProjectId, name: &str) -> MediaFile {
    let source = MediaFileSource::Path {
        path: format!("/media/{name}"),
    };
    storage.add_media_file(project_id, name, &source).unwrap()
}

fn execute(storage: &Storage, sql: &str) {
    storage.write(|conn| Ok(conn.execute_batch(sql)?)).unwrap();
}

mod registry {
    use super::*;

    #[test]
    fn records_an_inserted_row() {
        let storage = seeded_storage();
        assert!(change_of(&storage, SyncTable::Projects, &project().0).is_some());
    }

    #[test]
    fn records_an_inserted_row_at_the_current_time() {
        let storage = seeded_storage();
        let change = change_of(&storage, SyncTable::Projects, &project().0).unwrap();
        assert!(now_ms().abs_diff(change.updated_at_ms) < 5_000);
    }

    #[test]
    fn gives_an_updated_row_a_later_change_sequence() {
        let storage = seeded_storage();
        let before = change_of(&storage, SyncTable::Projects, &project().0).unwrap();
        storage
            .update_project(&project(), &project_settings("Deutsch"))
            .unwrap();
        let after = change_of(&storage, SyncTable::Projects, &project().0).unwrap();
        assert!(after.change_seq > before.change_seq);
    }

    #[test]
    fn keeps_a_tombstone_of_a_deleted_row() {
        let storage = seeded_storage();
        let id = make_flashcard(&storage, &project(), "Haus");
        storage.delete_flashcard(&id).unwrap();
        let change = change_of(&storage, SyncTable::Flashcards, &id.0).unwrap();
        assert!(change.is_deleted);
    }

    #[test]
    fn keeps_no_tombstone_of_a_row_that_a_cascade_deleted() {
        let storage = seeded_storage();
        let media = add_media(&storage, &project(), "a.mp4");
        storage.delete_project(&project()).unwrap();
        assert_eq!(
            change_of(&storage, SyncTable::MediaFiles, &media.id.0),
            None
        );
    }

    #[test]
    fn keeps_the_tombstone_of_the_parent_a_cascade_followed() {
        let storage = seeded_storage();
        add_media(&storage, &project(), "a.mp4");
        storage.delete_project(&project()).unwrap();
        let change = change_of(&storage, SyncTable::Projects, &project().0).unwrap();
        assert!(change.is_deleted);
    }

    #[test]
    fn deletes_a_project_whose_media_files_pair_with_each_other() {
        let storage = seeded_storage();
        let document = add_media(&storage, &project(), "a.epub");
        let translation = add_media(&storage, &project(), "a.en.epub");
        storage
            .set_translation_document(&document.id, Some(&translation.id))
            .unwrap();
        assert!(storage.delete_project(&project()).is_ok());
    }

    #[test]
    fn records_no_change_when_a_project_is_opened() {
        let storage = seeded_storage();
        let before = storage.local_change_seq().unwrap();
        storage.mark_project_opened(&project()).unwrap();
        assert_eq!(storage.local_change_seq().unwrap(), before);
    }

    #[test]
    fn records_no_change_when_anki_connect_is_turned_on() {
        let storage = seeded_storage();
        let before = storage.local_change_seq().unwrap();
        storage.set_uses_anki_connect(&project(), true).unwrap();
        assert_eq!(storage.local_change_seq().unwrap(), before);
    }

    #[test]
    fn records_a_change_to_exactly_the_preferences_that_sync() {
        let storage = Storage::open_in_memory().unwrap();
        let misrecorded: Vec<&str> = crate::preferences::tests::CLASSIFIED_KEYS
            .iter()
            .filter(|(key, is_synced)| {
                let before = storage.local_change_seq().unwrap();
                storage.set_preference(&launch(), key, "1").unwrap();
                let is_recorded = storage.local_change_seq().unwrap() > before;
                is_recorded != *is_synced
            })
            .map(|(key, _)| *key)
            .collect();
        assert_eq!(misrecorded, Vec::<&str>::new());
    }

    #[test]
    fn leaves_out_the_changes_of_another_owner() {
        let storage = Storage::open_in_memory().unwrap();
        let account = crate::review_test_support::account_owner(&storage);
        storage
            .create_project(&account, &project_settings("German"))
            .unwrap();
        assert_eq!(all_changes(&storage), vec![]);
    }

    #[test]
    fn forgets_the_changes_of_a_deleted_account() {
        let storage = Storage::open_in_memory().unwrap();
        let account = crate::review_test_support::account_owner(&storage);
        storage
            .create_project(&account, &project_settings("German"))
            .unwrap();
        storage.delete_user(&account.0).unwrap();
        let page = storage.changes_since(&account, 0, 100).unwrap();
        assert_eq!(page.changes, vec![]);
    }
}

mod paging {
    use super::*;

    fn keys_of_pages(storage: &Storage, limit: u32) -> Vec<Vec<String>> {
        let mut pages = Vec::new();
        let mut cursor = 0;
        loop {
            let page = storage.changes_since(&launch(), cursor, limit).unwrap();
            pages.push(page.changes.into_iter().map(|change| change.key).collect());
            cursor = page.next_cursor;
            if !page.has_more {
                return pages;
            }
        }
    }

    #[test]
    fn pages_through_the_changes_in_the_order_they_were_made() {
        let storage = Storage::open_in_memory().unwrap();
        let ids: Vec<String> = ["a", "b", "c"]
            .into_iter()
            .map(|name| {
                let settings = project_settings(name);
                storage.create_project(&launch(), &settings).unwrap().id.0
            })
            .collect();
        let expected = vec![ids[..2].to_vec(), ids[2..].to_vec()];
        assert_eq!(keys_of_pages(&storage, 2), expected);
    }

    #[test]
    fn answers_an_empty_page_after_the_last_change() {
        let storage = seeded_storage();
        let last = storage.local_change_seq().unwrap();
        let page = storage.changes_since(&launch(), last, 10).unwrap();
        assert_eq!((page.changes.len(), page.next_cursor), (0, last));
    }
}

mod codec {
    use super::*;

    /// A database with at least one row of every synced table, all of the launch owner.
    fn storage_with_every_table() -> Storage {
        let storage = seeded_storage();
        let document = add_media(&storage, &project(), "a.epub");
        let translation = add_media(&storage, &project(), "a.en.epub");
        storage
            .set_translation_document(&document.id, Some(&translation.id))
            .unwrap();
        let flashcard = make_flashcard(&storage, &project(), "Haus");
        rate(&storage, &flashcard, ReviewRating::Good, NOON_MS);
        let allowance = ReviewAllowanceRequest {
            utc_offset_min: 0,
            extra_new_cards: 5,
            extra_reviews: 0,
        };
        storage
            .raise_review_allowance(&project(), &allowance, NOON_MS)
            .unwrap();
        storage
            .save_review_parameters(&launch(), &[0.5, 1.25], NOON_MS)
            .unwrap();
        storage
            .set_preference(&launch(), "showTranslations", "true")
            .unwrap();
        let word_list = include_bytes!("../sample_content/spanish-english.tsv");
        let mut source = DictionarySource::single("words.tsv", word_list.to_vec()).unwrap();
        storage.import_dictionary(&launch(), &mut source).unwrap();
        execute(
            &storage,
            &format!(
                "INSERT INTO subtitle_tracks VALUES ('track', '{document}', 'a.srt', 'srt', '{{}}', NULL, 1); \
                 INSERT INTO alignments VALUES ('alignment', '{document}', '{translation}', 'translation', NULL, '{{}}', 2); \
                 INSERT INTO review_holds VALUES ('{flashcard}', '{project}', 'suspended', NULL); \
                 INSERT INTO anki_pending_deletions VALUES ('gone', '{project}', 'Tür', 3);",
                document = document.id.0,
                translation = translation.id.0,
                flashcard = flashcard.0,
                project = project().0,
            ),
        );
        storage
    }

    fn rows_by_rank(storage: &Storage) -> Vec<(SyncTable, String, RowData)> {
        let mut rows: Vec<(SyncTable, String, RowData)> = all_changes(storage)
            .into_iter()
            .filter_map(|change| Some((change.table, change.key, change.data?)))
            .collect();
        rows.sort_by_key(|(table, _, _)| table.spec().rank);
        rows
    }

    /// Writes the rows into a new database in one transaction, as a pull applies them.
    fn write_into_new_database(rows: &[(SyncTable, String, RowData)]) -> Storage {
        let storage = Storage::open_in_memory().unwrap();
        storage
            .write(|conn| {
                let transaction = conn.transaction()?;
                transaction.pragma_update(None, "defer_foreign_keys", true)?;
                for (table, _, data) in rows {
                    write_row(&transaction, &launch(), table.spec(), data)?;
                }
                Ok(transaction.commit()?)
            })
            .unwrap();
        storage
    }

    fn read_back(storage: &Storage, rows: &[(SyncTable, String, RowData)]) -> Vec<Option<RowData>> {
        rows.iter()
            .map(|(table, key, _)| {
                storage
                    .read(|conn| read_row(conn, &launch(), table.spec(), key))
                    .unwrap()
            })
            .collect()
    }

    #[test]
    fn the_fixture_has_a_row_of_every_synced_table() {
        let rows = rows_by_rank(&storage_with_every_table());
        let missing: Vec<SyncTable> = SyncTable::ALL
            .into_iter()
            .filter(|table| !rows.iter().any(|(row_table, _, _)| row_table == table))
            .collect();
        assert_eq!(missing, vec![]);
    }

    #[test]
    fn writes_back_what_it_reads_for_every_synced_table() {
        let rows = rows_by_rank(&storage_with_every_table());
        let copy = write_into_new_database(&rows);
        let expected: Vec<Option<RowData>> =
            rows.iter().map(|(_, _, data)| Some(data.clone())).collect();
        assert_eq!(read_back(&copy, &rows), expected);
    }

    #[test]
    fn updates_a_row_that_exists() {
        let storage = seeded_storage();
        let spec = SyncTable::Projects.spec();
        let mut data = storage
            .read(|conn| read_row(conn, &launch(), spec, &project().0))
            .unwrap()
            .unwrap();
        data.insert("name".to_string(), "Deutsch".into());
        storage
            .write(|conn| write_row(conn, &launch(), spec, &data))
            .unwrap();
        let name = storage.get_project(&project()).unwrap().settings.name;
        assert_eq!(name, "Deutsch");
    }

    #[test]
    fn refuses_data_that_lacks_a_column() {
        let storage = seeded_storage();
        let data = RowData::from_iter([("id".to_string(), "p".into())]);
        let result =
            storage.write(|conn| write_row(conn, &launch(), SyncTable::Projects.spec(), &data));
        assert!(matches!(
            result,
            Err(crate::StorageError::SyncColumnMissing { .. })
        ));
    }

    #[test]
    fn deletes_a_row_and_what_cascades_from_it() {
        let storage = seeded_storage();
        let media = add_media(&storage, &project(), "a.mp4");
        storage
            .write(|conn| delete_row(conn, &launch(), SyncTable::Projects.spec(), &project().0))
            .unwrap();
        assert!(storage.get_media_file(&media.id).is_err());
    }

    #[test]
    fn reads_nothing_of_another_owners_project() {
        let storage = seeded_storage();
        let account = OwnerId("someone".to_string());
        let read = storage
            .read(|conn| read_row(conn, &account, SyncTable::Projects.spec(), &project().0))
            .unwrap();
        assert_eq!(read, None);
    }

    #[test]
    fn stamps_an_entry_with_the_time_of_another_server() {
        let storage = seeded_storage();
        storage
            .write(|conn| stamp(conn, &launch(), SyncTable::Projects, &project().0, 42))
            .unwrap();
        let change = change_of(&storage, SyncTable::Projects, &project().0).unwrap();
        assert_eq!(change.updated_at_ms, 42);
    }
}

mod pending {
    use super::*;

    fn pending_keys(storage: &Storage, remote_id: &str) -> Vec<(SyncTable, String, bool)> {
        let through = storage.local_change_seq().unwrap();
        let pending = storage
            .pending_pushes(&launch(), remote_id, through)
            .unwrap();
        pending
            .into_iter()
            .map(|row| (row.table, row.key, row.is_deleted))
            .collect()
    }

    fn pushed_everything(storage: &Storage, remote_id: &str) {
        let through = storage.local_change_seq().unwrap();
        storage.set_sync_pushed_through(remote_id, through).unwrap();
    }

    #[test]
    fn pushes_a_parent_before_its_child_even_when_the_parent_changed_later() {
        let (storage, remote) = storage_with_remote();
        pushed_everything(&storage, &remote.id);
        let media = add_media(&storage, &project(), "a.mp4");
        storage
            .update_project(&project(), &project_settings("Deutsch"))
            .unwrap();
        let expected = vec![
            (SyncTable::Projects, project().0, false),
            (SyncTable::MediaFiles, media.id.0, false),
        ];
        assert_eq!(pending_keys(&storage, &remote.id), expected);
    }

    #[test]
    fn pushes_deletions_last_and_children_first() {
        let (storage, remote) = storage_with_remote();
        let media = add_media(&storage, &project(), "a.mp4");
        let flashcard = make_flashcard(&storage, &project(), "Haus");
        pushed_everything(&storage, &remote.id);
        storage.remove_media_file(&media.id).unwrap();
        storage.delete_flashcard(&flashcard).unwrap();
        storage
            .update_project(&other_project(), &project_settings("Deutsch"))
            .unwrap();
        let expected = vec![
            (SyncTable::Projects, other_project().0, false),
            (SyncTable::Flashcards, flashcard.0, true),
            (SyncTable::MediaFiles, media.id.0, true),
        ];
        assert_eq!(pending_keys(&storage, &remote.id), expected);
    }

    #[test]
    fn leaves_out_a_row_that_came_from_the_remote() {
        let (storage, remote) = storage_with_remote();
        pushed_everything(&storage, &remote.id);
        let media = add_media(&storage, &project(), "a.mp4");
        let change = change_of(&storage, SyncTable::MediaFiles, &media.id.0).unwrap();
        storage
            .record_sync_base(
                &remote.id,
                SyncTable::MediaFiles,
                &media.id.0,
                change.updated_at_ms,
            )
            .unwrap();
        assert_eq!(pending_keys(&storage, &remote.id), vec![]);
    }

    #[test]
    fn pushes_a_row_changed_since_the_remote_last_had_it() {
        let (storage, remote) = storage_with_remote();
        pushed_everything(&storage, &remote.id);
        let media = add_media(&storage, &project(), "a.mp4");
        storage
            .record_sync_base(&remote.id, SyncTable::MediaFiles, &media.id.0, 1)
            .unwrap();
        let expected = vec![(SyncTable::MediaFiles, media.id.0, false)];
        assert_eq!(pending_keys(&storage, &remote.id), expected);
    }

    #[test]
    fn leaves_out_the_changes_after_the_given_sequence() {
        let (storage, remote) = storage_with_remote();
        let through = storage.local_change_seq().unwrap();
        storage
            .update_project(&project(), &project_settings("Deutsch"))
            .unwrap();
        let pending = storage
            .pending_pushes(&launch(), &remote.id, through)
            .unwrap();
        assert!(pending.iter().all(|row| row.change_seq <= through));
    }

    fn import_word_list(storage: &Storage) -> DictionaryId {
        let word_list = include_bytes!("../sample_content/spanish-english.tsv");
        let mut source = DictionarySource::single("words.tsv", word_list.to_vec()).unwrap();
        storage.import_dictionary(&launch(), &mut source).unwrap()
    }

    #[test]
    fn leaves_out_a_new_dictionary_which_only_its_content_upload_sends() {
        let (storage, remote) = storage_with_remote();
        pushed_everything(&storage, &remote.id);
        import_word_list(&storage);
        assert_eq!(pending_keys(&storage, &remote.id), vec![]);
    }

    #[test]
    fn pushes_the_deletion_of_a_dictionary() {
        let (storage, remote) = storage_with_remote();
        let dictionary = import_word_list(&storage);
        pushed_everything(&storage, &remote.id);
        storage.delete_dictionary(&dictionary).unwrap();
        let expected = vec![(SyncTable::Dictionaries, dictionary.0, true)];
        assert_eq!(pending_keys(&storage, &remote.id), expected);
    }

    #[test]
    fn gives_each_row_the_time_the_remote_last_had() {
        let (storage, remote) = storage_with_remote();
        pushed_everything(&storage, &remote.id);
        let media = add_media(&storage, &project(), "a.mp4");
        storage
            .record_sync_base(&remote.id, SyncTable::MediaFiles, &media.id.0, 1)
            .unwrap();
        let through = storage.local_change_seq().unwrap();
        let pending = storage
            .pending_pushes(&launch(), &remote.id, through)
            .unwrap();
        assert_eq!(pending[0].base_updated_at_ms, Some(1));
    }
}

mod backed_up {
    use super::*;

    fn is_backed_up(storage: &Storage) -> bool {
        storage.get_project(&project()).unwrap().is_backed_up
    }

    fn pushed_everything(storage: &Storage, remote_id: &str) {
        let through = storage.local_change_seq().unwrap();
        storage.set_sync_pushed_through(remote_id, through).unwrap();
    }

    #[test]
    fn a_project_is_not_backed_up_without_a_remote() {
        assert!(!is_backed_up(&seeded_storage()));
    }

    #[test]
    fn a_project_is_not_backed_up_before_its_changes_are_pushed() {
        let (storage, _) = storage_with_remote();
        assert!(!is_backed_up(&storage));
    }

    #[test]
    fn a_project_is_backed_up_once_its_latest_change_is_pushed() {
        let (storage, remote) = storage_with_remote();
        pushed_everything(&storage, &remote.id);
        assert!(is_backed_up(&storage));
    }

    #[test]
    fn a_project_is_not_backed_up_after_a_later_change_to_a_child() {
        let (storage, remote) = storage_with_remote();
        pushed_everything(&storage, &remote.id);
        make_flashcard(&storage, &project(), "Haus");
        assert!(!is_backed_up(&storage));
    }

    #[test]
    fn a_project_stays_backed_up_after_a_change_to_another_project() {
        let (storage, remote) = storage_with_remote();
        pushed_everything(&storage, &remote.id);
        make_flashcard(&storage, &other_project(), "Haus");
        assert!(is_backed_up(&storage));
    }

    #[test]
    fn an_accounts_project_is_always_backed_up() {
        let storage = Storage::open_in_memory().unwrap();
        let account = crate::review_test_support::account_owner(&storage);
        let created = storage
            .create_project(&account, &project_settings("German"))
            .unwrap();
        assert!(created.is_backed_up);
    }
}

#[test]
fn the_registry_survives_a_project_with_every_kind_of_child_being_deleted() {
    let storage = seeded_storage();
    let flashcard = make_flashcard(&storage, &project(), "Haus");
    rate(&storage, &flashcard, ReviewRating::Good, NOON_MS);
    storage.delete_project(&project()).unwrap();
    let left: i64 = storage
        .read(|conn| {
            Ok(conn.query_row(
                "SELECT COUNT(*) FROM sync_rows WHERE project_id = ?1 AND table_name <> 'projects'",
                params![project().0],
                |row| row.get(0),
            )?)
        })
        .unwrap();
    assert_eq!(left, 0);
}

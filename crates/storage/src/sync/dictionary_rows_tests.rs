//! Moving whole dictionaries between servers.

use easyimmerse_core::dictionary::{DictionaryFormatKind, DictionaryMetadata, TermEntry};

use super::inbox::PulledRow;
use super::sync_test_support::storage_with_remote;
use super::tables::SyncTable;
use crate::review_test_support::launch;
use crate::{DictionaryId, Storage, StoredRemote};

const PULLED_MS: u64 = 1_234;

fn import_sample(storage: &Storage) -> DictionaryId {
    storage
        .import_dictionary_with(&launch(), |sink| {
            sink.begin(DictionaryMetadata::new(
                "Sample",
                DictionaryFormatKind::Yomitan,
            ))?;
            sink.term_entry(TermEntry::new("Hund", Vec::new()))?;
            Ok(())
        })
        .unwrap()
}

fn pulled_dictionary(storage: &Storage, remote: &StoredRemote) -> PulledRow {
    let row = PulledRow {
        table: SyncTable::Dictionaries,
        key: "d".repeat(32),
        updated_at_ms: PULLED_MS,
        is_deleted: false,
        data: None,
    };
    storage
        .receive_sync_page(&remote.id, std::slice::from_ref(&row), 1)
        .unwrap();
    row
}

fn store_pulled(storage: &Storage, remote: &StoredRemote, row: &PulledRow) {
    storage
        .store_pulled_dictionary(remote, row, 1_000, |sink| {
            sink.begin(DictionaryMetadata::new(
                "Pulled",
                DictionaryFormatKind::Yomitan,
            ))?;
            Ok(())
        })
        .unwrap();
}

#[test]
fn lists_a_dictionary_the_remote_lacks_for_upload() {
    let (storage, remote) = storage_with_remote();
    let id = import_sample(&storage);
    let listed = storage
        .dictionaries_to_upload(&launch(), &remote.id)
        .unwrap();
    assert_eq!(
        listed.into_iter().map(|(id, _)| id).collect::<Vec<_>>(),
        vec![id]
    );
}

#[test]
fn an_uploaded_dictionary_is_not_listed_again() {
    let (storage, remote) = storage_with_remote();
    let id = import_sample(&storage);
    storage
        .record_uploaded_dictionary(&launch(), &remote.id, &id, 9_000)
        .unwrap();
    assert!(
        storage
            .dictionaries_to_upload(&launch(), &remote.id)
            .unwrap()
            .is_empty()
    );
}

#[test]
fn an_uploaded_dictionary_takes_the_remotes_time() {
    let (storage, remote) = storage_with_remote();
    let id = import_sample(&storage);
    storage
        .record_uploaded_dictionary(&launch(), &remote.id, &id, 9_000)
        .unwrap();
    let change = storage
        .sync_changes_of(&launch(), &[(SyncTable::Dictionaries, id.0)])
        .unwrap()
        .remove(0)
        .unwrap();
    assert_eq!(change.updated_at_ms, 9_000);
}

#[test]
fn a_stored_pulled_dictionary_leaves_the_inbox() {
    let (storage, remote) = storage_with_remote();
    let row = pulled_dictionary(&storage, &remote);
    store_pulled(&storage, &remote, &row);
    assert_eq!(storage.sync_inbox_size(&remote.id).unwrap(), 0);
}

#[test]
fn a_stored_pulled_dictionary_keeps_its_id() {
    let (storage, remote) = storage_with_remote();
    let row = pulled_dictionary(&storage, &remote);
    store_pulled(&storage, &remote, &row);
    assert!(storage.get_dictionary(&DictionaryId(row.key)).is_ok());
}

#[test]
fn a_stored_pulled_dictionary_takes_the_pulled_time() {
    let (storage, remote) = storage_with_remote();
    let row = pulled_dictionary(&storage, &remote);
    store_pulled(&storage, &remote, &row);
    let change = storage
        .sync_changes_of(&launch(), &[(SyncTable::Dictionaries, row.key)])
        .unwrap()
        .remove(0)
        .unwrap();
    assert_eq!(change.updated_at_ms, PULLED_MS);
}

#[test]
fn a_stored_pulled_dictionary_is_not_uploaded_back() {
    let (storage, remote) = storage_with_remote();
    let row = pulled_dictionary(&storage, &remote);
    store_pulled(&storage, &remote, &row);
    assert!(
        storage
            .dictionaries_to_upload(&launch(), &remote.id)
            .unwrap()
            .is_empty()
    );
}

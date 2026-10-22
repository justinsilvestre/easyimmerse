//! Applying the rows pulled from a remote.

use easyimmerse_core::sync::ConflictKept;
use serde_json::Value;

use super::changes::SyncChange;
use super::inbox::PulledRow;
use super::remotes::StoredRemote;
use super::sync_test_support::storage_with_remote;
use super::tables::SyncTable;
use crate::Storage;
use crate::review_test_support::{launch, make_flashcard, other_project, project};

const LATER_MS: u64 = 4_000_000_000_000;
const EARLIER_MS: u64 = 1_000;

fn local(storage: &Storage, table: SyncTable, key: &str) -> Option<SyncChange> {
    storage
        .sync_changes_of(&launch(), &[(table, key.to_string())])
        .unwrap()
        .remove(0)
}

fn project_entry(storage: &Storage) -> SyncChange {
    local(storage, SyncTable::Projects, &project().0).unwrap()
}

/// The placeholder project as another server holds it, under the name and time given.
fn pulled_project(storage: &Storage, name: &str, updated_at_ms: u64) -> PulledRow {
    let mut data = project_entry(storage).data.unwrap();
    data.insert("name".to_string(), Value::from(name));
    PulledRow {
        table: SyncTable::Projects,
        key: project().0,
        updated_at_ms,
        is_deleted: false,
        data: Some(data),
    }
}

fn pull(storage: &Storage, remote: &StoredRemote, row: PulledRow) -> crate::AppliedInbox {
    storage.receive_sync_page(&remote.id, &[row], 1).unwrap();
    storage.apply_sync_inbox(remote, 5_000).unwrap()
}

/// Records that the remote holds the placeholder project as it is here, as after a push.
fn agree_on_project(storage: &Storage, remote: &StoredRemote) {
    let entry = project_entry(storage);
    storage
        .record_sync_base(
            &remote.id,
            SyncTable::Projects,
            &entry.key,
            entry.updated_at_ms,
        )
        .unwrap();
}

fn project_name(storage: &Storage) -> String {
    storage.get_project(&project()).unwrap().settings.name
}

#[test]
fn receiving_a_page_moves_the_pull_cursor() {
    let (storage, remote) = storage_with_remote();
    let row = pulled_project(&storage, "Neu", LATER_MS);
    storage.receive_sync_page(&remote.id, &[row], 9).unwrap();
    let found = storage
        .get_sync_remote(&launch(), super::remotes::RemoteKind::Account)
        .unwrap();
    assert_eq!(found.unwrap().pulled_cursor, 9);
}

#[test]
fn an_agreed_row_changes_nothing() {
    let (storage, remote) = storage_with_remote();
    let before = project_entry(&storage);
    let row = pulled_project(&storage, &project_name(&storage), before.updated_at_ms);
    pull(&storage, &remote, row);
    assert_eq!(project_entry(&storage).change_seq, before.change_seq);
}

#[test]
fn an_agreed_row_leaves_the_inbox() {
    let (storage, remote) = storage_with_remote();
    let before = project_entry(&storage);
    let row = pulled_project(&storage, &project_name(&storage), before.updated_at_ms);
    pull(&storage, &remote, row);
    assert_eq!(storage.sync_inbox_size(&remote.id).unwrap(), 0);
}

#[test]
fn applies_a_row_that_changed_only_on_the_remote() {
    let (storage, remote) = storage_with_remote();
    agree_on_project(&storage, &remote);
    pull(&storage, &remote, pulled_project(&storage, "Neu", LATER_MS));
    assert_eq!(project_name(&storage), "Neu");
}

#[test]
fn an_applied_row_takes_the_remotes_time() {
    let (storage, remote) = storage_with_remote();
    agree_on_project(&storage, &remote);
    pull(&storage, &remote, pulled_project(&storage, "Neu", LATER_MS));
    assert_eq!(project_entry(&storage).updated_at_ms, LATER_MS);
}

#[test]
fn an_applied_row_is_not_pushed_back() {
    let (storage, remote) = storage_with_remote();
    agree_on_project(&storage, &remote);
    pull(&storage, &remote, pulled_project(&storage, "Neu", LATER_MS));
    let pending = storage
        .pending_pushes(&launch(), &remote.id, u64::MAX)
        .unwrap();
    assert!(!pending.iter().any(|row| row.key == project().0));
}

#[test]
fn applying_a_row_counts_it() {
    let (storage, remote) = storage_with_remote();
    agree_on_project(&storage, &remote);
    let applied = pull(&storage, &remote, pulled_project(&storage, "Neu", LATER_MS));
    assert_eq!(applied.applied_count, 1);
}

#[test]
fn a_newer_remote_change_wins_over_a_change_here() {
    let (storage, remote) = storage_with_remote();
    pull(&storage, &remote, pulled_project(&storage, "Neu", LATER_MS));
    assert_eq!(project_name(&storage), "Neu");
}

#[test]
fn a_newer_remote_change_records_that_the_other_device_was_kept() {
    let (storage, remote) = storage_with_remote();
    pull(&storage, &remote, pulled_project(&storage, "Neu", LATER_MS));
    let conflicts = storage.list_sync_conflicts(&remote.id, 20).unwrap();
    assert_eq!(conflicts[0].kept, ConflictKept::OtherDevice);
}

#[test]
fn an_older_remote_change_loses_to_a_change_here() {
    let (storage, remote) = storage_with_remote();
    let name = project_name(&storage);
    pull(
        &storage,
        &remote,
        pulled_project(&storage, "Alt", EARLIER_MS),
    );
    assert_eq!(project_name(&storage), name);
}

#[test]
fn an_older_remote_change_records_that_this_device_was_kept() {
    let (storage, remote) = storage_with_remote();
    pull(
        &storage,
        &remote,
        pulled_project(&storage, "Alt", EARLIER_MS),
    );
    let conflicts = storage.list_sync_conflicts(&remote.id, 20).unwrap();
    assert_eq!(conflicts[0].kept, ConflictKept::ThisDevice);
}

#[test]
fn the_same_change_on_both_sides_is_no_conflict() {
    let (storage, remote) = storage_with_remote();
    let row = pulled_project(&storage, &project_name(&storage), LATER_MS);
    pull(&storage, &remote, row);
    assert_eq!(storage.count_sync_conflicts(&remote.id).unwrap(), 0);
}

#[test]
fn a_pulled_deletion_deletes_the_row() {
    let (storage, remote) = storage_with_remote();
    agree_on_project(&storage, &remote);
    let row = PulledRow {
        is_deleted: true,
        data: None,
        ..pulled_project(&storage, "", LATER_MS)
    };
    pull(&storage, &remote, row);
    assert!(storage.get_project(&project()).is_err());
}

/// A flashcard of the other placeholder project as the remote holds it, after that project was deleted here.
fn flashcard_of_a_project_deleted_here(storage: &Storage) -> PulledRow {
    let flashcard = make_flashcard(storage, &other_project(), "Haus");
    let data = local(storage, SyncTable::Flashcards, &flashcard.0)
        .unwrap()
        .data
        .unwrap();
    storage.delete_project(&other_project()).unwrap();
    PulledRow {
        table: SyncTable::Flashcards,
        key: flashcard.0,
        updated_at_ms: LATER_MS,
        is_deleted: false,
        data: Some(data),
    }
}

#[test]
fn a_deletion_here_wins_over_a_child_changed_on_the_remote() {
    let (storage, remote) = storage_with_remote();
    let row = flashcard_of_a_project_deleted_here(&storage);
    let key = row.key.clone();
    pull(&storage, &remote, row);
    assert!(local(&storage, SyncTable::Flashcards, &key).is_none());
}

#[test]
fn a_deletion_here_records_that_the_deletion_was_kept() {
    let (storage, remote) = storage_with_remote();
    let row = flashcard_of_a_project_deleted_here(&storage);
    pull(&storage, &remote, row);
    let conflicts = storage.list_sync_conflicts(&remote.id, 20).unwrap();
    assert_eq!(conflicts[0].kept, ConflictKept::Deletion);
}

fn flashcard_of_an_unknown_project(storage: &Storage) -> PulledRow {
    let mut row = flashcard_of_a_project_deleted_here(storage);
    let data = row.data.as_mut().unwrap();
    data.insert("project_id".to_string(), Value::from("unknown-project"));
    row
}

#[test]
fn a_row_whose_parent_has_not_arrived_waits_in_the_inbox() {
    let (storage, remote) = storage_with_remote();
    let row = flashcard_of_an_unknown_project(&storage);
    pull(&storage, &remote, row);
    assert_eq!(storage.sync_inbox_size(&remote.id).unwrap(), 1);
}

#[test]
fn a_row_whose_parent_has_not_arrived_is_not_written() {
    let (storage, remote) = storage_with_remote();
    let row = flashcard_of_an_unknown_project(&storage);
    let key = row.key.clone();
    pull(&storage, &remote, row);
    assert!(local(&storage, SyncTable::Flashcards, &key).is_none());
}

fn unknown_dictionary() -> PulledRow {
    PulledRow {
        table: SyncTable::Dictionaries,
        key: "remote-dictionary".to_string(),
        updated_at_ms: LATER_MS,
        is_deleted: false,
        data: Some(serde_json::Map::new()),
    }
}

#[test]
fn a_dictionary_not_here_is_left_to_fetch() {
    let (storage, remote) = storage_with_remote();
    let applied = pull(&storage, &remote, unknown_dictionary());
    assert_eq!(applied.dictionaries_to_fetch, vec![unknown_dictionary()]);
}

#[test]
fn a_dictionary_not_here_stays_in_the_inbox() {
    let (storage, remote) = storage_with_remote();
    pull(&storage, &remote, unknown_dictionary());
    assert_eq!(storage.sync_inbox_size(&remote.id).unwrap(), 1);
}

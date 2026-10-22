//! Recording the answers a remote gave to pushed rows.

use easyimmerse_core::sync::ConflictKept;
use serde_json::Value;

use super::changes::SyncChange;
use super::inbox::PulledRow;
use super::push_answers::{AnsweredPush, PushAnswer};
use super::remotes::StoredRemote;
use super::sync_test_support::storage_with_remote;
use super::tables::SyncTable;
use crate::Storage;
use crate::review_test_support::{launch, project};

const LATER_MS: u64 = 4_000_000_000_000;

fn project_entry(storage: &Storage) -> SyncChange {
    storage
        .sync_changes_of(&launch(), &[(SyncTable::Projects, project().0)])
        .unwrap()
        .remove(0)
        .unwrap()
}

fn answer(storage: &Storage, remote: &StoredRemote, answer: PushAnswer) {
    let entry = project_entry(storage);
    let answered = AnsweredPush {
        table: SyncTable::Projects,
        key: entry.key,
        sent_updated_at_ms: entry.updated_at_ms,
        answer,
    };
    storage
        .record_sync_push_answers(remote, &[answered], 5_000)
        .unwrap();
}

fn is_pending(storage: &Storage, remote: &StoredRemote) -> bool {
    storage
        .pending_pushes(&launch(), &remote.id, u64::MAX)
        .unwrap()
        .iter()
        .any(|row| row.key == project().0)
}

#[test]
fn an_accepted_row_is_no_longer_pending() {
    let (storage, remote) = storage_with_remote();
    let remote_updated_at_ms = project_entry(&storage).updated_at_ms;
    answer(
        &storage,
        &remote,
        PushAnswer::Accepted {
            remote_updated_at_ms,
        },
    );
    assert!(!is_pending(&storage, &remote));
}

#[test]
fn a_row_the_remote_gave_another_time_takes_that_time_here() {
    let (storage, remote) = storage_with_remote();
    answer(
        &storage,
        &remote,
        PushAnswer::Accepted {
            remote_updated_at_ms: 7_000,
        },
    );
    assert_eq!(project_entry(&storage).updated_at_ms, 7_000);
}

fn superseding_version(storage: &Storage) -> PulledRow {
    let mut data = project_entry(storage).data.unwrap();
    data.insert("name".to_string(), Value::from("Neu"));
    PulledRow {
        table: SyncTable::Projects,
        key: project().0,
        updated_at_ms: LATER_MS,
        is_deleted: false,
        data: Some(data),
    }
}

#[test]
fn a_superseded_row_takes_the_remotes_version() {
    let (storage, remote) = storage_with_remote();
    let current = superseding_version(&storage);
    answer(&storage, &remote, PushAnswer::Superseded { current });
    assert_eq!(
        storage.get_project(&project()).unwrap().settings.name,
        "Neu"
    );
}

#[test]
fn a_superseded_row_records_that_the_other_device_was_kept() {
    let (storage, remote) = storage_with_remote();
    let current = superseding_version(&storage);
    answer(&storage, &remote, PushAnswer::Superseded { current });
    let conflicts = storage.list_sync_conflicts(&remote.id, 20).unwrap();
    assert_eq!(conflicts[0].kept, ConflictKept::OtherDevice);
}

#[test]
fn a_superseded_row_is_not_pushed_again() {
    let (storage, remote) = storage_with_remote();
    let current = superseding_version(&storage);
    answer(&storage, &remote, PushAnswer::Superseded { current });
    assert!(!is_pending(&storage, &remote));
}

#[test]
fn a_row_whose_parent_was_deleted_records_that_the_deletion_was_kept() {
    let (storage, remote) = storage_with_remote();
    answer(&storage, &remote, PushAnswer::ParentDeleted);
    let conflicts = storage.list_sync_conflicts(&remote.id, 20).unwrap();
    assert_eq!(conflicts[0].kept, ConflictKept::Deletion);
}

#[test]
fn a_rejected_row_is_not_pushed_again() {
    let (storage, remote) = storage_with_remote();
    answer(&storage, &remote, PushAnswer::Rejected);
    assert!(!is_pending(&storage, &remote));
}

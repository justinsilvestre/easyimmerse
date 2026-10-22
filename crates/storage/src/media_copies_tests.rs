//! Copies of media bytes that a server keeps.

use easyimmerse_core::media_file::{MediaFile, MediaFileSource};

use crate::media_copies::NewMediaCopy;
use crate::review_test_support::{
    account_owner, launch, project, project_settings, seeded_storage,
};
use crate::sync::sync_test_support::launch_remote;
use crate::{Storage, StorageError};

fn add_media(storage: &Storage) -> MediaFile {
    let source = MediaFileSource::BrowserFile {
        size: 10,
        last_modified_ms: 1,
    };
    storage
        .add_media_file(&project(), "film.mp4", &source)
        .unwrap()
}

fn copy_of(media_file: &MediaFile, file_name: &str, size_bytes: u64) -> NewMediaCopy {
    NewMediaCopy {
        media_file_id: media_file.id.clone(),
        file_name: file_name.to_string(),
        size_bytes,
        stored_at_ms: 1_000,
        quota_bytes: None,
    }
}

/// A media file of the launch owner with a copy of 10 bytes in `a.mp4`.
fn copied() -> (Storage, MediaFile) {
    let storage = seeded_storage();
    let media_file = add_media(&storage);
    storage
        .record_media_copy(&copy_of(&media_file, "a.mp4", 10))
        .unwrap();
    (storage, media_file)
}

#[test]
fn a_recorded_copy_names_its_file() {
    let (storage, media_file) = copied();
    let copy = storage.get_media_copy(&media_file.id).unwrap().unwrap();
    assert_eq!(copy.file_name, "a.mp4");
}

#[test]
fn a_recorded_copy_shows_on_its_media_file() {
    let (storage, media_file) = copied();
    assert!(
        storage
            .get_media_file(&media_file.id)
            .unwrap()
            .has_stored_copy
    );
}

#[test]
fn a_media_file_without_a_copy_shows_none() {
    let storage = seeded_storage();
    let media_file = add_media(&storage);
    assert!(
        !storage
            .get_media_file(&media_file.id)
            .unwrap()
            .has_stored_copy
    );
}

#[test]
fn recording_a_copy_records_the_choice_to_keep_it() {
    let (storage, media_file) = copied();
    assert!(
        storage
            .get_media_file(&media_file.id)
            .unwrap()
            .is_upload_chosen
    );
}

#[test]
fn a_recorded_copy_is_listed_with_its_project() {
    let (storage, _) = copied();
    let copies = storage.list_media_copies(&launch()).unwrap();
    assert_eq!(copies[0].project_name, "Spanish practice");
}

#[test]
fn another_owners_copies_are_not_listed() {
    let (storage, _) = copied();
    let owner = account_owner(&storage);
    assert!(storage.list_media_copies(&owner).unwrap().is_empty());
}

#[test]
fn the_owners_copies_are_summed() {
    let (storage, _) = copied();
    let other = add_media(&storage);
    storage
        .record_media_copy(&copy_of(&other, "b.mp4", 5))
        .unwrap();
    assert_eq!(storage.media_copies_size(&launch()).unwrap(), 15);
}

#[test]
fn a_copy_past_the_quota_is_refused() {
    let (storage, _) = copied();
    let other = add_media(&storage);
    let copy = NewMediaCopy {
        quota_bytes: Some(12),
        ..copy_of(&other, "b.mp4", 5)
    };
    assert!(matches!(
        storage.record_media_copy(&copy),
        Err(StorageError::QuotaExceeded {
            used: 10,
            quota: 12,
            size: 5
        })
    ));
}

#[test]
fn a_replacing_copy_counts_the_replaced_one_as_freed() {
    let (storage, media_file) = copied();
    let copy = NewMediaCopy {
        quota_bytes: Some(12),
        ..copy_of(&media_file, "b.mp4", 12)
    };
    assert!(storage.record_media_copy(&copy).is_ok());
}

#[test]
fn a_replaced_copy_releases_its_file() {
    let (storage, media_file) = copied();
    storage
        .record_media_copy(&copy_of(&media_file, "b.mp4", 3))
        .unwrap();
    assert_eq!(storage.take_released_copy_files().unwrap(), vec!["a.mp4"]);
}

#[test]
fn turning_the_choice_off_removes_the_copy() {
    let (storage, media_file) = copied();
    storage.set_upload_choice(&media_file.id, false).unwrap();
    assert_eq!(storage.get_media_copy(&media_file.id).unwrap(), None);
}

#[test]
fn turning_the_choice_off_releases_the_file() {
    let (storage, media_file) = copied();
    storage.set_upload_choice(&media_file.id, false).unwrap();
    assert_eq!(storage.take_released_copy_files().unwrap(), vec!["a.mp4"]);
}

#[test]
fn turning_the_choice_off_forgets_the_remotes_copy() {
    let (storage, media_file) = copied();
    let remote = storage.create_sync_remote(&launch_remote()).unwrap();
    storage
        .record_remote_copy(&remote.id, &media_file.id, 10)
        .unwrap();
    storage.set_upload_choice(&media_file.id, false).unwrap();
    assert_eq!(
        storage
            .remote_copy_size(&remote.id, &media_file.id)
            .unwrap(),
        None
    );
}

#[test]
fn deleting_the_project_releases_its_copies() {
    let (storage, _) = copied();
    storage.delete_project(&project()).unwrap();
    assert_eq!(storage.take_released_copy_files().unwrap(), vec!["a.mp4"]);
}

#[test]
fn taken_files_are_not_listed_again() {
    let (storage, media_file) = copied();
    storage.remove_media_copy(&media_file.id).unwrap();
    storage.take_released_copy_files().unwrap();
    assert!(storage.take_released_copy_files().unwrap().is_empty());
}

#[test]
fn a_chosen_media_file_without_a_remote_copy_is_listed_for_upload() {
    let (storage, media_file) = copied();
    let remote = storage.create_sync_remote(&launch_remote()).unwrap();
    let listed = storage
        .list_media_files_to_upload(&launch(), &remote.id)
        .unwrap();
    assert_eq!(
        listed.into_iter().map(|m| m.id).collect::<Vec<_>>(),
        vec![media_file.id]
    );
}

#[test]
fn a_media_file_the_remote_holds_is_not_listed_for_upload() {
    let (storage, media_file) = copied();
    let remote = storage.create_sync_remote(&launch_remote()).unwrap();
    storage
        .record_remote_copy(&remote.id, &media_file.id, 10)
        .unwrap();
    assert!(
        storage
            .list_media_files_to_upload(&launch(), &remote.id)
            .unwrap()
            .is_empty()
    );
}

#[test]
fn an_unchosen_media_file_is_not_listed_for_upload() {
    let storage = seeded_storage();
    add_media(&storage);
    let remote = storage.create_sync_remote(&launch_remote()).unwrap();
    assert!(
        storage
            .list_media_files_to_upload(&launch(), &remote.id)
            .unwrap()
            .is_empty()
    );
}

#[test]
fn another_owners_project_is_left_out_of_the_size() {
    let (storage, _) = copied();
    let owner = account_owner(&storage);
    let project = storage
        .create_project(&owner, &project_settings("Mine"))
        .unwrap();
    let source = MediaFileSource::BrowserFile {
        size: 1,
        last_modified_ms: 1,
    };
    let theirs = storage
        .add_media_file(&project.id, "x.mp4", &source)
        .unwrap();
    storage
        .record_media_copy(&copy_of(&theirs, "x.mp4", 7))
        .unwrap();
    assert_eq!(storage.media_copies_size(&launch()).unwrap(), 10);
}

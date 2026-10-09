use easyimmerse_core::media_file::{MediaFile, MediaFileSource};
use easyimmerse_core::project::ProjectId;
use easyimmerse_storage::Storage;
use serde_json::{Value, json};

use crate::support::{fixture_path, seeded_storage, spawn_test_server_with_storage};

const PROJECT: &str = "placeholder-1";

fn add_path_file(storage: &Storage, path: &str) -> MediaFile {
    storage
        .add_media_file(
            &ProjectId(PROJECT.to_string()),
            "a.mp4",
            &MediaFileSource::Path {
                path: path.to_owned(),
            },
        )
        .unwrap()
}

fn fixture(name: &str) -> String {
    fixture_path(name).to_string_lossy().into_owned()
}

async fn availability(allow_local_paths: bool, storage: Storage) -> Value {
    let server = spawn_test_server_with_storage(allow_local_paths, storage).await;
    let response = server
        .get(&format!("/projects/{PROJECT}/media/availability"))
        .await;
    assert_eq!(response.status, 200, "{}", response.text());
    response.json()
}

fn entry(media_file: &MediaFile, availability: &str) -> Value {
    json!({ "media_files": [{ "media_id": media_file.id.0, "availability": availability }] })
}

#[tokio::test(flavor = "multi_thread")]
async fn reports_an_existing_file_as_available() {
    let storage = seeded_storage();
    let added = add_path_file(&storage, &fixture("sample.mp4"));
    assert_eq!(
        availability(true, storage).await,
        entry(&added, "available")
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn reports_a_file_that_no_longer_exists_as_missing() {
    let storage = seeded_storage();
    let added = add_path_file(&storage, &fixture("missing.mp4"));
    assert_eq!(availability(true, storage).await, entry(&added, "missing"));
}

#[tokio::test(flavor = "multi_thread")]
async fn reports_a_file_as_not_allowed_when_local_paths_are_not_allowed() {
    let storage = seeded_storage();
    let added = add_path_file(&storage, &fixture("sample.mp4"));
    assert_eq!(
        availability(false, storage).await,
        entry(&added, "not_allowed")
    );
}

/// A file without read permission still opens for the root user, so this test fails when
/// run as root.
#[cfg(unix)]
#[tokio::test(flavor = "multi_thread")]
async fn reports_a_file_without_read_permission_as_unreadable() {
    use std::os::unix::fs::PermissionsExt;

    let dir = tempfile::tempdir().unwrap();
    let file = dir.path().join("locked.mp4");
    std::fs::write(&file, b"").unwrap();
    std::fs::set_permissions(&file, std::fs::Permissions::from_mode(0o000)).unwrap();
    let storage = seeded_storage();
    let added = add_path_file(&storage, &file.to_string_lossy());
    assert_eq!(
        availability(true, storage).await,
        entry(&added, "unreadable")
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn leaves_out_a_browser_file() {
    let storage = seeded_storage();
    storage
        .add_media_file(
            &ProjectId(PROJECT.to_string()),
            "clip.webm",
            &MediaFileSource::BrowserFile {
                size: 48822,
                last_modified_ms: 1700000000000,
            },
        )
        .unwrap();
    assert_eq!(
        availability(true, storage).await,
        json!({ "media_files": [] })
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn answers_an_empty_list_for_a_project_without_media() {
    assert_eq!(
        availability(true, seeded_storage()).await,
        json!({ "media_files": [] })
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn answers_not_found_for_an_unknown_project() {
    let server = spawn_test_server_with_storage(true, seeded_storage()).await;
    let response = server.get("/projects/missing/media/availability").await;
    assert_eq!(response.status, 404);
}

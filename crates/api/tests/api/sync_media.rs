//! Media copies moving between a device and the server it is linked to.

use std::time::Duration;

use easyimmerse_api::{ApiConfig, ServeOptions};
use easyimmerse_storage::Storage;
use serde_json::{Value, json};
use tempfile::TempDir;

use crate::stored_copies::{browser_media, put_copy, server_with_uploads};
use crate::support::{TOKEN, TestServer, fixture_path, read_fixture, spawn_configured_test_server};
use crate::sync::{account_token, link, send_as, settings, status, sync_round, wait_for};

const FIXTURE: &str = "conversion-tone.ogg";

/// A device whose built-in server keeps copies beside its media directory, as the desktop app's does.
async fn device_with_uploads() -> (TestServer, TempDir) {
    let dir = tempfile::tempdir().unwrap();
    let options = ServeOptions {
        media_dir: Some(dir.path().join("media")),
        ..ServeOptions::default()
    };
    let configure = |port| ApiConfig::for_loopback(port, TOKEN.to_string(), true);
    let storage = Storage::open_in_memory().unwrap();
    (
        spawn_configured_test_server(configure, storage, options).await,
        dir,
    )
}

/// A remote where a library user may keep `library_quota` bytes, and a device linked to a new account there.
async fn linked_with_uploads(library_quota: u64) -> (TestServer, TempDir, TestServer, TempDir) {
    let (remote, remote_dir) = server_with_uploads(library_quota).await;
    let (device, device_dir) = device_with_uploads().await;
    let response = link(&device, &remote, "signup").await;
    assert_eq!(response.status, 200, "{}", response.text());
    (remote, remote_dir, device, device_dir)
}

/// A project of the device with the fixture as a media file chosen for a copy on the server; their ids.
async fn chosen_media(device: &TestServer) -> (String, String) {
    let project = device.post_json("/projects", &settings("Musik")).await;
    let project = project.json()["id"].as_str().unwrap().to_string();
    let body = json!({
        "name": FIXTURE,
        "source": { "kind": "path", "path": fixture_path(FIXTURE).to_string_lossy() },
    });
    let media = device
        .post_json(&format!("/projects/{project}/media"), &body)
        .await;
    assert_eq!(media.status, 201, "{}", media.text());
    let media = media.json()["id"].as_str().unwrap().to_string();
    let path = format!("/projects/{project}/media/{media}/upload-choice");
    let chosen = device
        .request("PUT", &path)
        .json(&json!({ "is_upload_chosen": true }))
        .send()
        .await;
    assert_eq!(chosen.status, 200, "{}", chosen.text());
    (project, media)
}

async fn remote_storage(remote: &TestServer, token: &str) -> Value {
    send_as(remote, token, "GET", "/storage", None).await.json()
}

mod uploads {
    use super::*;

    /// A device that uploaded its chosen media file in one round.
    async fn uploaded() -> (TestServer, TempDir, TestServer, TempDir, String, String) {
        let (remote, remote_dir, device, device_dir) = linked_with_uploads(1_000_000).await;
        let (project, media) = chosen_media(&device).await;
        sync_round(&device).await;
        (remote, remote_dir, device, device_dir, project, media)
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_chosen_media_file_reaches_the_remote() {
        let (remote, _rd, _device, _dd, project, media) = uploaded().await;
        let token = account_token(&remote).await;
        let path = format!("/projects/{project}/media/{media}/stored-copy");
        let copy = send_as(&remote, &token, "GET", &path, None).await;
        assert_eq!(copy.bytes, read_fixture(FIXTURE));
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_second_round_does_not_upload_again() {
        let (remote, _rd, device, _dd, ..) = uploaded().await;
        let token = account_token(&remote).await;
        let before = remote_storage(&remote, &token).await["copies"][0]["stored_at_ms"].clone();
        tokio::time::sleep(Duration::from_millis(5)).await;
        sync_round(&device).await;
        let after = remote_storage(&remote, &token).await["copies"][0]["stored_at_ms"].clone();
        assert_eq!(after, before);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn the_round_ends_without_a_transfer() {
        let (_remote, _rd, device, ..) = uploaded().await;
        assert_eq!(status(&device).await["link"]["transfer"], Value::Null);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn turning_the_choice_off_deletes_the_remotes_copy() {
        let (remote, _rd, device, _dd, project, media) = uploaded().await;
        let path = format!("/projects/{project}/media/{media}/upload-choice");
        device
            .request("PUT", &path)
            .json(&json!({ "is_upload_chosen": false }))
            .send()
            .await;
        sync_round(&device).await;
        let token = account_token(&remote).await;
        assert_eq!(remote_storage(&remote, &token).await["copies"], json!([]));
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_media_file_past_the_quota_fails_the_link_with_quota_exceeded() {
        let (_remote, _rd, device, _dd) = linked_with_uploads(10).await;
        chosen_media(&device).await;
        device.request("POST", "/sync/run").send().await;
        let status = wait_for(&device, |status| {
            status["link"]["state"]["kind"] == "failed"
        })
        .await;
        assert_eq!(status["link"]["state"]["code"], "quota_exceeded");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_media_file_past_the_quota_still_lets_its_row_through() {
        let (remote, _rd, device, _dd) = linked_with_uploads(10).await;
        let (project, _) = chosen_media(&device).await;
        device.request("POST", "/sync/run").send().await;
        wait_for(&device, |status| {
            status["link"]["state"]["kind"] == "failed"
        })
        .await;
        let token = account_token(&remote).await;
        let media = send_as(
            &remote,
            &token,
            "GET",
            &format!("/projects/{project}/media"),
            None,
        )
        .await;
        assert_eq!(media.json()["media_files"][0]["name"], FIXTURE);
    }
}

mod fetching {
    use super::*;

    /// The account's media file on the remote, uploaded from a browser, and pulled to the device as a row.
    async fn copy_on_the_remote() -> (TestServer, TempDir, TestServer, TempDir, String, String) {
        let (remote, remote_dir, device, device_dir) = linked_with_uploads(1_000).await;
        let token = account_token(&remote).await;
        let (project, media) = browser_media(&remote, &token).await;
        let response = put_copy(&remote, &token, &project, &media, b"0123456789").await;
        assert_eq!(response.status, 200, "{}", response.text());
        sync_round(&device).await;
        (remote, remote_dir, device, device_dir, project, media)
    }

    async fn fetch(
        device: &TestServer,
        project: &str,
        media: &str,
    ) -> crate::support::TestResponse {
        let path = format!("/projects/{project}/media/{media}/stored-copy/fetch");
        device.request("POST", &path).send().await
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn fetching_stores_the_remotes_copy_here() {
        let (_r, _rd, device, _dd, project, media) = copy_on_the_remote().await;
        let response = fetch(&device, &project, &media).await;
        assert_eq!(response.json()["size_bytes"], 10, "{}", response.text());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_fetched_copy_makes_the_media_file_available() {
        let (_r, _rd, device, _dd, project, media) = copy_on_the_remote().await;
        fetch(&device, &project, &media).await;
        let path = format!("/projects/{project}/media/availability");
        let availability = device.get(&path).await.json();
        assert_eq!(
            availability["media_files"][0]["availability"],
            "stored_copy"
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_fetched_copy_streams_on_the_device() {
        let (_r, _rd, device, _dd, project, media) = copy_on_the_remote().await;
        fetch(&device, &project, &media).await;
        let stream = device
            .get(&format!("/projects/{project}/media/{media}/stream"))
            .await;
        assert_eq!(stream.bytes, b"0123456789");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn fetching_a_media_file_the_remote_keeps_no_copy_of_is_not_found() {
        let (remote, _rd, device, _dd) = linked_with_uploads(1_000).await;
        let token = account_token(&remote).await;
        let (project, media) = browser_media(&remote, &token).await;
        sync_round(&device).await;
        let response = fetch(&device, &project, &media).await;
        assert_eq!(response.json()["code"], "no_stored_copy");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn fetching_without_a_link_is_not_linked() {
        let (device, _dir) = device_with_uploads().await;
        let (project, media) = browser_media(&device, TOKEN).await;
        let response = fetch(&device, &project, &media).await;
        assert_eq!(response.json()["code"], "not_linked");
    }
}

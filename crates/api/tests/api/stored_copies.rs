//! Copies of media bytes a server keeps: uploads, the quota, the choice to keep a copy, and the storage status.

use easyimmerse_api::{AccountsConfig, ApiConfig, ServeOptions, UploadsConfig};
use easyimmerse_storage::Storage;
use serde_json::{Value, json};
use tempfile::TempDir;

use crate::support::{
    TOKEN, TestResponse, TestServer, spawn_configured_test_server, spawn_test_server,
};
use crate::sync::{send_as, settings};

const BYTES: &[u8] = b"0123456789";

/// A server with accounts that keeps copies in a new directory, which a library user may fill with `library_quota` bytes.
pub(crate) async fn server_with_uploads(library_quota: u64) -> (TestServer, TempDir) {
    let dir = tempfile::tempdir().unwrap();
    let uploads = UploadsConfig {
        dir: dir.path().join("uploads"),
        account_quota_bytes: Some(1_000_000),
        library_user_quota_bytes: library_quota,
    };
    let configure = |port| ApiConfig {
        accounts: Some(AccountsConfig { open_signup: true }),
        uploads: Some(uploads),
        ..ApiConfig::for_loopback(port, TOKEN.to_string(), true)
    };
    let storage = Storage::open_in_memory().unwrap();
    let server = spawn_configured_test_server(configure, storage, ServeOptions::default()).await;
    (server, dir)
}

pub(crate) async fn sign_up(server: &TestServer, email: &str) -> String {
    let body = json!({ "email": email, "password": "correct horse" });
    let response = server
        .request("POST", "/auth/signup")
        .without_token()
        .json(&body)
        .send()
        .await;
    response.json()["token"].as_str().unwrap().to_string()
}

/// A project with one media file the browser holds, created by the token's holder; their ids.
pub(crate) async fn browser_media(server: &TestServer, token: &str) -> (String, String) {
    let project = send_as(server, token, "POST", "/projects", Some(&settings("Filme"))).await;
    let project = project.json()["id"].as_str().unwrap().to_string();
    let body = json!({
        "name": "film.mp4",
        "source": { "kind": "browser_file", "size": BYTES.len(), "last_modified_ms": 1 },
    });
    let path = format!("/projects/{project}/media");
    let media = send_as(server, token, "POST", &path, Some(&body)).await;
    assert_eq!(media.status, 201, "{}", media.text());
    (project, media.json()["id"].as_str().unwrap().to_string())
}

pub(crate) async fn put_copy(
    server: &TestServer,
    token: &str,
    project: &str,
    media: &str,
    bytes: &[u8],
) -> TestResponse {
    server
        .request(
            "PUT",
            &format!("/projects/{project}/media/{media}/stored-copy"),
        )
        .with_token(token)
        .header("Content-Type", "application/octet-stream")
        .body(bytes.to_vec())
        .send()
        .await
}

async fn choose_upload(
    server: &TestServer,
    token: &str,
    project: &str,
    media: &str,
    is_upload_chosen: bool,
) -> TestResponse {
    let path = format!("/projects/{project}/media/{media}/upload-choice");
    let body = json!({ "is_upload_chosen": is_upload_chosen });
    send_as(server, token, "PUT", &path, Some(&body)).await
}

fn files_in(dir: &TempDir) -> Vec<String> {
    match std::fs::read_dir(dir.path().join("uploads")) {
        Ok(entries) => entries
            .map(|entry| entry.unwrap().file_name().to_string_lossy().into_owned())
            .collect(),
        Err(_) => Vec::new(),
    }
}

/// A library user with room for the test bytes, who uploaded them as the copy of a browser file.
async fn uploaded() -> (TestServer, TempDir, String, String, String) {
    let (server, dir) = server_with_uploads(100).await;
    let token = sign_up(&server, "reader@example.com").await;
    let (project, media) = browser_media(&server, &token).await;
    let response = put_copy(&server, &token, &project, &media, BYTES).await;
    assert_eq!(response.status, 200, "{}", response.text());
    (server, dir, token, project, media)
}

async fn media_file(server: &TestServer, token: &str, project: &str) -> Value {
    let path = format!("/projects/{project}/media");
    send_as(server, token, "GET", &path, None).await.json()["media_files"][0].clone()
}

mod uploads {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn a_copy_within_the_quota_is_stored() {
        let (_server, dir, ..) = uploaded().await;
        assert_eq!(files_in(&dir).len(), 1);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_copy_past_the_quota_is_refused() {
        let (server, _dir) = server_with_uploads(5).await;
        let token = sign_up(&server, "reader@example.com").await;
        let (project, media) = browser_media(&server, &token).await;
        let response = put_copy(&server, &token, &project, &media, BYTES).await;
        assert_eq!(response.json()["code"], "quota_exceeded");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_refused_copy_leaves_no_file() {
        let (server, dir) = server_with_uploads(5).await;
        let token = sign_up(&server, "reader@example.com").await;
        let (project, media) = browser_media(&server, &token).await;
        put_copy(&server, &token, &project, &media, BYTES).await;
        assert!(files_in(&dir).is_empty());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn the_launch_token_has_no_quota() {
        let (server, _dir) = server_with_uploads(0).await;
        let (project, media) = browser_media(&server, TOKEN).await;
        let response = put_copy(&server, TOKEN, &project, &media, BYTES).await;
        assert_eq!(response.status, 200, "{}", response.text());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_server_without_uploads_keeps_no_copies() {
        let server = spawn_test_server(false).await;
        let (project, media) = browser_media(&server, TOKEN).await;
        // The server refuses before reading the body, and on Windows closing a socket with unread bytes resets the connection.
        let response = put_copy(&server, TOKEN, &project, &media, b"").await;
        assert_eq!(response.json()["code"], "uploads_unavailable");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn another_accounts_media_file_is_not_found() {
        let (server, _dir, _, project, media) = uploaded().await;
        let other = sign_up(&server, "other@example.com").await;
        let response = put_copy(&server, &other, &project, &media, BYTES).await;
        assert_eq!(response.status, 404);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn an_upload_records_the_choice_to_keep_a_copy() {
        let (server, _dir, token, project, _) = uploaded().await;
        assert_eq!(
            media_file(&server, &token, &project).await["is_upload_chosen"],
            true
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn an_uploaded_media_file_has_a_stored_copy() {
        let (server, _dir, token, project, _) = uploaded().await;
        assert_eq!(
            media_file(&server, &token, &project).await["has_stored_copy"],
            true
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_second_upload_replaces_the_first_file() {
        let (server, dir, token, project, media) = uploaded().await;
        put_copy(&server, &token, &project, &media, b"abc").await;
        assert_eq!(files_in(&dir).len(), 1);
    }
}

mod playing {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn a_stored_copy_is_served_back() {
        let (server, _dir, token, project, media) = uploaded().await;
        let path = format!("/projects/{project}/media/{media}/stored-copy");
        assert_eq!(
            send_as(&server, &token, "GET", &path, None).await.bytes,
            BYTES
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_stored_copy_streams_through_the_media_stream() {
        let (server, _dir, token, project, media) = uploaded().await;
        let path = format!("/projects/{project}/media/{media}/stream");
        assert_eq!(
            send_as(&server, &token, "GET", &path, None).await.bytes,
            BYTES
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_media_file_without_a_copy_has_none_to_serve() {
        let (server, _dir) = server_with_uploads(100).await;
        let token = sign_up(&server, "reader@example.com").await;
        let (project, media) = browser_media(&server, &token).await;
        let path = format!("/projects/{project}/media/{media}/stored-copy");
        let response = send_as(&server, &token, "GET", &path, None).await;
        assert_eq!(response.json()["code"], "no_stored_copy");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn availability_reports_a_browser_file_with_a_copy_as_stored() {
        let (server, _dir, token, project, _) = uploaded().await;
        let path = format!("/projects/{project}/media/availability");
        let response = send_as(&server, &token, "GET", &path, None).await;
        assert_eq!(
            response.json()["media_files"][0]["availability"],
            "stored_copy"
        );
    }
}

mod choice {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn turning_the_choice_off_deletes_the_file() {
        let (server, dir, token, project, media) = uploaded().await;
        choose_upload(&server, &token, &project, &media, false).await;
        assert!(files_in(&dir).is_empty());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn turning_the_choice_off_leaves_no_stored_copy() {
        let (server, _dir, token, project, media) = uploaded().await;
        let response = choose_upload(&server, &token, &project, &media, false).await;
        assert_eq!(response.json()["has_stored_copy"], false);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn turning_the_choice_on_records_it() {
        let (server, _dir) = server_with_uploads(100).await;
        let token = sign_up(&server, "reader@example.com").await;
        let (project, media) = browser_media(&server, &token).await;
        let response = choose_upload(&server, &token, &project, &media, true).await;
        assert_eq!(response.json()["is_upload_chosen"], true);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn deleting_the_media_file_deletes_its_copy_in_time() {
        let (server, dir, token, project, media) = uploaded().await;
        let path = format!("/projects/{project}/media/{media}");
        send_as(&server, &token, "DELETE", &path, None).await;
        // Removing the next copy deletes every released file, the deleted media file's among them.
        let (other_project, other_media) = browser_media(&server, &token).await;
        put_copy(&server, &token, &other_project, &other_media, BYTES).await;
        choose_upload(&server, &token, &other_project, &other_media, false).await;
        assert!(files_in(&dir).is_empty());
    }
}

mod storage_status {
    use super::*;

    async fn storage(server: &TestServer, token: &str) -> Value {
        send_as(server, token, "GET", "/storage", None).await.json()
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn lists_the_copies_with_their_sizes() {
        let (server, _dir, token, ..) = uploaded().await;
        assert_eq!(
            storage(&server, &token).await["copies"][0]["size_bytes"],
            10
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn names_the_project_of_each_copy() {
        let (server, _dir, token, ..) = uploaded().await;
        assert_eq!(
            storage(&server, &token).await["copies"][0]["project_name"],
            "Filme"
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn sums_the_bytes_used() {
        let (server, _dir, token, ..) = uploaded().await;
        assert_eq!(storage(&server, &token).await["used_bytes"], 10);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn reports_a_library_users_quota() {
        let (server, _dir, token, ..) = uploaded().await;
        assert_eq!(storage(&server, &token).await["quota_bytes"], 100);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn reports_no_quota_for_the_launch_token() {
        let (server, _dir) = server_with_uploads(100).await;
        assert_eq!(storage(&server, TOKEN).await["quota_bytes"], Value::Null);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn another_accounts_copies_are_not_listed() {
        let (server, _dir, ..) = uploaded().await;
        let other = sign_up(&server, "other@example.com").await;
        assert_eq!(storage(&server, &other).await["copies"], json!([]));
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_server_without_uploads_reports_no_room() {
        let server = spawn_test_server(false).await;
        assert_eq!(storage(&server, TOKEN).await["quota_bytes"], 0);
    }
}

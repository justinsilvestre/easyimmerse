//! A built-in server syncing its own data with an account on a remote: two servers in one process.

use std::time::{Duration, SystemTime, UNIX_EPOCH};

use easyimmerse_storage::Storage;
use serde_json::{Value, json};

use crate::support::{
    TestResponse, TestServer, read_fixture, spawn_test_server_with_accounts,
    spawn_test_server_with_storage,
};

const EMAIL: &str = "reader@example.com";
const PASSWORD: &str = "correct horse";
/// How long a test waits for a round before it fails.
const ROUND_WAIT: Duration = Duration::from_secs(20);

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}

fn new_id() -> String {
    hex::encode(rand::random::<[u8; 16]>())
}

/// A remote with open sign-up, and a device with no data of its own yet.
async fn remote_and_device() -> (TestServer, TestServer) {
    let remote = spawn_test_server_with_accounts(true).await;
    let device = spawn_test_server_with_storage(false, Storage::open_in_memory().unwrap()).await;
    (remote, device)
}

async fn link(device: &TestServer, remote: &TestServer, mode: &str) -> TestResponse {
    let body = json!({
        "server_url": remote.base_url, "mode": mode, "email": EMAIL, "password": PASSWORD,
    });
    device.post_json("/sync/link", &body).await
}

/// A remote and a device linked to a new account on it.
async fn linked() -> (TestServer, TestServer) {
    let (remote, device) = remote_and_device().await;
    let response = link(&device, &remote, "signup").await;
    assert_eq!(response.status, 200, "{}", response.text());
    (remote, device)
}

/// Logs the account in on the remote, as the person would from another app, and returns the session token.
async fn account_token(remote: &TestServer) -> String {
    let body = json!({ "email": EMAIL, "password": PASSWORD });
    let response = remote
        .request("POST", "/auth/login")
        .without_token()
        .json(&body)
        .send()
        .await;
    response.json()["token"].as_str().unwrap().to_string()
}

async fn status(device: &TestServer) -> Value {
    device.get("/sync/status").await.json()
}

/// Asks for a round and waits for one that began after the request to finish.
async fn sync_round(device: &TestServer) -> Value {
    let requested_at_ms = now_ms();
    let response = device.request("POST", "/sync/run").send().await;
    assert_eq!(response.status, 202, "{}", response.text());
    wait_for(device, |status| {
        let link = &status["link"];
        link["state"]["kind"] == "idle"
            && link["last_synced_at_ms"]
                .as_u64()
                .is_some_and(|at| at >= requested_at_ms)
    })
    .await
}

async fn wait_for(device: &TestServer, is_done: impl Fn(&Value) -> bool) -> Value {
    let deadline = std::time::Instant::now() + ROUND_WAIT;
    loop {
        let status = status(device).await;
        if is_done(&status) {
            return status;
        }
        assert!(
            std::time::Instant::now() < deadline,
            "syncing did not get there: {status}"
        );
        tokio::time::sleep(Duration::from_millis(20)).await;
    }
}

async fn send_as(
    server: &TestServer,
    token: &str,
    method: &'static str,
    path: &str,
    body: Option<&Value>,
) -> TestResponse {
    let request = server.request(method, path).with_token(token);
    match body {
        Some(body) => request.json(body).send().await,
        None => request.send().await,
    }
}

fn settings(name: &str) -> Value {
    json!({
        "name": name,
        "target_language": "de",
        "translation_language": "en",
        "flashcard_fields": ["word"],
        "default_tags": [],
        "tags_media_name": false,
        "fills_audio_with_tts": false,
        "flashcard_front_fields": ["word"],
        "lists_anki_deletions": true,
    })
}

fn draft(word: &str) -> Value {
    json!({
        "media_file_id": null,
        "cue_index": 0,
        "word_start": 0,
        "content": {
            "word": word, "word_pronunciation": "", "l1_definition": "", "l2_definition": "",
            "text_context": "", "text_context_translation": "", "text_context_pronunciation": "",
            "audio_context": null, "screenshot": null, "tags": [],
        },
        "included_fields": ["word"],
    })
}

/// Creates a project with one flashcard through the routes, as the token's holder, and returns their ids.
async fn create_project_with_flashcard(server: &TestServer, token: &str) -> (String, String) {
    let project = send_as(
        server,
        token,
        "POST",
        "/projects",
        Some(&settings("Deutsch")),
    )
    .await;
    let project = project.json()["id"].as_str().unwrap().to_string();
    let flashcard = new_id();
    let body = json!({ "id": flashcard, "draft": draft("Haus") });
    let path = format!("/projects/{project}/flashcards");
    let response = send_as(server, token, "POST", &path, Some(&body)).await;
    assert_eq!(response.status, 201, "{}", response.text());
    (project, flashcard)
}

async fn edit_flashcard(
    server: &TestServer,
    token: &str,
    project: &str,
    flashcard: &str,
    word: &str,
) {
    let path = format!("/projects/{project}/flashcards/{flashcard}");
    let response = send_as(server, token, "PUT", &path, Some(&draft(word))).await;
    assert_eq!(response.status, 200, "{}", response.text());
}

/// The account's rows on the remote.
async fn remote_rows(remote: &TestServer, token: &str) -> Value {
    send_as(
        remote,
        token,
        "GET",
        "/sync/changes?since=0&limit=2000",
        None,
    )
    .await
    .json()
}

async fn remote_word(remote: &TestServer, token: &str, project: &str) -> Value {
    let path = format!("/projects/{project}/flashcards");
    send_as(remote, token, "GET", &path, None).await.json()["flashcards"][0]["content"]["word"]
        .clone()
}

mod linking {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn the_status_shows_the_linked_account() {
        let (_remote, device) = linked().await;
        assert_eq!(status(&device).await["link"]["account_email"], EMAIL);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_first_round_finishes() {
        let (_remote, device) = linked().await;
        let status = sync_round(&device).await;
        assert_eq!(status["link"]["state"], json!({ "kind": "idle" }));
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn linking_again_over_a_live_link_is_refused() {
        let (remote, device) = linked().await;
        let response = link(&device, &remote, "login").await;
        assert_eq!(response.json()["code"], "already_linked");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn wrong_credentials_pass_the_remotes_refusal_through() {
        let (remote, device) = linked().await;
        device.delete("/sync/link").await;
        let body = json!({
            "server_url": remote.base_url, "mode": "login", "email": EMAIL, "password": "wrong password",
        });
        let response = device.post_json("/sync/link", &body).await;
        assert_eq!(response.json()["code"], "invalid_credentials");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn an_unreachable_server_is_reported() {
        let (_remote, device) = remote_and_device().await;
        let body = json!({
            "server_url": "http://127.0.0.1:9", "mode": "login", "email": EMAIL, "password": PASSWORD,
        });
        let response = device.post_json("/sync/link", &body).await;
        assert_eq!(response.json()["code"], "remote_unreachable");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn unlinking_removes_the_link() {
        let (_remote, device) = linked().await;
        let response = device.delete("/sync/link").await;
        assert_eq!(response.status, 204);
        assert_eq!(status(&device).await["link"], Value::Null);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn unlinking_logs_the_device_out_of_the_remote() {
        let (remote, device) = linked().await;
        device.delete("/sync/link").await;
        let token = account_token(&remote).await;
        let sessions = send_as(&remote, &token, "GET", "/auth/sessions", None)
            .await
            .json();
        assert_eq!(sessions["sessions"].as_array().unwrap().len(), 1);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn the_remote_names_the_device_by_its_user_agent() {
        let (remote, _device) = linked().await;
        let token = account_token(&remote).await;
        let sessions = send_as(&remote, &token, "GET", "/auth/sessions", None)
            .await
            .json();
        let named = sessions["sessions"]
            .as_array()
            .unwrap()
            .iter()
            .any(|session| {
                session["user_agent"]
                    .as_str()
                    .unwrap()
                    .starts_with("easyImmerse/")
            });
        assert!(named);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn unlinking_without_a_link_is_not_found() {
        let (_remote, device) = remote_and_device().await;
        let response = device.delete("/sync/link").await;
        assert_eq!(response.json()["code"], "not_linked");
    }
}

mod rounds {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn a_flashcard_made_on_the_device_reaches_the_remote() {
        let (remote, device) = linked().await;
        let (_, flashcard) = create_project_with_flashcard(&device, &device.token).await;
        sync_round(&device).await;
        let token = account_token(&remote).await;
        let rows = remote_rows(&remote, &token).await;
        let found = rows["rows"]
            .as_array()
            .unwrap()
            .iter()
            .any(|row| row["key"] == flashcard);
        assert!(found);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_pushed_project_is_backed_up() {
        let (_remote, device) = linked().await;
        let (project, _) = create_project_with_flashcard(&device, &device.token).await;
        sync_round(&device).await;
        let response = device.get(&format!("/projects/{project}")).await;
        assert_eq!(response.json()["is_backed_up"], true);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_project_made_on_the_remote_reaches_the_device() {
        let (remote, device) = linked().await;
        let token = account_token(&remote).await;
        let (project, _) = create_project_with_flashcard(&remote, &token).await;
        sync_round(&device).await;
        let response = device.get(&format!("/projects/{project}")).await;
        assert_eq!(response.status, 200, "{}", response.text());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_pulled_row_is_not_pushed_back() {
        let (remote, device) = linked().await;
        let token = account_token(&remote).await;
        create_project_with_flashcard(&remote, &token).await;
        let before = remote_rows(&remote, &token).await["next_cursor"].clone();
        sync_round(&device).await;
        sync_round(&device).await;
        assert_eq!(remote_rows(&remote, &token).await["next_cursor"], before);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_round_that_pulls_rows_raises_the_pulled_revision() {
        let (remote, device) = linked().await;
        let token = account_token(&remote).await;
        create_project_with_flashcard(&remote, &token).await;
        let status = sync_round(&device).await;
        assert!(status["pulled_revision"].as_u64().unwrap() > 0);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_pulled_dictionary_waits_without_failing_the_round() {
        let (remote, device) = linked().await;
        let token = account_token(&remote).await;
        import_dictionary(&remote, &token).await;
        let status = sync_round(&device).await;
        assert_eq!(status["link"]["state"], json!({ "kind": "idle" }));
    }

    async fn import_dictionary(remote: &TestServer, token: &str) {
        let started = remote
            .request("POST", "/dictionaries?fileName=sample-yomitan.zip")
            .with_token(token)
            .header("Content-Type", "application/octet-stream")
            .body(read_fixture("sample-yomitan.zip"))
            .send()
            .await;
        let id = started.json()["id"].as_str().unwrap().to_string();
        let path = format!("/dictionaries/imports/{id}");
        while send_as(remote, token, "GET", &path, None).await.json()["state"] == "running" {
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
    }
}

mod conflicts {
    use super::*;

    /// A flashcard copied to the remote, then edited there and, a moment later, on the device.
    async fn edited_on_both_sides() -> (TestServer, TestServer, String, String) {
        let (remote, device) = linked().await;
        let (project, flashcard) = create_project_with_flashcard(&device, &device.token).await;
        sync_round(&device).await;
        let token = account_token(&remote).await;
        edit_flashcard(&remote, &token, &project, &flashcard, "Baum").await;
        tokio::time::sleep(Duration::from_millis(5)).await;
        edit_flashcard(&device, &device.token, &project, &flashcard, "Garten").await;
        (remote, device, token, project)
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn edits_on_both_sides_make_one_conflict() {
        let (_remote, device, ..) = edited_on_both_sides().await;
        let status = sync_round(&device).await;
        assert_eq!(status["link"]["conflict_count"], 1);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn the_newer_edit_is_kept_on_the_remote() {
        let (remote, device, token, project) = edited_on_both_sides().await;
        sync_round(&device).await;
        assert_eq!(remote_word(&remote, &token, &project).await, "Garten");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn the_conflict_says_this_devices_change_was_kept() {
        let (_remote, device, ..) = edited_on_both_sides().await;
        let status = sync_round(&device).await;
        assert_eq!(status["link"]["conflicts"][0]["kept"], "this_device");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn dismissing_forgets_the_conflicts() {
        let (_remote, device, ..) = edited_on_both_sides().await;
        sync_round(&device).await;
        device.delete("/sync/conflicts").await;
        assert_eq!(status(&device).await["link"]["conflict_count"], 0);
    }
}

mod logged_out {
    use super::*;

    /// Ends the device's session on the remote, as the person would from another device.
    async fn end_device_session(remote: &TestServer) {
        let token = account_token(remote).await;
        let sessions = send_as(remote, &token, "GET", "/auth/sessions", None)
            .await
            .json();
        for session in sessions["sessions"].as_array().unwrap() {
            if session["is_current"] == false {
                let path = format!("/auth/sessions/{}", session["id"].as_str().unwrap());
                send_as(remote, &token, "DELETE", &path, None).await;
            }
        }
    }

    async fn logged_out_device() -> (TestServer, TestServer) {
        let (remote, device) = linked().await;
        sync_round(&device).await;
        end_device_session(&remote).await;
        device.request("POST", "/sync/run").send().await;
        wait_for(&device, |status| {
            status["link"]["state"]["kind"] == "logged_out"
        })
        .await;
        (remote, device)
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_session_ended_on_the_remote_logs_the_link_out() {
        let (_remote, device) = logged_out_device().await;
        let status = status(&device).await;
        assert_eq!(status["link"]["state"], json!({ "kind": "logged_out" }));
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn the_proxy_answers_a_logged_out_link_with_its_own_code() {
        let (_remote, device) = logged_out_device().await;
        let response = device.get("/sync/remote/auth/me").await;
        assert_eq!(response.json()["code"], "remote_logged_out");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn logging_in_again_restores_syncing() {
        let (remote, device) = logged_out_device().await;
        let response = link(&device, &remote, "login").await;
        assert_eq!(response.status, 200, "{}", response.text());
        let status = sync_round(&device).await;
        assert_eq!(status["link"]["state"], json!({ "kind": "idle" }));
    }
}

mod proxy {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn forwards_the_current_principal() {
        let (_remote, device) = linked().await;
        let response = device.get("/sync/remote/auth/me").await;
        assert_eq!(response.json()["user"]["email"], EMAIL);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn forwards_the_sessions() {
        let (_remote, device) = linked().await;
        let response = device.get("/sync/remote/auth/sessions").await;
        assert_eq!(response.json()["sessions"].as_array().unwrap().len(), 1);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn refuses_a_data_route() {
        let (_remote, device) = linked().await;
        let response = device.get("/sync/remote/projects").await;
        assert_eq!(response.json()["code"], "not_proxied");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn answers_not_linked_without_a_link() {
        let (_remote, device) = remote_and_device().await;
        let response = device.get("/sync/remote/auth/me").await;
        assert_eq!(response.json()["code"], "not_linked");
    }
}

mod accounts {
    use super::*;

    async fn signed_up(remote: &TestServer) -> String {
        let body = json!({ "email": EMAIL, "password": PASSWORD });
        let response = remote
            .request("POST", "/auth/signup")
            .without_token()
            .json(&body)
            .send()
            .await;
        response.json()["token"].as_str().unwrap().to_string()
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn an_account_may_not_link() {
        let remote = spawn_test_server_with_accounts(true).await;
        let token = signed_up(&remote).await;
        let body = json!({
            "server_url": "http://127.0.0.1:9", "mode": "login", "email": EMAIL, "password": PASSWORD,
        });
        let response = send_as(&remote, &token, "POST", "/sync/link", Some(&body)).await;
        assert_eq!(response.status, 403);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn an_account_sees_no_link() {
        let remote = spawn_test_server_with_accounts(true).await;
        let token = signed_up(&remote).await;
        let response = send_as(&remote, &token, "GET", "/sync/status", None).await;
        assert_eq!(response.json()["link"], Value::Null);
    }
}

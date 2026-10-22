//! Whole dictionaries moving between servers: the content routes every server has, and the engine that uses them.

use std::time::Duration;

use serde_json::{Value, json};

use crate::dictionaries::{import_fixture, percent_encode};
use crate::support::{TestResponse, TestServer, read_fixture, spawn_test_server_with_accounts};
use crate::sync::{account_token, linked, send_as, sync_round};

fn content_path(id: &str) -> String {
    format!("/sync/dictionaries/{id}/content")
}

/// The fixture imported by the token's holder, with its id.
async fn import_as(server: &TestServer, token: &str) -> String {
    let started = server
        .request("POST", "/dictionaries?fileName=sample-yomitan.zip")
        .with_token(token)
        .header("Content-Type", "application/octet-stream")
        .body(read_fixture("sample-yomitan.zip"))
        .send()
        .await;
    let job = started.json()["id"].as_str().unwrap().to_string();
    let path = format!("/dictionaries/imports/{job}");
    loop {
        let status = send_as(server, token, "GET", &path, None).await.json();
        if status["state"] != "running" {
            return status["dictionary"]["id"].as_str().unwrap().to_string();
        }
        tokio::time::sleep(Duration::from_millis(10)).await;
    }
}

async fn put_dump(server: &TestServer, token: &str, id: &str, dump: Vec<u8>) -> TestResponse {
    server
        .request("PUT", &content_path(id))
        .with_token(token)
        .header("Content-Type", "application/x-ndjson")
        .body(dump)
        .send()
        .await
}

fn lines(response: &TestResponse) -> Vec<Value> {
    response
        .text()
        .lines()
        .map(|line| serde_json::from_str(line).unwrap())
        .collect()
}

async fn look_up(server: &TestServer, token: &str, text: &str) -> Value {
    let path = format!(
        "/dictionaries/lookup?text={}&language=ja",
        percent_encode(text)
    );
    send_as(server, token, "GET", &path, None).await.json()
}

async fn dictionaries_of(server: &TestServer, token: &str) -> Vec<Value> {
    let listed = send_as(server, token, "GET", "/dictionaries", None).await;
    listed.json()["dictionaries"].as_array().unwrap().clone()
}

async fn sign_up(server: &TestServer, email: &str) -> String {
    let body = json!({ "email": email, "password": "correct horse" });
    let response = server
        .request("POST", "/auth/signup")
        .without_token()
        .json(&body)
        .send()
        .await;
    response.json()["token"].as_str().unwrap().to_string()
}

/// A server with two accounts, the first of which imported the fixture: its token, the second's, and the dictionary's id.
async fn two_accounts() -> (TestServer, String, String, String) {
    let server = spawn_test_server_with_accounts(true).await;
    let first = sign_up(&server, "first@example.com").await;
    let second = sign_up(&server, "second@example.com").await;
    let id = import_as(&server, &first).await;
    (server, first, second, id)
}

/// The fixture's dump, served by one server and stored by an account of another under the same id.
async fn copied_to_second_account() -> (TestServer, String, TestResponse) {
    let (server, first, _, id) = two_accounts().await;
    let dump = send_as(&server, &first, "GET", &content_path(&id), None).await;
    // Ids are unique on a server, so the dump is stored on a second server.
    let other = spawn_test_server_with_accounts(true).await;
    let token = sign_up(&other, "second@example.com").await;
    let stored = put_dump(&other, &token, &id, dump.bytes.clone()).await;
    (other, token, stored)
}

mod content_routes {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn a_dump_begins_with_the_dictionarys_metadata() {
        let (server, first, _, id) = two_accounts().await;
        let response = send_as(&server, &first, "GET", &content_path(&id), None).await;
        assert_eq!(
            lines(&response)[0]["metadata"]["title"],
            "Sample Dictionary"
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_dump_ends_with_an_end_line() {
        let (server, first, _, id) = two_accounts().await;
        let response = send_as(&server, &first, "GET", &content_path(&id), None).await;
        assert_eq!(lines(&response).last().unwrap()["kind"], "end");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_dump_is_served_as_ndjson() {
        let (server, first, _, id) = two_accounts().await;
        let response = send_as(&server, &first, "GET", &content_path(&id), None).await;
        assert_eq!(
            response.header("content-type"),
            Some("application/x-ndjson")
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn another_accounts_dictionary_is_not_found() {
        let (server, _, second, id) = two_accounts().await;
        let response = send_as(&server, &second, "GET", &content_path(&id), None).await;
        assert_eq!(response.status, 404);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_stored_dump_answers_created() {
        let (_, _, stored) = copied_to_second_account().await;
        assert_eq!(stored.status, 201, "{}", stored.text());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_stored_dump_answers_with_its_time() {
        let (_, _, stored) = copied_to_second_account().await;
        assert!(stored.json()["updated_at_ms"].as_u64().is_some());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_stored_dump_is_found_by_lookup() {
        let (server, token, _) = copied_to_second_account().await;
        assert_eq!(
            look_up(&server, &token, "猫").await["results"][0]["term"],
            "猫"
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_stored_dump_keeps_its_media() {
        let (server, token, _) = copied_to_second_account().await;
        let id = dictionaries_of(&server, &token).await[0]["id"]
            .as_str()
            .unwrap()
            .to_string();
        let path = format!("/dictionaries/{id}/media/images%2Fcat.png");
        let media = send_as(&server, &token, "GET", &path, None).await;
        assert_eq!(media.bytes.len(), 71);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn storing_a_dictionary_that_is_there_already_is_a_conflict() {
        let (server, first, _, id) = two_accounts().await;
        let dump = send_as(&server, &first, "GET", &content_path(&id), None).await;
        let response = put_dump(&server, &first, &id, dump.bytes.clone()).await;
        assert_eq!(response.json()["code"], "dictionary_exists");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_dump_cut_short_is_a_bad_dump() {
        let (server, first, _, id) = two_accounts().await;
        let dump = send_as(&server, &first, "GET", &content_path(&id), None).await;
        let text = dump.text();
        let cut: Vec<&str> = text.lines().take(3).collect();
        let other = spawn_test_server_with_accounts(true).await;
        let token = sign_up(&other, "first@example.com").await;
        let response = put_dump(&other, &token, &id, cut.join("\n").into_bytes()).await;
        assert_eq!(response.json()["code"], "bad_dump");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_dump_cut_short_stores_nothing() {
        let (server, first, _, id) = two_accounts().await;
        let dump = send_as(&server, &first, "GET", &content_path(&id), None).await;
        let text = dump.text();
        let cut: Vec<&str> = text.lines().take(3).collect();
        let other = spawn_test_server_with_accounts(true).await;
        let token = sign_up(&other, "first@example.com").await;
        put_dump(&other, &token, &id, cut.join("\n").into_bytes()).await;
        assert!(dictionaries_of(&other, &token).await.is_empty());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_body_that_is_not_a_dump_is_a_bad_dump() {
        let server = spawn_test_server_with_accounts(true).await;
        let token = sign_up(&server, "first@example.com").await;
        let response = put_dump(&server, &token, &"a".repeat(32), b"not json".to_vec()).await;
        assert_eq!(response.json()["code"], "bad_dump");
    }
}

mod engine {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn a_pulled_dictionary_becomes_searchable_on_the_device() {
        let (remote, device) = linked().await;
        let token = account_token(&remote).await;
        import_as(&remote, &token).await;
        sync_round(&device).await;
        let found = look_up(&device, &device.token, "猫").await;
        assert_eq!(found["results"][0]["term"], "猫");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_pulled_dictionary_keeps_its_id() {
        let (remote, device) = linked().await;
        let token = account_token(&remote).await;
        let id = import_as(&remote, &token).await;
        sync_round(&device).await;
        assert_eq!(dictionaries_of(&device, &device.token).await[0]["id"], id);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_device_dictionary_reaches_the_remote() {
        let (remote, device) = linked().await;
        let id = import_fixture(&device).await["id"].clone();
        sync_round(&device).await;
        let token = account_token(&remote).await;
        assert_eq!(dictionaries_of(&remote, &token).await[0]["id"], id);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_device_dictionary_is_searchable_on_the_remote() {
        let (remote, device) = linked().await;
        import_fixture(&device).await;
        sync_round(&device).await;
        let token = account_token(&remote).await;
        assert_eq!(
            look_up(&remote, &token, "猫").await["results"][0]["term"],
            "猫"
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_second_round_changes_nothing_on_the_remote() {
        let (remote, device) = linked().await;
        import_fixture(&device).await;
        sync_round(&device).await;
        let token = account_token(&remote).await;
        let changes = "/sync/changes?since=0&limit=2000";
        let before =
            send_as(&remote, &token, "GET", changes, None).await.json()["next_cursor"].clone();
        sync_round(&device).await;
        let after =
            send_as(&remote, &token, "GET", changes, None).await.json()["next_cursor"].clone();
        assert_eq!(after, before);
    }

    /// The account imported the fixture on the remote, and the device imported it too, under another id.
    async fn imported_on_both_sides() -> (TestServer, TestServer, String) {
        let (remote, device) = linked().await;
        let token = account_token(&remote).await;
        import_as(&remote, &token).await;
        import_fixture(&device).await;
        sync_round(&device).await;
        (remote, device, token)
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_dictionary_the_remote_has_under_its_title_stays_one_there() {
        let (remote, _device, token) = imported_on_both_sides().await;
        assert_eq!(dictionaries_of(&remote, &token).await.len(), 1);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_dictionary_the_device_has_under_its_title_stays_one_there() {
        let (_remote, device, _) = imported_on_both_sides().await;
        assert_eq!(dictionaries_of(&device, &device.token).await.len(), 1);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_dictionary_on_both_sides_leaves_the_round_idle() {
        let (_remote, device, _) = imported_on_both_sides().await;
        let status = sync_round(&device).await;
        assert_eq!(status["link"]["state"], json!({ "kind": "idle" }));
    }
}

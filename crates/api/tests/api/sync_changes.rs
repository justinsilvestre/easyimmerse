//! Pulling an owner's changes from a server and pushing a device's changes to it.

use std::time::{SystemTime, UNIX_EPOCH};

use serde_json::{Value, json};

use crate::support::{TestResponse, TestServer, spawn_test_server_with_accounts};

const DAY_MS: u64 = 24 * 60 * 60 * 1000;

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}

fn new_id() -> String {
    hex::encode(rand::random::<[u8; 16]>())
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

async fn send(
    server: &TestServer,
    token: &str,
    method: &'static str,
    path: &str,
    body: &Value,
) -> TestResponse {
    server
        .request(method, path)
        .with_token(token)
        .json(body)
        .send()
        .await
}

async fn get(server: &TestServer, token: &str, path: &str) -> TestResponse {
    server.request("GET", path).with_token(token).send().await
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

/// Creates a project through its route and returns its id.
async fn create_project(server: &TestServer, token: &str) -> String {
    let response = send(server, token, "POST", "/projects", &settings("Deutsch")).await;
    response.json()["id"].as_str().unwrap().to_string()
}

async fn create_flashcard(server: &TestServer, token: &str, project: &str) -> String {
    let id = new_id();
    let body = json!({
        "id": id,
        "draft": {
            "media_file_id": null,
            "cue_index": 0,
            "word_start": 0,
            "content": {
                "word": "Haus", "word_pronunciation": "", "l1_definition": "", "l2_definition": "",
                "text_context": "", "text_context_translation": "", "text_context_pronunciation": "",
                "audio_context": null, "screenshot": null, "tags": [],
            },
            "included_fields": ["word"],
        },
    });
    let path = format!("/projects/{project}/flashcards");
    let response = send(server, token, "POST", &path, &body).await;
    assert_eq!(response.status, 201, "{}", response.text());
    id
}

/// Every change of the principal, oldest first.
async fn all_rows(server: &TestServer, token: &str) -> Vec<Value> {
    let response = get(server, token, "/sync/changes?since=0&limit=2000").await;
    assert_eq!(response.status, 200, "{}", response.text());
    response.json()["rows"].as_array().unwrap().clone()
}

async fn row_of(server: &TestServer, token: &str, table: &str, key: &str) -> Option<Value> {
    all_rows(server, token)
        .await
        .into_iter()
        .find(|row| row["table"] == table && row["key"] == key)
}

async fn push(server: &TestServer, token: &str, rows: Vec<Value>) -> TestResponse {
    send(
        server,
        token,
        "POST",
        "/sync/changes",
        &json!({ "rows": rows }),
    )
    .await
}

/// Pushes one row and returns its outcome.
async fn push_one(server: &TestServer, token: &str, row: Value, base: Option<u64>) -> Value {
    let pushed = json!({ "row": row, "base_updated_at_ms": base });
    let response = push(server, token, vec![pushed]).await;
    assert_eq!(response.status, 200, "{}", response.text());
    response.json()["outcomes"][0].clone()
}

/// A project row as a device that made it would push it.
fn new_project_row(name: &str, updated_at_ms: u64) -> Value {
    let id = new_id();
    json!({
        "table": "projects",
        "key": id,
        "updated_at_ms": updated_at_ms,
        "is_deleted": false,
        "data": {
            "id": id,
            "name": name,
            "target_language": "de",
            "translation_language": "en",
            "flashcard_fields_json": "[\"word\"]",
            "default_tags_json": "[]",
            "tags_media_name": 0,
            "fills_audio_with_tts": 0,
            "flashcard_front_fields_json": "[\"word\"]",
            "lists_anki_deletions": 1,
            "created_at_ms": 1_000,
        },
    })
}

/// The project's row as the server has it, renamed and stamped at the given time.
async fn renamed_project(
    server: &TestServer,
    token: &str,
    project: &str,
    updated_at_ms: u64,
) -> (Value, u64) {
    let mut row = row_of(server, token, "projects", project).await.unwrap();
    let server_time = row["updated_at_ms"].as_u64().unwrap();
    row["data"]["name"] = json!("Renamed");
    row["updated_at_ms"] = json!(updated_at_ms);
    (row, server_time)
}

/// A server with one account, whose token is returned.
async fn server_with_account() -> (TestServer, String) {
    let server = spawn_test_server_with_accounts(true).await;
    let token = sign_up(&server, "reader@example.com").await;
    (server, token)
}

mod pulling {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn lists_a_project_the_account_made() {
        let (server, token) = server_with_account().await;
        let project = create_project(&server, &token).await;
        assert!(
            row_of(&server, &token, "projects", &project)
                .await
                .is_some()
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_page_smaller_than_the_changes_has_more() {
        let (server, token) = server_with_account().await;
        create_project(&server, &token).await;
        create_project(&server, &token).await;
        let response = get(&server, &token, "/sync/changes?limit=1").await;
        assert_eq!(response.json()["has_more"], true);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn the_next_page_continues_after_the_cursor() {
        let (server, token) = server_with_account().await;
        create_project(&server, &token).await;
        create_project(&server, &token).await;
        let first = get(&server, &token, "/sync/changes?limit=1").await.json();
        let path = format!("/sync/changes?since={}&limit=1", first["next_cursor"]);
        let second = get(&server, &token, &path).await.json();
        assert_eq!(second["rows"][0], all_rows(&server, &token).await[1]);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn the_last_page_has_no_more() {
        let (server, token) = server_with_account().await;
        create_project(&server, &token).await;
        let response = get(&server, &token, "/sync/changes?limit=1").await;
        assert_eq!(response.json()["has_more"], false);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn refuses_a_limit_above_two_thousand() {
        let (server, token) = server_with_account().await;
        let response = get(&server, &token, "/sync/changes?limit=2001").await;
        assert_eq!(response.json()["code"], "bad_query");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn another_account_lists_none_of_the_accounts_changes() {
        let (server, token) = server_with_account().await;
        create_project(&server, &token).await;
        let other = sign_up(&server, "other@example.com").await;
        assert_eq!(all_rows(&server, &other).await, Vec::<Value>::new());
    }
}

mod pushing {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn applies_a_row_the_server_never_had() {
        let (server, token) = server_with_account().await;
        let outcome = push_one(&server, &token, new_project_row("Neu", now_ms()), None).await;
        assert_eq!(outcome["kind"], "applied");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_pushed_row_appears_in_the_accounts_changes() {
        let (server, token) = server_with_account().await;
        let row = new_project_row("Neu", now_ms());
        push_one(&server, &token, row.clone(), None).await;
        let key = row["key"].as_str().unwrap();
        let pulled = row_of(&server, &token, "projects", key).await.unwrap();
        assert_eq!(pulled["data"]["name"], "Neu");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_pushed_row_does_not_appear_in_another_accounts_changes() {
        let (server, token) = server_with_account().await;
        push_one(&server, &token, new_project_row("Neu", now_ms()), None).await;
        let other = sign_up(&server, "other@example.com").await;
        assert_eq!(all_rows(&server, &other).await, Vec::<Value>::new());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn the_registry_keeps_the_pushed_modification_time() {
        let (server, token) = server_with_account().await;
        let row = new_project_row("Neu", 5_000);
        push_one(&server, &token, row.clone(), None).await;
        let key = row["key"].as_str().unwrap();
        let pulled = row_of(&server, &token, "projects", key).await.unwrap();
        assert_eq!(pulled["updated_at_ms"], 5_000);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_row_pushed_again_is_unchanged() {
        let (server, token) = server_with_account().await;
        let row = new_project_row("Neu", now_ms());
        push_one(&server, &token, row.clone(), None).await;
        let outcome = push_one(&server, &token, row, None).await;
        assert_eq!(outcome["kind"], "unchanged");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn applies_a_change_made_since_the_servers_version() {
        let (server, token) = server_with_account().await;
        let project = create_project(&server, &token).await;
        let (row, server_time) = renamed_project(&server, &token, &project, now_ms()).await;
        let outcome = push_one(&server, &token, row, Some(server_time)).await;
        assert_eq!(outcome["kind"], "applied");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_newer_concurrent_change_replaces_the_servers() {
        let (server, token) = server_with_account().await;
        let project = create_project(&server, &token).await;
        let (row, server_time) = renamed_project(&server, &token, &project, now_ms() + 1_000).await;
        let outcome = push_one(&server, &token, row, Some(server_time - 1)).await;
        assert_eq!(outcome["kind"], "applied_over_concurrent");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn an_older_concurrent_change_is_superseded_by_the_servers() {
        let (server, token) = server_with_account().await;
        let project = create_project(&server, &token).await;
        let (row, server_time) = renamed_project(&server, &token, &project, 1_000).await;
        let outcome = push_one(&server, &token, row, Some(server_time - 1)).await;
        assert_eq!(outcome["kind"], "superseded");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_superseded_row_comes_back_as_the_server_has_it() {
        let (server, token) = server_with_account().await;
        let project = create_project(&server, &token).await;
        let (row, server_time) = renamed_project(&server, &token, &project, 1_000).await;
        let outcome = push_one(&server, &token, row, Some(server_time - 1)).await;
        assert_eq!(outcome["current"]["data"]["name"], "Deutsch");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn an_equal_concurrent_change_is_unchanged() {
        let (server, token) = server_with_account().await;
        let project = create_project(&server, &token).await;
        let mut row = row_of(&server, &token, "projects", &project).await.unwrap();
        let server_time = row["updated_at_ms"].as_u64().unwrap();
        row["updated_at_ms"] = json!(server_time + 1);
        let outcome = push_one(&server, &token, row, Some(server_time - 1)).await;
        assert_eq!(outcome["kind"], "unchanged");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn takes_a_time_far_ahead_of_the_servers_clock_as_now() {
        let (server, token) = server_with_account().await;
        let row = new_project_row("Neu", now_ms() + DAY_MS);
        let outcome = push_one(&server, &token, row, None).await;
        let remote_time = outcome["remote_updated_at_ms"].as_u64().unwrap();
        assert!(remote_time <= now_ms());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn deletes_a_row_the_device_deleted() {
        let (server, token) = server_with_account().await;
        let project = create_project(&server, &token).await;
        let row = row_of(&server, &token, "projects", &project).await.unwrap();
        let server_time = row["updated_at_ms"].as_u64().unwrap();
        let tombstone = json!({
            "table": "projects", "key": project, "updated_at_ms": now_ms() + 1,
            "is_deleted": true, "data": null,
        });
        push_one(&server, &token, tombstone, Some(server_time)).await;
        let response = get(&server, &token, &format!("/projects/{project}")).await;
        assert_eq!(response.status, 404);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn answers_the_rows_in_the_order_sent() {
        let (server, token) = server_with_account().await;
        let rows: Vec<Value> = (0..3)
            .map(|_| json!({ "row": new_project_row("Neu", now_ms()), "base_updated_at_ms": null }))
            .collect();
        let keys: Vec<Value> = rows.iter().map(|row| row["row"]["key"].clone()).collect();
        let response = push(&server, &token, rows).await;
        let answered: Vec<Value> = response.json()["outcomes"]
            .as_array()
            .unwrap()
            .iter()
            .map(|outcome| outcome["key"].clone())
            .collect();
        assert_eq!(answered, keys);
    }
}

mod parents {
    use super::*;

    fn media_row(project: &str) -> Value {
        let id = new_id();
        json!({
            "table": "media_files",
            "key": id,
            "updated_at_ms": now_ms(),
            "is_deleted": false,
            "data": {
                "id": id, "project_id": project, "name": "clip.webm", "source_kind": "browser_file",
                "source_path": null, "browser_file_size": 1, "browser_file_last_modified_ms": 2,
                "created_at_ms": 1_000, "track_selection_json": null, "origin_plugin": null,
                "origin_locator": null, "target_subtitle_track_id": null,
                "translation_subtitle_track_id": null, "translation_media_file_id": null,
                "is_upload_chosen": 0,
            },
        })
    }

    async fn deleted_project(server: &TestServer, token: &str) -> String {
        let project = create_project(server, token).await;
        let path = format!("/projects/{project}");
        server
            .request("DELETE", &path)
            .with_token(token)
            .send()
            .await;
        project
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn applies_a_child_of_the_owners_project() {
        let (server, token) = server_with_account().await;
        let project = create_project(&server, &token).await;
        let outcome = push_one(&server, &token, media_row(&project), None).await;
        assert_eq!(outcome["kind"], "applied");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn drops_a_child_of_a_deleted_project() {
        let (server, token) = server_with_account().await;
        let project = deleted_project(&server, &token).await;
        let outcome = push_one(&server, &token, media_row(&project), None).await;
        assert_eq!(outcome["kind"], "parent_deleted");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn sends_the_tombstone_of_the_deleted_parent_with_a_dropped_child() {
        let (server, token) = server_with_account().await;
        let project = deleted_project(&server, &token).await;
        let outcome = push_one(&server, &token, media_row(&project), None).await;
        assert_eq!(outcome["current"]["is_deleted"], true);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn rejects_a_child_of_a_project_never_seen() {
        let (server, token) = server_with_account().await;
        let outcome = push_one(&server, &token, media_row(&new_id()), None).await;
        assert_eq!(outcome["kind"], "rejected");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn rejects_a_child_of_another_accounts_project() {
        let (server, token) = server_with_account().await;
        let project = create_project(&server, &token).await;
        let other = sign_up(&server, "other@example.com").await;
        let outcome = push_one(&server, &other, media_row(&project), None).await;
        assert_eq!(outcome["kind"], "rejected");
    }
}

mod rejections {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn rejects_a_key_of_another_account() {
        let (server, token) = server_with_account().await;
        let project = create_project(&server, &token).await;
        let (row, _) = renamed_project(&server, &token, &project, now_ms()).await;
        let other = sign_up(&server, "other@example.com").await;
        let outcome = push_one(&server, &other, row, None).await;
        assert_eq!(outcome["kind"], "rejected");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn leaves_the_other_accounts_row_as_it_was() {
        let (server, token) = server_with_account().await;
        let project = create_project(&server, &token).await;
        let (row, _) = renamed_project(&server, &token, &project, now_ms()).await;
        let other = sign_up(&server, "other@example.com").await;
        push_one(&server, &other, row, None).await;
        let response = get(&server, &token, &format!("/projects/{project}")).await;
        assert_eq!(response.json()["settings"]["name"], "Deutsch");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn rejects_a_device_bound_preference() {
        let (server, token) = server_with_account().await;
        let row = json!({
            "table": "preferences", "key": "theme", "updated_at_ms": now_ms(), "is_deleted": false,
            "data": { "key": "theme", "value": "dark" },
        });
        let outcome = push_one(&server, &token, row, None).await;
        assert_eq!(outcome["kind"], "rejected");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn applies_a_preference_that_follows_the_person() {
        let (server, token) = server_with_account().await;
        let row = json!({
            "table": "preferences", "key": "showTranslations", "updated_at_ms": now_ms(),
            "is_deleted": false, "data": { "key": "showTranslations", "value": "true" },
        });
        let outcome = push_one(&server, &token, row, None).await;
        assert_eq!(outcome["kind"], "applied");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn rejects_a_row_that_lacks_a_column() {
        let (server, token) = server_with_account().await;
        let mut row = new_project_row("Neu", now_ms());
        row["data"].as_object_mut().unwrap().remove("name");
        let outcome = push_one(&server, &token, row, None).await;
        assert_eq!(outcome["kind"], "rejected");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn applies_the_other_rows_of_a_batch_beside_a_rejected_one() {
        let (server, token) = server_with_account().await;
        let mut broken = new_project_row("Neu", now_ms());
        broken["data"].as_object_mut().unwrap().remove("name");
        let rows = vec![
            json!({ "row": broken, "base_updated_at_ms": null }),
            json!({ "row": new_project_row("Neu", now_ms()), "base_updated_at_ms": null }),
        ];
        let response = push(&server, &token, rows).await;
        assert_eq!(response.json()["outcomes"][1]["kind"], "applied");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn refuses_a_table_that_does_not_sync() {
        let (server, token) = server_with_account().await;
        let mut row = new_project_row("Neu", now_ms());
        row["table"] = json!("users");
        let response = push(
            &server,
            &token,
            vec![json!({ "row": row, "base_updated_at_ms": null })],
        )
        .await;
        assert_eq!(response.json()["code"], "unknown_sync_table");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn refuses_more_than_five_hundred_rows() {
        let (server, token) = server_with_account().await;
        let rows: Vec<Value> = (0..501)
            .map(|_| json!({ "row": new_project_row("Neu", now_ms()), "base_updated_at_ms": null }))
            .collect();
        let response = push(&server, &token, rows).await;
        assert_eq!(response.json()["code"], "too_many_rows");
    }
}

mod review_answers {
    use super::*;

    /// Answers a new flashcard, takes the answer's row, and undoes the answer, so that the card is new again.
    async fn undone_answer_row(server: &TestServer, token: &str) -> (String, Value) {
        let project = create_project(server, token).await;
        let flashcard = create_flashcard(server, token, &project).await;
        let body = json!({
            "flashcard_id": flashcard, "rating": "good", "utc_offset_min": 0, "duration_ms": 1000,
        });
        let path = format!("/projects/{project}/review/answers");
        let answered = send(server, token, "POST", &path, &body).await.json();
        let answer_id = answered["entry"]["id"].as_str().unwrap().to_string();
        let row = row_of(server, token, "review_log", &answer_id)
            .await
            .unwrap();
        let path = format!("/projects/{project}/review/answers/{answer_id}?utc_offset_min=0");
        server
            .request("DELETE", &path)
            .with_token(token)
            .send()
            .await;
        (project, row)
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_pushed_answer_schedules_its_flashcard() {
        let (server, token) = server_with_account().await;
        let (project, mut row) = undone_answer_row(&server, &token).await;
        let id = new_id();
        row["key"] = json!(id);
        row["data"]["id"] = json!(id);
        push_one(&server, &token, row, None).await;
        let path = format!("/projects/{project}/review?utc_offset_min=0");
        let summary = get(&server, &token, &path).await.json();
        assert_eq!(summary["new_count"], 0);
    }
}

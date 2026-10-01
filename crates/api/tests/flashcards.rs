mod support;

use serde_json::{Value, json};
use support::{TestServer, browser_source, id_of, spawn_test_server};

fn card(word: &str) -> Value {
    json!({
        "media_id": null,
        "fields": [{ "kind": "word", "value": word }],
        "tags": ["german"],
        "clip": { "start_ms": 500, "end_ms": 1500 },
        "screenshot_ms": 1000
    })
}

fn draft_request() -> Value {
    json!({
        "word": "cats",
        "lemma": "cat",
        "reading": null,
        "l1_definitions": ["Katze"],
        "l2_definitions": [],
        "context": "The cat is sleeping.",
        "context_translation": null,
        "media_id": null,
        "media_name": "Episode 1.mp4",
        "clip": null,
        "screenshot_ms": null,
        "settings": {
            "included_fields": ["word", "l1_definition"],
            "default_tags": [],
            "tag_with_media_name": true,
            "use_tts_when_no_audio": false
        }
    })
}

/// Creates a project with one flashcard and returns both ids.
async fn project_with_card(server: &TestServer) -> (String, String) {
    let project_id = server.create_project().await;
    let response = server
        .post_json(
            &format!("/projects/{project_id}/flashcards"),
            &card("Katze"),
        )
        .await;
    (project_id, id_of(&response))
}

async fn list_words(server: &TestServer, project_id: &str) -> Vec<Value> {
    let response = server
        .get(&format!("/projects/{project_id}/flashcards"))
        .await;
    response.json()["flashcards"]
        .as_array()
        .unwrap()
        .iter()
        .map(|card| card["fields"][0]["value"].clone())
        .collect()
}

#[tokio::test(flavor = "multi_thread")]
async fn creating_a_flashcard_is_created() {
    let server = spawn_test_server(false).await;
    let project_id = server.create_project().await;
    let response = server
        .post_json(
            &format!("/projects/{project_id}/flashcards"),
            &card("Katze"),
        )
        .await;
    assert_eq!(response.status, 201);
}

#[tokio::test(flavor = "multi_thread")]
async fn creating_a_flashcard_in_an_unknown_project_is_not_found() {
    let server = spawn_test_server(false).await;
    let response = server
        .post_json("/projects/missing/flashcards", &card("Katze"))
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn creating_a_flashcard_for_unknown_media_is_not_found() {
    let server = spawn_test_server(false).await;
    let project_id = server.create_project().await;
    let mut body = card("Katze");
    body["media_id"] = json!("missing");
    let response = server
        .post_json(&format!("/projects/{project_id}/flashcards"), &body)
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_flashcard_keeps_the_media_it_was_made_from() {
    let server = spawn_test_server(false).await;
    let project_id = server.create_project().await;
    let media_id = server
        .add_media(&project_id, "a.mp4", browser_source())
        .await;
    let mut body = card("Katze");
    body["media_id"] = json!(media_id);
    let response = server
        .post_json(&format!("/projects/{project_id}/flashcards"), &body)
        .await;
    assert_eq!(response.json()["media_id"], media_id);
}

#[tokio::test(flavor = "multi_thread")]
async fn lists_flashcards_oldest_first() {
    let server = spawn_test_server(false).await;
    let (project_id, _) = project_with_card(&server).await;
    server
        .post_json(&format!("/projects/{project_id}/flashcards"), &card("Hund"))
        .await;
    assert_eq!(
        list_words(&server, &project_id).await,
        vec![json!("Katze"), json!("Hund")]
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn listing_the_flashcards_of_an_unknown_project_is_not_found() {
    let server = spawn_test_server(false).await;
    let response = server.get("/projects/missing/flashcards").await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn updates_a_flashcard() {
    let server = spawn_test_server(false).await;
    let (project_id, card_id) = project_with_card(&server).await;
    let response = server
        .put_json(
            &format!("/projects/{project_id}/flashcards/{card_id}"),
            &card("Kater"),
        )
        .await;
    assert_eq!(response.json()["fields"][0]["value"], "Kater");
}

#[tokio::test(flavor = "multi_thread")]
async fn updating_an_unknown_flashcard_is_not_found() {
    let server = spawn_test_server(false).await;
    let project_id = server.create_project().await;
    let response = server
        .put_json(
            &format!("/projects/{project_id}/flashcards/missing"),
            &card("Kater"),
        )
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn deleting_a_flashcard_has_no_content() {
    let server = spawn_test_server(false).await;
    let (project_id, card_id) = project_with_card(&server).await;
    let response = server
        .delete(&format!("/projects/{project_id}/flashcards/{card_id}"))
        .await;
    assert_eq!(response.status, 204);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_deleted_flashcard_is_no_longer_listed() {
    let server = spawn_test_server(false).await;
    let (project_id, card_id) = project_with_card(&server).await;
    server
        .delete(&format!("/projects/{project_id}/flashcards/{card_id}"))
        .await;
    assert!(list_words(&server, &project_id).await.is_empty());
}

#[tokio::test(flavor = "multi_thread")]
async fn deleting_an_unknown_flashcard_is_not_found() {
    let server = spawn_test_server(false).await;
    let project_id = server.create_project().await;
    let response = server
        .delete(&format!("/projects/{project_id}/flashcards/missing"))
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn drafts_a_flashcard_with_the_included_fields() {
    let server = spawn_test_server(false).await;
    let response = server
        .post_json("/flashcards/draft", &draft_request())
        .await;
    assert_eq!(
        response.json()["fields"],
        json!([
            { "kind": "word", "value": "cat" },
            { "kind": "l1_definition", "value": "Katze" }
        ])
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn drafts_a_flashcard_tagged_with_the_media_name() {
    let server = spawn_test_server(false).await;
    let response = server
        .post_json("/flashcards/draft", &draft_request())
        .await;
    assert_eq!(response.json()["tags"], json!(["Episode_1"]));
}

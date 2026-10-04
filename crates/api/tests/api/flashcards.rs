use serde_json::{Value, json};

use crate::support::{TestServer, spawn_test_server};

const PROJECT: &str = "placeholder-1";

fn draft(word: &str, media_file_id: Option<&str>) -> Value {
    json!({
        "media_file_id": media_file_id,
        "cue_index": 3,
        "content": {
            "word": word,
            "word_pronunciation": "",
            "l1_definition": "to eat (of an animal)",
            "l2_definition": "",
            "text_context": "Der Hund will fressen.",
            "text_context_translation": "The dog wants to eat.",
            "text_context_pronunciation": "",
            "audio_context": { "start_ms": 5400, "end_ms": 8200 },
            "screenshot": { "at_ms": 6800 },
            "tags": ["sample"],
        },
        "included_fields": ["word", "l1_definition", "text_context", "audio_context", "screenshot", "tags"],
    })
}

async fn create(server: &TestServer, word: &str) -> Value {
    let response = server
        .post_json(&format!("/projects/{PROJECT}/flashcards"), &draft(word, None))
        .await;
    assert_eq!(response.status, 201, "{}", response.text());
    response.json()
}

async fn add_media(server: &TestServer, project: &str) -> String {
    let response = server
        .post_json(
            &format!("/projects/{project}/media"),
            &json!({ "name": "clip.webm", "source": { "kind": "browser_file", "size": 1, "last_modified_ms": 2 } }),
        )
        .await;
    response.json()["id"].as_str().unwrap().to_string()
}

#[tokio::test(flavor = "multi_thread")]
async fn lists_no_flashcards_for_a_new_project() {
    let server = spawn_test_server(false).await;
    let response = server.get(&format!("/projects/{PROJECT}/flashcards")).await;
    assert_eq!(response.json()["flashcards"], json!([]));
}

#[tokio::test(flavor = "multi_thread")]
async fn listing_the_flashcards_of_an_unknown_project_is_not_found() {
    let server = spawn_test_server(false).await;
    let response = server.get("/projects/missing/flashcards").await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_created_flashcard_carries_its_content() {
    let server = spawn_test_server(false).await;
    let created = create(&server, "fressen").await;
    assert_eq!(created["content"], draft("fressen", None)["content"]);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_created_flashcard_is_listed() {
    let server = spawn_test_server(false).await;
    let created = create(&server, "fressen").await;
    let response = server.get(&format!("/projects/{PROJECT}/flashcards")).await;
    assert_eq!(response.json()["flashcards"], json!([created]));
}

#[tokio::test(flavor = "multi_thread")]
async fn a_flashcard_may_name_a_media_file_of_its_project() {
    let server = spawn_test_server(false).await;
    let media_id = add_media(&server, PROJECT).await;
    let response = server
        .post_json(
            &format!("/projects/{PROJECT}/flashcards"),
            &draft("fressen", Some(&media_id)),
        )
        .await;
    assert_eq!(response.json()["media_file_id"], media_id);
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_a_media_file_of_another_project() {
    let server = spawn_test_server(false).await;
    let media_id = add_media(&server, "placeholder-2").await;
    let response = server
        .post_json(
            &format!("/projects/{PROJECT}/flashcards"),
            &draft("fressen", Some(&media_id)),
        )
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn counts_the_flashcards_on_the_project() {
    let server = spawn_test_server(false).await;
    create(&server, "fressen").await;
    let response = server.get(&format!("/projects/{PROJECT}")).await;
    assert_eq!(response.json()["flashcard_count"], 1);
}

#[tokio::test(flavor = "multi_thread")]
async fn updates_a_flashcard() {
    let server = spawn_test_server(false).await;
    let created = create(&server, "fressen").await;
    let id = created["id"].as_str().unwrap();
    let response = server
        .request("PUT", &format!("/projects/{PROJECT}/flashcards/{id}"))
        .json(&draft("essen", None))
        .send()
        .await;
    assert_eq!(response.json()["content"]["word"], "essen");
}

#[tokio::test(flavor = "multi_thread")]
async fn does_not_update_a_flashcard_through_another_project() {
    let server = spawn_test_server(false).await;
    let created = create(&server, "fressen").await;
    let id = created["id"].as_str().unwrap();
    let response = server
        .request("PUT", &format!("/projects/placeholder-2/flashcards/{id}"))
        .json(&draft("essen", None))
        .send()
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn deletes_a_flashcard() {
    let server = spawn_test_server(false).await;
    let created = create(&server, "fressen").await;
    let id = created["id"].as_str().unwrap();
    let response = server
        .delete(&format!("/projects/{PROJECT}/flashcards/{id}"))
        .await;
    assert_eq!(response.status, 204);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_deleted_flashcard_is_no_longer_listed() {
    let server = spawn_test_server(false).await;
    let created = create(&server, "fressen").await;
    let id = created["id"].as_str().unwrap();
    server
        .delete(&format!("/projects/{PROJECT}/flashcards/{id}"))
        .await;
    let response = server.get(&format!("/projects/{PROJECT}/flashcards")).await;
    assert_eq!(response.json()["flashcards"], json!([]));
}

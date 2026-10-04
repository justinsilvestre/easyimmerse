use serde_json::{Value, json};

use crate::support::{TestServer, spawn_test_server};

fn settings(name: &str) -> Value {
    json!({
        "name": name,
        "target_language": "de",
        "translation_language": "en",
        "flashcard_fields": ["word", "l1_definition", "text_context"],
        "default_tags": ["tv"],
        "tags_media_name": true,
        "fills_audio_with_tts": false,
    })
}

async fn create(server: &TestServer, name: &str) -> Value {
    let response = server.post_json("/projects", &settings(name)).await;
    assert_eq!(response.status, 201, "{}", response.text());
    response.json()
}

#[tokio::test(flavor = "multi_thread")]
async fn lists_the_two_seeded_projects() {
    let server = spawn_test_server(false).await;
    let response = server.get("/projects").await;
    assert_eq!(response.json()["projects"].as_array().unwrap().len(), 2);
}

#[tokio::test(flavor = "multi_thread")]
async fn lists_the_most_recently_opened_project_first() {
    let server = spawn_test_server(false).await;
    let response = server.get("/projects").await;
    assert_eq!(
        response.json()["projects"][0]["settings"]["name"],
        "Japanese drama"
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn a_created_project_carries_its_settings() {
    let server = spawn_test_server(false).await;
    let created = create(&server, "German").await;
    assert_eq!(created["settings"], settings("German"));
}

#[tokio::test(flavor = "multi_thread")]
async fn a_created_project_is_listed_first() {
    let server = spawn_test_server(false).await;
    let created = create(&server, "German").await;
    let response = server.get("/projects").await;
    assert_eq!(response.json()["projects"][0]["id"], created["id"]);
}

#[tokio::test(flavor = "multi_thread")]
async fn gets_a_project_by_id() {
    let server = spawn_test_server(false).await;
    let response = server.get("/projects/placeholder-1").await;
    assert_eq!(response.json()["settings"]["name"], "Spanish practice");
}

#[tokio::test(flavor = "multi_thread")]
async fn an_unknown_project_is_not_found() {
    let server = spawn_test_server(false).await;
    let response = server.get("/projects/missing").await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn updates_the_settings() {
    let server = spawn_test_server(false).await;
    let response = server
        .request("PUT", "/projects/placeholder-1")
        .json(&settings("Español"))
        .send()
        .await;
    assert_eq!(response.json()["settings"]["name"], "Español");
}

#[tokio::test(flavor = "multi_thread")]
async fn marking_a_project_opened_moves_it_to_the_front() {
    let server = spawn_test_server(false).await;
    let response = server.post_json("/projects/placeholder-1/opened", &json!(null)).await;
    assert_eq!(response.status, 204);
    let listed = server.get("/projects").await;
    assert_eq!(listed.json()["projects"][0]["id"], "placeholder-1");
}

#[tokio::test(flavor = "multi_thread")]
async fn deletes_a_project() {
    let server = spawn_test_server(false).await;
    let response = server.delete("/projects/placeholder-1").await;
    assert_eq!(response.status, 204);
    let listed = server.get("/projects").await;
    assert_eq!(listed.json()["projects"].as_array().unwrap().len(), 1);
}

#[tokio::test(flavor = "multi_thread")]
async fn deleting_an_unknown_project_is_not_found() {
    let server = spawn_test_server(false).await;
    let response = server.delete("/projects/missing").await;
    assert_eq!(response.status, 404);
}

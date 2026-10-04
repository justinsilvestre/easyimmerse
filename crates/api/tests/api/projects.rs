use serde_json::{Value, json};

use crate::support::spawn_test_server;

fn save_request(name: &str) -> Value {
    json!({
        "name": name,
        "settings": {
            "target_language": "fr",
            "translation_language": "en",
            "flashcard_fields": ["word", "l1_definition"],
            "default_tags": [],
            "tags_media_name": true,
            "fills_audio_with_tts": false
        }
    })
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
    assert_eq!(response.json()["projects"][0]["name"], "Spanish practice");
}

#[tokio::test(flavor = "multi_thread")]
async fn lists_the_counts_of_a_project() {
    let server = spawn_test_server(false).await;
    let project = &server.get("/projects").await.json()["projects"][0];
    assert_eq!(
        (
            project["media_count"].clone(),
            project["flashcard_count"].clone()
        ),
        (json!(0), json!(0))
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn creating_a_project_is_created() {
    let server = spawn_test_server(false).await;
    let response = server.post_json("/projects", &save_request("French")).await;
    assert_eq!(response.status, 201);
}

#[tokio::test(flavor = "multi_thread")]
async fn gets_a_created_project() {
    let server = spawn_test_server(false).await;
    let created = server
        .post_json("/projects", &save_request("French"))
        .await
        .json();
    let id = created["id"].as_str().unwrap();
    assert_eq!(server.get(&format!("/projects/{id}")).await.json(), created);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_blank_name_is_a_bad_request() {
    let server = spawn_test_server(false).await;
    let response = server.post_json("/projects", &save_request("  ")).await;
    assert_eq!(response.status, 400);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_blank_language_is_a_bad_request() {
    let server = spawn_test_server(false).await;
    let mut request = save_request("French");
    request["settings"]["target_language"] = json!("");
    let response = server.post_json("/projects", &request).await;
    assert_eq!(response.status, 400);
}

#[tokio::test(flavor = "multi_thread")]
async fn an_unknown_project_is_not_found() {
    let server = spawn_test_server(false).await;
    assert_eq!(server.get("/projects/missing").await.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn updates_a_project() {
    let server = spawn_test_server(false).await;
    let response = server
        .put_json("/projects/placeholder-1", &save_request("Renamed"))
        .await;
    assert_eq!(response.json()["name"], "Renamed");
}

#[tokio::test(flavor = "multi_thread")]
async fn deletes_a_project() {
    let server = spawn_test_server(false).await;
    let response = server.delete("/projects/placeholder-1").await;
    let listed = server.get("/projects").await.json();
    assert_eq!(
        (
            response.status,
            listed["projects"].as_array().unwrap().len()
        ),
        (204, 1)
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn deleting_an_unknown_project_is_not_found() {
    let server = spawn_test_server(false).await;
    assert_eq!(server.delete("/projects/missing").await.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn opening_a_project_lists_it_first() {
    let server = spawn_test_server(false).await;
    let response = server
        .request("POST", "/projects/placeholder-2/opened")
        .send()
        .await;
    let listed = server.get("/projects").await.json();
    assert_eq!(
        (response.status, listed["projects"][0]["name"].clone()),
        (204, json!("Japanese drama"))
    );
}

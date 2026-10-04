use serde_json::{Value, json};

use crate::support::{TestServer, spawn_test_server};

const CARDS: &str = "/projects/placeholder-1/flashcards";
const DATA_URL: &str = "data:image/png;base64,AAAA";

fn save_request(word: &str) -> Value {
    json!({
        "media_file_id": null,
        "fields": {
            "word": word,
            "word_pronunciation": "",
            "l1_definition": "cat",
            "l2_definition": "",
            "text_context": "",
            "text_context_translation": "",
            "text_context_pronunciation": "",
            "audio_context": { "start_ms": 1000, "end_ms": 2000 },
            "screenshot_at_ms": 1500,
            "tags": ["animals"]
        },
        "included_fields": ["word", "l1_definition"],
        "screenshot_data_url": DATA_URL
    })
}

async fn create(server: &TestServer, request: &Value) -> Value {
    let response = server.post_json(CARDS, request).await;
    assert_eq!(response.status, 201, "{}", response.text());
    response.json()
}

async fn add_media_file(server: &TestServer, project: &str) -> String {
    let response = server
        .post_json(
            &format!("/projects/{project}/media"),
            &json!({ "name": "clip.webm", "source": { "kind": "browser_file", "size": 1, "last_modified_ms": 2 } }),
        )
        .await;
    response.json()["id"].as_str().unwrap().to_owned()
}

fn card_path(card: &Value, suffix: &str) -> String {
    format!("{CARDS}/{}{suffix}", card["id"].as_str().unwrap())
}

#[tokio::test(flavor = "multi_thread")]
async fn lists_a_created_flashcard() {
    let server = spawn_test_server(false).await;
    let card = create(&server, &save_request("gato")).await;
    assert_eq!(server.get(CARDS).await.json()["flashcards"], json!([card]));
}

#[tokio::test(flavor = "multi_thread")]
async fn reports_a_stored_screenshot() {
    let server = spawn_test_server(false).await;
    let card = create(&server, &save_request("gato")).await;
    assert_eq!(card["has_screenshot_image"], true);
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_the_screenshot() {
    let server = spawn_test_server(false).await;
    let card = create(&server, &save_request("gato")).await;
    let response = server.get(&card_path(&card, "/screenshot")).await;
    assert_eq!(response.json()["data_url"], DATA_URL);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_flashcard_without_a_screenshot_has_none_to_serve() {
    let server = spawn_test_server(false).await;
    let mut request = save_request("gato");
    request["screenshot_data_url"] = Value::Null;
    let card = create(&server, &request).await;
    let response = server.get(&card_path(&card, "/screenshot")).await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_a_screenshot_that_is_not_an_image_data_url() {
    let server = spawn_test_server(false).await;
    let mut request = save_request("gato");
    request["screenshot_data_url"] = json!("https://example.com/a.png");
    assert_eq!(server.post_json(CARDS, &request).await.status, 400);
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_a_screenshot_over_five_megabytes() {
    let server = spawn_test_server(false).await;
    let mut request = save_request("gato");
    request["screenshot_data_url"] = json!(format!(
        "data:image/png;base64,{}",
        "A".repeat(5 * 1024 * 1024)
    ));
    assert_eq!(server.post_json(CARDS, &request).await.status, 400);
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_a_media_file_of_another_project() {
    let server = spawn_test_server(false).await;
    let mut request = save_request("gato");
    request["media_file_id"] = json!(add_media_file(&server, "placeholder-2").await);
    assert_eq!(server.post_json(CARDS, &request).await.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn narrows_the_list_to_one_media_file() {
    let server = spawn_test_server(false).await;
    let media_id = add_media_file(&server, "placeholder-1").await;
    let mut request = save_request("gato");
    request["media_file_id"] = json!(media_id);
    create(&server, &request).await;
    create(&server, &save_request("perro")).await;
    let response = server.get(&format!("{CARDS}?media_id={media_id}")).await;
    assert_eq!(response.json()["flashcards"].as_array().unwrap().len(), 1);
}

#[tokio::test(flavor = "multi_thread")]
async fn updates_a_flashcard() {
    let server = spawn_test_server(false).await;
    let card = create(&server, &save_request("gato")).await;
    let response = server
        .put_json(&card_path(&card, ""), &save_request("gata"))
        .await;
    assert_eq!(response.json()["fields"]["word"], "gata");
}

#[tokio::test(flavor = "multi_thread")]
async fn a_null_screenshot_time_removes_the_screenshot() {
    let server = spawn_test_server(false).await;
    let card = create(&server, &save_request("gato")).await;
    let mut request = save_request("gato");
    request["fields"]["screenshot_at_ms"] = Value::Null;
    let response = server.put_json(&card_path(&card, ""), &request).await;
    assert_eq!(response.json()["has_screenshot_image"], false);
}

#[tokio::test(flavor = "multi_thread")]
async fn does_not_update_a_flashcard_through_another_project() {
    let server = spawn_test_server(false).await;
    let card = create(&server, &save_request("gato")).await;
    let path = card_path(&card, "").replace("placeholder-1", "placeholder-2");
    let response = server.put_json(&path, &save_request("gata")).await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn deletes_a_flashcard() {
    let server = spawn_test_server(false).await;
    let card = create(&server, &save_request("gato")).await;
    let response = server.delete(&card_path(&card, "")).await;
    let listed = server.get(CARDS).await.json();
    assert_eq!(
        (response.status, listed["flashcards"].clone()),
        (204, json!([]))
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn removing_the_media_file_keeps_the_flashcard_without_one() {
    let server = spawn_test_server(false).await;
    let media_id = add_media_file(&server, "placeholder-1").await;
    let mut request = save_request("gato");
    request["media_file_id"] = json!(media_id);
    create(&server, &request).await;
    server
        .delete(&format!("/projects/placeholder-1/media/{media_id}"))
        .await;
    let listed = server.get(CARDS).await.json();
    assert_eq!(listed["flashcards"][0]["media_file_id"], Value::Null);
}

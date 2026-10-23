//! The server's library: who may manage it, preparing items, publishing them, and what learners do with them.
//! The tests that publish a video skip when ffmpeg and ffprobe are not found.

use std::path::{Path, PathBuf};
use std::time::Duration;

use easyimmerse_api::{AccountsConfig, ApiConfig, ServeOptions, UploadsConfig};
use easyimmerse_storage::Storage;
use serde_json::{Value, json};
use tempfile::TempDir;

use crate::stored_copies::sign_up;
use crate::support::{
    TOKEN, TestResponse, TestServer, ffmpeg_available, read_fixture, spawn_configured_test_server,
};
use crate::sync::send_as;

const DOCUMENT_TEXT: &str = "Der Hund schläft.\n\nDie Katze frisst.\n";

/// A server with open sign-up that keeps library files in a new directory, which lives as long as the `TempDir`.
async fn library_server() -> (TestServer, TempDir) {
    let dir = tempfile::tempdir().unwrap();
    let uploads = UploadsConfig {
        dir: dir.path().join("uploads"),
        account_quota_bytes: Some(1_000_000),
        library_user_quota_bytes: 1_000,
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

fn draft(kind: &str) -> Value {
    json!({
        "title": "Der Hund",
        "description": "A short text",
        "language": "de",
        "translation_language": "en",
        "kind": kind,
        "difficulty": "beginner",
        "tags": ["animals"],
        "cover_at_ms": null,
    })
}

/// Creates an item with the launch token and returns its id.
async fn create_item(server: &TestServer, kind: &str) -> String {
    let response = server.post_json("/library/items", &draft(kind)).await;
    assert_eq!(response.status, 201, "{}", response.text());
    response.json()["id"].as_str().unwrap().to_string()
}

async fn upload(
    server: &TestServer,
    item_id: &str,
    file_name: &str,
    bytes: Vec<u8>,
) -> TestResponse {
    server
        .request(
            "PUT",
            &format!("/library/items/{item_id}/file?file_name={file_name}"),
        )
        .header("Content-Type", "application/octet-stream")
        .body(bytes)
        .send()
        .await
}

/// A document item with its file uploaded; its id.
async fn document_item(server: &TestServer) -> String {
    let item_id = create_item(server, "document").await;
    let response = upload(
        server,
        &item_id,
        "hund.txt",
        DOCUMENT_TEXT.as_bytes().to_vec(),
    )
    .await;
    assert_eq!(response.status, 200, "{}", response.text());
    item_id
}

fn word(start: u32, end: u32, term: &str) -> Value {
    json!({
        "start": start,
        "end": end,
        "entry": { "term": term, "reading": null, "l1_definition": "dog", "l2_definition": "" },
    })
}

async fn put_words(server: &TestServer, item_id: &str, words: Value) -> TestResponse {
    let path = format!("/library/items/{item_id}/segments/0/words");
    server.put_json(&path, &words).await
}

/// Publishes the item and waits until the server is done with it; the item as it then stands.
async fn publish(server: &TestServer, item_id: &str) -> Value {
    let started = server
        .post_json(&format!("/library/items/{item_id}/publish"), &json!({}))
        .await;
    assert_eq!(started.status, 202, "{}", started.text());
    for _ in 0..600 {
        let item = server
            .get(&format!("/library/items/{item_id}"))
            .await
            .json();
        if item["status"]["kind"] != "processing" {
            return item;
        }
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
    panic!("the publish did not finish");
}

/// A published document item whose first segment has the word "Hund"; its id.
async fn published_document(server: &TestServer) -> String {
    let item_id = document_item(server).await;
    let response = put_words(server, &item_id, json!([word(4, 8, "Hund")])).await;
    assert_eq!(response.status, 200, "{}", response.text());
    publish(server, &item_id).await;
    item_id
}

async fn add_item(
    server: &TestServer,
    token: &str,
    item_id: &str,
    project_id: Value,
) -> TestResponse {
    let path = format!("/library/items/{item_id}/add");
    send_as(
        server,
        token,
        "POST",
        &path,
        Some(&json!({ "project_id": project_id })),
    )
    .await
}

/// A learner's project and media file of a published document item: the learner's token, project id and media file id.
async fn learner_media(server: &TestServer) -> (String, String, String) {
    let item_id = published_document(server).await;
    let token = sign_up(server, "learner@example.com").await;
    let added = add_item(server, &token, &item_id, Value::Null).await.json();
    let id = |key: &str| added[key].as_str().unwrap().to_string();
    (token, id("project_id"), id("media_file_id"))
}

async fn user_id_of(server: &TestServer, token: &str) -> String {
    let me = send_as(server, token, "GET", "/auth/me", None).await.json();
    me["user"]["id"].as_str().unwrap().to_string()
}

async fn flag_library_manager(server: &TestServer, user_id: &str) -> TestResponse {
    let path = format!("/users/{user_id}/library-manager");
    server
        .put_json(&path, &json!({ "manages_library": true }))
        .await
}

/// The status of each manager route for the token's holder, for an existing draft document item.
async fn manager_route_statuses(server: &TestServer, token: &str, item_id: &str) -> Vec<u16> {
    let item = format!("/library/items/{item_id}");
    let requests: Vec<(&'static str, String, Option<Value>)> = vec![
        (
            "POST",
            "/library/items".to_string(),
            Some(draft("document")),
        ),
        ("PUT", item.clone(), Some(draft("document"))),
        ("GET", format!("{item}/file"), None),
        (
            "PUT",
            format!("{item}/subtitles"),
            Some(json!({ "target_text": "", "translation_text": null, "format": null })),
        ),
        ("POST", format!("{item}/proposed-words"), None),
        ("PUT", format!("{item}/segments/0/words"), Some(json!([]))),
        ("POST", format!("{item}/publish"), None),
        ("POST", format!("{item}/unpublish"), None),
        ("DELETE", item.clone(), None),
    ];
    let mut statuses = Vec::new();
    for (method, path, body) in requests {
        statuses.push(
            send_as(server, token, method, &path, body.as_ref())
                .await
                .status,
        );
    }
    let upload = server
        .request("PUT", &format!("{item}/file?file_name=a.txt"))
        .with_token(token)
        .body(b"a".to_vec())
        .send()
        .await;
    statuses.push(upload.status);
    statuses
}

#[tokio::test(flavor = "multi_thread")]
async fn a_library_user_is_forbidden_every_manager_route() {
    let (server, _dir) = library_server().await;
    let item_id = document_item(&server).await;
    let token = sign_up(&server, "learner@example.com").await;
    let statuses = manager_route_statuses(&server, &token, &item_id).await;
    assert_eq!(statuses, vec![403; 10]);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_flagged_library_user_creates_an_item() {
    let (server, _dir) = library_server().await;
    let token = sign_up(&server, "learner@example.com").await;
    flag_library_manager(&server, &user_id_of(&server, &token).await).await;
    let response = send_as(
        &server,
        &token,
        "POST",
        "/library/items",
        Some(&draft("video")),
    )
    .await;
    assert_eq!(response.status, 201);
}

#[tokio::test(flavor = "multi_thread")]
async fn the_current_principal_tells_that_the_account_manages_the_library() {
    let (server, _dir) = library_server().await;
    let token = sign_up(&server, "learner@example.com").await;
    flag_library_manager(&server, &user_id_of(&server, &token).await).await;
    let me = send_as(&server, &token, "GET", "/auth/me", None)
        .await
        .json();
    assert_eq!(me["user"]["manages_library"], true);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_library_user_may_not_flag_an_account() {
    let (server, _dir) = library_server().await;
    let token = sign_up(&server, "learner@example.com").await;
    let path = format!(
        "/users/{}/library-manager",
        user_id_of(&server, &token).await
    );
    let body = json!({ "manages_library": true });
    let response = send_as(&server, &token, "PUT", &path, Some(&body)).await;
    assert_eq!(response.status, 403);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_draft_is_not_found_by_a_library_user() {
    let (server, _dir) = library_server().await;
    let item_id = create_item(&server, "video").await;
    let token = sign_up(&server, "learner@example.com").await;
    let response = send_as(
        &server,
        &token,
        "GET",
        &format!("/library/items/{item_id}"),
        None,
    )
    .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn the_listing_hides_drafts_from_a_library_user() {
    let (server, _dir) = library_server().await;
    create_item(&server, "video").await;
    let token = sign_up(&server, "learner@example.com").await;
    let listing = send_as(&server, &token, "GET", "/library/items", None)
        .await
        .json();
    assert_eq!(listing["items"], json!([]));
}

#[tokio::test(flavor = "multi_thread")]
async fn the_listing_shows_drafts_to_a_manager() {
    let (server, _dir) = library_server().await;
    create_item(&server, "video").await;
    let listing = server.get("/library/items").await.json();
    assert_eq!(listing["items"].as_array().map(Vec::len), Some(1));
}

#[tokio::test(flavor = "multi_thread")]
async fn an_uploaded_document_is_divided_into_its_paragraphs() {
    let (server, _dir) = library_server().await;
    let item_id = document_item(&server).await;
    let text = server
        .get(&format!("/library/items/{item_id}/text"))
        .await
        .json();
    let texts: Vec<&str> = (text["segments"].as_array().unwrap().iter())
        .map(|segment| segment["text"].as_str().unwrap())
        .collect();
    assert_eq!(texts, ["Der Hund schläft.", "Die Katze frisst."]);
}

#[tokio::test(flavor = "multi_thread")]
async fn an_upload_without_an_uploads_directory_conflicts() {
    let server = crate::support::spawn_test_server_with_accounts(true).await;
    let item_id = create_item(&server, "document").await;
    let response = upload(&server, &item_id, "hund.txt", b"Hund".to_vec()).await;
    assert_eq!(
        (response.status, response.json()["code"].clone()),
        (409, json!("uploads_unavailable"))
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn subtitles_pair_with_the_translation_cues_they_overlap() {
    let (server, _dir) = library_server().await;
    let item_id = create_item(&server, "video").await;
    let target =
        "1\n00:00:00,000 --> 00:00:01,000\nHallo.\n\n2\n00:00:01,000 --> 00:00:02,000\nTschüss.\n";
    let translation = "1\n00:00:01,100 --> 00:00:01,900\nBye.\n";
    let body = json!({ "target_text": target, "translation_text": translation, "format": null });
    let text = server
        .put_json(&format!("/library/items/{item_id}/subtitles"), &body)
        .await
        .json();
    let translations: Vec<Value> = (text["segments"].as_array().unwrap().iter())
        .map(|segment| segment["translation"].clone())
        .collect();
    assert_eq!(translations, [Value::Null, json!("Bye.")]);
}

#[tokio::test(flavor = "multi_thread")]
async fn overlapping_words_are_refused() {
    let (server, _dir) = library_server().await;
    let item_id = document_item(&server).await;
    let words = json!([word(0, 8, "der Hund"), word(4, 8, "Hund")]);
    assert_eq!(put_words(&server, &item_id, words).await.status, 400);
}

#[tokio::test(flavor = "multi_thread")]
async fn the_words_of_a_published_item_cannot_change() {
    let (server, _dir) = library_server().await;
    let item_id = published_document(&server).await;
    let response = put_words(&server, &item_id, json!([])).await;
    assert_eq!(
        (response.status, response.json()["code"].clone()),
        (409, json!("item_published"))
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn a_published_document_is_shown_to_learners() {
    let (server, _dir) = library_server().await;
    let item_id = published_document(&server).await;
    let token = sign_up(&server, "learner@example.com").await;
    let item = send_as(
        &server,
        &token,
        "GET",
        &format!("/library/items/{item_id}"),
        None,
    )
    .await;
    assert_eq!(item.json()["status"]["kind"], "published");
}

#[tokio::test(flavor = "multi_thread")]
async fn an_item_without_a_file_is_not_published() {
    let (server, _dir) = library_server().await;
    let item_id = create_item(&server, "document").await;
    let response = server
        .post_json(&format!("/library/items/{item_id}/publish"), &json!({}))
        .await;
    assert_eq!(response.status, 400);
}

#[tokio::test(flavor = "multi_thread")]
async fn adding_an_item_to_a_project_twice_yields_one_media_file() {
    let (server, _dir) = library_server().await;
    let item_id = published_document(&server).await;
    let token = sign_up(&server, "learner@example.com").await;
    let first = add_item(&server, &token, &item_id, Value::Null)
        .await
        .json();
    let second = add_item(&server, &token, &item_id, first["project_id"].clone())
        .await
        .json();
    assert_eq!(second["media_file_id"], first["media_file_id"]);
}

#[tokio::test(flavor = "multi_thread")]
async fn adding_an_item_without_a_project_names_the_new_project_after_its_language() {
    let (server, _dir) = library_server().await;
    let (token, project_id, _) = learner_media(&server).await;
    let project = send_as(
        &server,
        &token,
        "GET",
        &format!("/projects/{project_id}"),
        None,
    )
    .await;
    assert_eq!(project.json()["settings"]["name"], "German library");
}

#[tokio::test(flavor = "multi_thread")]
async fn adding_an_item_to_another_persons_project_is_not_found() {
    let (server, _dir) = library_server().await;
    let (_, project_id, _) = learner_media(&server).await;
    let item_id = server.get("/library/items").await.json()["items"][0]["id"].clone();
    let other = sign_up(&server, "other@example.com").await;
    let item_id = item_id.as_str().unwrap();
    let response = add_item(&server, &other, item_id, json!(project_id)).await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn the_generic_media_route_refuses_a_library_source() {
    let (server, _dir) = library_server().await;
    let (token, project_id, _) = learner_media(&server).await;
    let body = json!({ "name": "x", "source": { "kind": "library", "item_id": "abc" } });
    let path = format!("/projects/{project_id}/media");
    assert_eq!(
        send_as(&server, &token, "POST", &path, Some(&body))
            .await
            .status,
        400
    );
}

fn new_card(word_start: Value) -> Value {
    json!({ "id": "0123456789abcdef0123456789abcdef", "segment_index": 0, "word_start": word_start })
}

async fn create_card(
    server: &TestServer,
    token: &str,
    project_id: &str,
    media_id: &str,
) -> TestResponse {
    let path = format!("/projects/{project_id}/media/{media_id}/library-flashcards");
    send_as(server, token, "POST", &path, Some(&new_card(json!(4)))).await
}

#[tokio::test(flavor = "multi_thread")]
async fn a_library_flashcard_takes_its_content_from_the_stored_word() {
    let (server, _dir) = library_server().await;
    let (token, project_id, media_id) = learner_media(&server).await;
    let card = create_card(&server, &token, &project_id, &media_id)
        .await
        .json();
    let content = &card["content"];
    assert_eq!(
        (
            &content["word"],
            &content["l1_definition"],
            &content["text_context"],
            &content["tags"]
        ),
        (
            &json!("Hund"),
            &json!("dog"),
            &json!("Der Hund schläft."),
            &json!(["der-hund"])
        )
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn a_library_flashcard_for_no_word_is_refused() {
    let (server, _dir) = library_server().await;
    let (token, project_id, media_id) = learner_media(&server).await;
    let path = format!("/projects/{project_id}/media/{media_id}/library-flashcards");
    let response = send_as(&server, &token, "POST", &path, Some(&new_card(json!(1)))).await;
    assert_eq!(response.status, 400);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_library_flashcard_cannot_be_updated() {
    let (server, _dir) = library_server().await;
    let (token, project_id, media_id) = learner_media(&server).await;
    let card = create_card(&server, &token, &project_id, &media_id)
        .await
        .json();
    let draft = json!({
        "media_file_id": media_id,
        "cue_index": 0,
        "word_start": 4,
        "content": card["content"],
        "included_fields": card["included_fields"],
    });
    let path = format!(
        "/projects/{project_id}/flashcards/{}",
        card["id"].as_str().unwrap()
    );
    let response = send_as(&server, &token, "PUT", &path, Some(&draft)).await;
    assert_eq!(
        (response.status, response.json()["code"].clone()),
        (409, json!("library_flashcard"))
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn a_library_flashcard_needs_a_library_media_file() {
    let (server, _dir) = library_server().await;
    let (token, project_id, _) = learner_media(&server).await;
    let body = json!({ "name": "film.mp4", "source": { "kind": "browser_file", "size": 1, "last_modified_ms": 1 } });
    let path = format!("/projects/{project_id}/media");
    let media = send_as(&server, &token, "POST", &path, Some(&body))
        .await
        .json();
    let media_id = media["id"].as_str().unwrap();
    let response = create_card(&server, &token, &project_id, media_id).await;
    assert_eq!(response.json()["code"], "not_library_media");
}

#[tokio::test(flavor = "multi_thread")]
async fn the_stream_of_a_library_media_file_serves_the_items_file() {
    let (server, _dir) = library_server().await;
    let (token, project_id, media_id) = learner_media(&server).await;
    let path = format!("/projects/{project_id}/media/{media_id}/stream");
    let response = send_as(&server, &token, "GET", &path, None).await;
    assert_eq!(response.bytes, DOCUMENT_TEXT.as_bytes());
}

#[tokio::test(flavor = "multi_thread")]
async fn the_stream_of_an_unpublished_item_is_not_found() {
    let (server, _dir) = library_server().await;
    let (token, project_id, media_id) = learner_media(&server).await;
    let item_id = server.get("/library/items").await.json()["items"][0]["id"].clone();
    let unpublish = format!("/library/items/{}/unpublish", item_id.as_str().unwrap());
    server.post_json(&unpublish, &json!({})).await;
    let path = format!("/projects/{project_id}/media/{media_id}/stream");
    assert_eq!(
        send_as(&server, &token, "GET", &path, None).await.status,
        404
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn deleting_an_item_removes_its_files() {
    let (server, dir) = library_server().await;
    let item_id = document_item(&server).await;
    server.delete(&format!("/library/items/{item_id}")).await;
    assert!(!item_dir(dir.path(), &item_id).exists());
}

fn item_dir(dir: &Path, item_id: &str) -> PathBuf {
    dir.join("uploads/library").join(item_id)
}

/// A published video item made from the sample video and its subtitles, as the launch token's holder:
/// the item, and the learner's token, project id and media file id.
async fn published_video(server: &TestServer) -> (Value, (String, String, String)) {
    let item_id = create_item(server, "video").await;
    let uploaded = upload(server, &item_id, "sample.mp4", read_fixture("sample.mp4")).await;
    assert_eq!(uploaded.status, 200, "{}", uploaded.text());
    let subtitles = String::from_utf8(read_fixture("sample.srt")).unwrap();
    let body = json!({ "target_text": subtitles, "translation_text": null, "format": null });
    server
        .put_json(&format!("/library/items/{item_id}/subtitles"), &body)
        .await;
    let item = publish(server, &item_id).await;
    let token = sign_up(server, "learner@example.com").await;
    let added = add_item(server, &token, &item_id, Value::Null).await.json();
    let id = |key: &str| added[key].as_str().unwrap().to_string();
    (item, (token, id("project_id"), id("media_file_id")))
}

fn file_names_in(dir: &Path) -> Vec<String> {
    let mut names: Vec<String> = std::fs::read_dir(dir)
        .map(|entries| {
            entries
                .filter_map(|entry| entry.ok()?.file_name().into_string().ok())
                .collect()
        })
        .unwrap_or_default();
    names.sort();
    names
}

#[tokio::test(flavor = "multi_thread")]
async fn publishing_a_video_marks_it_published() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _dir) = library_server().await;
    let (item, _) = published_video(&server).await;
    assert_eq!(item["status"], json!({ "kind": "published" }));
}

#[tokio::test(flavor = "multi_thread")]
async fn publishing_a_video_renders_a_clip_and_a_screenshot_per_cue() {
    if !ffmpeg_available() {
        return;
    }
    let (server, dir) = library_server().await;
    let (item, _) = published_video(&server).await;
    let cues = item_dir(dir.path(), item["id"].as_str().unwrap()).join("cues");
    assert_eq!(
        file_names_in(&cues),
        [
            "0.jpg", "0.m4a", "1.jpg", "1.m4a", "2.jpg", "2.m4a", "3.jpg", "3.m4a"
        ]
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn publishing_a_video_renders_its_cover() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _dir) = library_server().await;
    let (item, (token, _, _)) = published_video(&server).await;
    let path = format!("/library/items/{}/cover", item["id"].as_str().unwrap());
    let response = send_as(&server, &token, "GET", &path, None).await;
    assert_eq!(response.header("content-type"), Some("image/jpeg"));
}

#[tokio::test(flavor = "multi_thread")]
async fn the_clip_of_a_cue_window_is_served_from_the_publish() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _dir) = library_server().await;
    let (_, (token, project_id, media_id)) = published_video(&server).await;
    let path = format!("/projects/{project_id}/media/{media_id}/clip?start_ms=500&end_ms=1500");
    let response = send_as(&server, &token, "GET", &path, None).await;
    assert_eq!(response.header("content-type"), Some("audio/mp4"));
}

#[tokio::test(flavor = "multi_thread")]
async fn a_clip_of_another_window_is_not_preprocessed() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _dir) = library_server().await;
    let (_, (token, project_id, media_id)) = published_video(&server).await;
    let path = format!("/projects/{project_id}/media/{media_id}/clip?start_ms=0&end_ms=1500");
    let response = send_as(&server, &token, "GET", &path, None).await;
    assert_eq!(response.json()["code"], "not_preprocessed");
}

#[tokio::test(flavor = "multi_thread")]
async fn the_screenshot_of_a_cue_is_taken_at_its_midpoint() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _dir) = library_server().await;
    let (_, (token, project_id, media_id)) = published_video(&server).await;
    let path = format!("/projects/{project_id}/media/{media_id}/frame?at_ms=1000");
    let response = send_as(&server, &token, "GET", &path, None).await;
    assert_eq!(response.header("content-type"), Some("image/jpeg"));
}

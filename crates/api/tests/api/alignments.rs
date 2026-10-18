use serde_json::{Value, json};

use crate::support::{TestServer, spawn_test_server};

const PROJECT: &str = "placeholder-1";
const OTHER_PROJECT: &str = "placeholder-2";

async fn add_media(server: &TestServer, project: &str, name: &str) -> String {
    let response = server
        .post_json(
            &format!("/projects/{project}/media"),
            &json!({ "name": name, "source": { "kind": "browser_file", "size": 1, "last_modified_ms": 2 } }),
        )
        .await;
    assert_eq!(response.status, 201, "{}", response.text());
    response.json()["id"].as_str().unwrap().to_string()
}

fn alignments_route(project: &str, media_id: &str, suffix: &str) -> String {
    format!("/projects/{project}/media/{media_id}/alignments{suffix}")
}

fn translation_document_route(media_id: &str) -> String {
    format!("/projects/{PROJECT}/media/{media_id}/translation-document")
}

fn span(start: u32, end: u32) -> Value {
    json!({ "chapter_index": 0, "paragraph_index": 1, "start": start, "end": end })
}

fn audio_request(audio_id: &str) -> Value {
    json!({
        "provider": "cloud",
        "content": {
            "kind": "audio",
            "audio_media_file_id": audio_id,
            "segments": [{ "span": span(0, 12), "start_ms": 0, "end_ms": 1500 }],
        },
    })
}

fn translation_request(translation_id: &str) -> Value {
    json!({
        "provider": null,
        "content": {
            "kind": "translation",
            "translation_media_file_id": translation_id,
            "links": [{ "spans": [span(0, 12)], "translation_spans": [span(0, 10)] }],
        },
    })
}

async fn add_alignment(server: &TestServer, book_id: &str, request: &Value) -> Value {
    let response = server
        .post_json(&alignments_route(PROJECT, book_id, ""), request)
        .await;
    assert_eq!(response.status, 201, "{}", response.text());
    response.json()
}

#[tokio::test(flavor = "multi_thread")]
async fn a_new_document_has_no_alignments() {
    let server = spawn_test_server(false).await;
    let book_id = add_media(&server, PROJECT, "book.epub").await;
    let response = server.get(&alignments_route(PROJECT, &book_id, "")).await;
    assert_eq!(response.json(), json!({ "alignments": [] }));
}

#[tokio::test(flavor = "multi_thread")]
async fn an_added_alignment_is_listed() {
    let server = spawn_test_server(false).await;
    let book_id = add_media(&server, PROJECT, "book.epub").await;
    let audio_id = add_media(&server, PROJECT, "book.mp3").await;
    let added = add_alignment(&server, &book_id, &audio_request(&audio_id)).await;
    let response = server.get(&alignments_route(PROJECT, &book_id, "")).await;
    assert_eq!(response.json(), json!({ "alignments": [added] }));
}

#[tokio::test(flavor = "multi_thread")]
async fn an_added_alignment_keeps_its_content() {
    let server = spawn_test_server(false).await;
    let book_id = add_media(&server, PROJECT, "book.epub").await;
    let audio_id = add_media(&server, PROJECT, "book.mp3").await;
    let added = add_alignment(&server, &book_id, &audio_request(&audio_id)).await;
    assert_eq!(added["content"], audio_request(&audio_id)["content"]);
}

#[tokio::test(flavor = "multi_thread")]
async fn an_added_alignment_keeps_the_quotes_of_its_spans() {
    let server = spawn_test_server(false).await;
    let book_id = add_media(&server, PROJECT, "book.epub").await;
    let audio_id = add_media(&server, PROJECT, "book.mp3").await;
    let mut request = audio_request(&audio_id);
    request["content"]["segments"][0]["span"]["quote"] = json!("Hello there!");
    let added = add_alignment(&server, &book_id, &request).await;
    assert_eq!(
        added["content"]["segments"][0]["span"]["quote"],
        json!("Hello there!")
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn does_not_list_the_alignments_of_a_media_file_of_another_project() {
    let server = spawn_test_server(false).await;
    let book_id = add_media(&server, OTHER_PROJECT, "book.epub").await;
    let response = server.get(&alignments_route(PROJECT, &book_id, "")).await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_an_alignment_for_a_media_file_of_another_project() {
    let server = spawn_test_server(false).await;
    let book_id = add_media(&server, OTHER_PROJECT, "book.epub").await;
    let audio_id = add_media(&server, PROJECT, "book.mp3").await;
    let response = server
        .post_json(
            &alignments_route(PROJECT, &book_id, ""),
            &audio_request(&audio_id),
        )
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_a_counterpart_of_another_project() {
    let server = spawn_test_server(false).await;
    let book_id = add_media(&server, PROJECT, "book.epub").await;
    let audio_id = add_media(&server, OTHER_PROJECT, "book.mp3").await;
    let response = server
        .post_json(
            &alignments_route(PROJECT, &book_id, ""),
            &audio_request(&audio_id),
        )
        .await;
    assert_eq!(response.status, 400);
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_an_audio_alignment_with_a_document() {
    let server = spawn_test_server(false).await;
    let book_id = add_media(&server, PROJECT, "book.epub").await;
    let other_book_id = add_media(&server, PROJECT, "other.epub").await;
    let response = server
        .post_json(
            &alignments_route(PROJECT, &book_id, ""),
            &audio_request(&other_book_id),
        )
        .await;
    assert_eq!(response.status, 400);
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_a_translation_alignment_with_an_audio_file() {
    let server = spawn_test_server(false).await;
    let book_id = add_media(&server, PROJECT, "book.epub").await;
    let audio_id = add_media(&server, PROJECT, "book.mp3").await;
    let response = server
        .post_json(
            &alignments_route(PROJECT, &book_id, ""),
            &translation_request(&audio_id),
        )
        .await;
    assert_eq!(response.status, 400);
}

#[tokio::test(flavor = "multi_thread")]
async fn adds_a_translation_alignment_with_a_document() {
    let server = spawn_test_server(false).await;
    let book_id = add_media(&server, PROJECT, "book.epub").await;
    let translation_id = add_media(&server, PROJECT, "translation.txt").await;
    let added = add_alignment(&server, &book_id, &translation_request(&translation_id)).await;
    assert_eq!(
        added["content"]["translation_media_file_id"],
        json!(translation_id)
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_a_segment_that_ends_before_it_starts() {
    let server = spawn_test_server(false).await;
    let book_id = add_media(&server, PROJECT, "book.epub").await;
    let audio_id = add_media(&server, PROJECT, "book.mp3").await;
    let mut request = audio_request(&audio_id);
    request["content"]["segments"][0]["start_ms"] = json!(2000);
    let response = server
        .post_json(&alignments_route(PROJECT, &book_id, ""), &request)
        .await;
    assert_eq!(response.status, 400);
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_a_span_whose_quote_is_not_as_long_as_the_span() {
    let server = spawn_test_server(false).await;
    let book_id = add_media(&server, PROJECT, "book.epub").await;
    let audio_id = add_media(&server, PROJECT, "book.mp3").await;
    let mut request = audio_request(&audio_id);
    request["content"]["segments"][0]["span"]["quote"] = json!("too short");
    let response = server
        .post_json(&alignments_route(PROJECT, &book_id, ""), &request)
        .await;
    assert_eq!(response.status, 400);
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_a_translation_link_with_no_spans_on_either_side() {
    let server = spawn_test_server(false).await;
    let book_id = add_media(&server, PROJECT, "book.epub").await;
    let translation_id = add_media(&server, PROJECT, "translation.txt").await;
    let request = json!({
        "provider": null,
        "content": {
            "kind": "translation",
            "translation_media_file_id": translation_id,
            "links": [{ "spans": [], "translation_spans": [] }],
        },
    });
    let response = server
        .post_json(&alignments_route(PROJECT, &book_id, ""), &request)
        .await;
    assert_eq!(response.status, 400);
}

#[tokio::test(flavor = "multi_thread")]
async fn removes_an_alignment() {
    let server = spawn_test_server(false).await;
    let book_id = add_media(&server, PROJECT, "book.epub").await;
    let audio_id = add_media(&server, PROJECT, "book.mp3").await;
    let added = add_alignment(&server, &book_id, &audio_request(&audio_id)).await;
    let id = added["id"].as_str().unwrap();
    let response = server
        .delete(&alignments_route(PROJECT, &book_id, &format!("/{id}")))
        .await;
    assert_eq!(response.status, 204);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_removed_alignment_is_no_longer_listed() {
    let server = spawn_test_server(false).await;
    let book_id = add_media(&server, PROJECT, "book.epub").await;
    let audio_id = add_media(&server, PROJECT, "book.mp3").await;
    let added = add_alignment(&server, &book_id, &audio_request(&audio_id)).await;
    let id = added["id"].as_str().unwrap();
    server
        .delete(&alignments_route(PROJECT, &book_id, &format!("/{id}")))
        .await;
    let response = server.get(&alignments_route(PROJECT, &book_id, "")).await;
    assert_eq!(response.json(), json!({ "alignments": [] }));
}

#[tokio::test(flavor = "multi_thread")]
async fn removing_an_unknown_alignment_fails() {
    let server = spawn_test_server(false).await;
    let book_id = add_media(&server, PROJECT, "book.epub").await;
    let response = server
        .delete(&alignments_route(PROJECT, &book_id, "/missing"))
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn removing_the_audio_file_removes_the_alignment() {
    let server = spawn_test_server(false).await;
    let book_id = add_media(&server, PROJECT, "book.epub").await;
    let audio_id = add_media(&server, PROJECT, "book.mp3").await;
    add_alignment(&server, &book_id, &audio_request(&audio_id)).await;
    server
        .delete(&format!("/projects/{PROJECT}/media/{audio_id}"))
        .await;
    let response = server.get(&alignments_route(PROJECT, &book_id, "")).await;
    assert_eq!(response.json(), json!({ "alignments": [] }));
}

#[tokio::test(flavor = "multi_thread")]
async fn setting_the_translation_document_answers_the_updated_media_file() {
    let server = spawn_test_server(false).await;
    let book_id = add_media(&server, PROJECT, "book.epub").await;
    let translation_id = add_media(&server, PROJECT, "translation.txt").await;
    let response = server
        .put_json(
            &translation_document_route(&book_id),
            &json!({ "translation_media_file_id": translation_id }),
        )
        .await;
    assert_eq!(
        response.json()["translation_media_file_id"],
        json!(translation_id)
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn the_translation_document_shows_in_the_media_file_listing() {
    let server = spawn_test_server(false).await;
    let book_id = add_media(&server, PROJECT, "book.epub").await;
    let translation_id = add_media(&server, PROJECT, "translation.txt").await;
    server
        .put_json(
            &translation_document_route(&book_id),
            &json!({ "translation_media_file_id": translation_id }),
        )
        .await;
    let listed = server.get(&format!("/projects/{PROJECT}/media")).await;
    assert_eq!(
        listed.json()["media_files"][0]["translation_media_file_id"],
        json!(translation_id)
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn clears_the_translation_document() {
    let server = spawn_test_server(false).await;
    let book_id = add_media(&server, PROJECT, "book.epub").await;
    let translation_id = add_media(&server, PROJECT, "translation.txt").await;
    server
        .put_json(
            &translation_document_route(&book_id),
            &json!({ "translation_media_file_id": translation_id }),
        )
        .await;
    let response = server
        .put_json(
            &translation_document_route(&book_id),
            &json!({ "translation_media_file_id": null }),
        )
        .await;
    assert_eq!(response.json()["translation_media_file_id"], Value::Null);
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_a_translation_document_of_another_project() {
    let server = spawn_test_server(false).await;
    let book_id = add_media(&server, PROJECT, "book.epub").await;
    let translation_id = add_media(&server, OTHER_PROJECT, "translation.txt").await;
    let response = server
        .put_json(
            &translation_document_route(&book_id),
            &json!({ "translation_media_file_id": translation_id }),
        )
        .await;
    assert_eq!(response.status, 400);
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_an_audio_file_as_a_translation_document() {
    let server = spawn_test_server(false).await;
    let book_id = add_media(&server, PROJECT, "book.epub").await;
    let audio_id = add_media(&server, PROJECT, "book.mp3").await;
    let response = server
        .put_json(
            &translation_document_route(&book_id),
            &json!({ "translation_media_file_id": audio_id }),
        )
        .await;
    assert_eq!(response.status, 400);
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_a_document_as_its_own_translation() {
    let server = spawn_test_server(false).await;
    let book_id = add_media(&server, PROJECT, "book.epub").await;
    let response = server
        .put_json(
            &translation_document_route(&book_id),
            &json!({ "translation_media_file_id": book_id }),
        )
        .await;
    assert_eq!(response.status, 400);
}

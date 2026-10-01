mod support;

use serde_json::json;
use support::{fixture_path, read_fixture, spawn_test_server};

#[tokio::test(flavor = "multi_thread")]
async fn parses_a_raw_epub_body_into_two_chapters() {
    let server = spawn_test_server(false).await;
    let response = server
        .post_bytes(
            "/documents/parse",
            "application/epub+zip",
            read_fixture("sample.epub"),
        )
        .await;
    assert_eq!(response.json()["chapters"].as_array().unwrap().len(), 2);
}

#[tokio::test(flavor = "multi_thread")]
async fn parses_a_local_epub_to_the_same_document() {
    let server = spawn_test_server(true).await;
    let uploaded = server
        .post_bytes(
            "/documents/parse",
            "application/epub+zip",
            read_fixture("sample.epub"),
        )
        .await;
    let local = server
        .post_json(
            "/documents/parse-local",
            &json!({ "path": fixture_path("sample.epub") }),
        )
        .await;
    assert_eq!(local.json(), uploaded.json());
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_a_local_epub_when_not_allowed() {
    let server = spawn_test_server(false).await;
    let response = server
        .post_json(
            "/documents/parse-local",
            &json!({ "path": fixture_path("sample.epub") }),
        )
        .await;
    assert_eq!(response.status, 403);
}

#[tokio::test(flavor = "multi_thread")]
async fn parses_a_plain_text_body_into_one_chapter() {
    let server = spawn_test_server(false).await;
    let response = server
        .post_bytes(
            "/documents/parse",
            "text/plain",
            b"Hello there.\n\nGoodbye.".to_vec(),
        )
        .await;
    assert_eq!(response.json()["chapters"].as_array().unwrap().len(), 1);
}

#[tokio::test(flavor = "multi_thread")]
async fn honors_the_format_query_parameter() {
    let server = spawn_test_server(false).await;
    let response = server
        .post_bytes(
            "/documents/parse?format=plain_text",
            "application/epub+zip",
            b"Not really an EPUB.".to_vec(),
        )
        .await;
    assert_eq!(response.json()["chapters"].as_array().unwrap().len(), 1);
}

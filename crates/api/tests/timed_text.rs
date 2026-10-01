mod support;

use easyimmerse_core::timed_text::parse_timed_text;
use serde_json::{Value, json};
use support::{fixture_path, read_fixture, spawn_test_server};

fn fixture_text() -> String {
    String::from_utf8(read_fixture("sample.srt")).unwrap()
}

fn expected_track() -> Value {
    serde_json::to_value(parse_timed_text(&fixture_text(), None).unwrap()).unwrap()
}

fn path_request() -> Value {
    json!({ "source": { "kind": "path", "path": fixture_path("sample.srt") } })
}

#[tokio::test(flavor = "multi_thread")]
async fn parses_inline_text_to_four_cues() {
    let server = spawn_test_server(false).await;
    let request = json!({ "source": { "kind": "inline", "text": fixture_text() } });
    let response = server.post_json("/timed-text/parse", &request).await;
    assert_eq!(response.json()["cues"].as_array().unwrap().len(), 4);
}

#[tokio::test(flavor = "multi_thread")]
async fn parses_inline_text_to_the_same_track_as_core() {
    let server = spawn_test_server(false).await;
    let request = json!({ "source": { "kind": "inline", "text": fixture_text() } });
    let response = server.post_json("/timed-text/parse", &request).await;
    assert_eq!(response.json(), expected_track());
}

#[tokio::test(flavor = "multi_thread")]
async fn parses_a_local_path_when_allowed() {
    let server = spawn_test_server(true).await;
    let response = server.post_json("/timed-text/parse", &path_request()).await;
    assert_eq!(response.json(), expected_track());
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_a_local_path_when_not_allowed() {
    let server = spawn_test_server(false).await;
    let response = server.post_json("/timed-text/parse", &path_request()).await;
    assert_eq!(response.status, 403);
}

#[tokio::test(flavor = "multi_thread")]
async fn names_the_refusal_code() {
    let server = spawn_test_server(false).await;
    let response = server.post_json("/timed-text/parse", &path_request()).await;
    assert_eq!(response.json()["code"], "local_paths_not_allowed");
}

#[tokio::test(flavor = "multi_thread")]
async fn rejects_text_that_does_not_match_the_given_format() {
    let server = spawn_test_server(false).await;
    let request =
        json!({ "source": { "kind": "inline", "text": fixture_text() }, "format": "vtt" });
    let response = server.post_json("/timed-text/parse", &request).await;
    assert_eq!(response.status, 400);
}

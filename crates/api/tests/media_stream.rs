mod support;

use serde_json::Value;
use support::{
    TOKEN, TestRequest, TestServer, browser_source, path_source, read_fixture, spawn_test_server,
};

/// Registers a media file and returns the path of its stream route.
async fn stream_path(server: &TestServer, source: Value) -> String {
    let project_id = server.create_project().await;
    let media_id = server.add_media(&project_id, "sample.mp4", source).await;
    format!("/projects/{project_id}/media/{media_id}/stream")
}

async fn mp4_stream_request(server: &TestServer) -> TestRequest {
    server.request("GET", &stream_path(server, path_source("sample.mp4")).await)
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_a_range_as_partial_content() {
    let server = spawn_test_server(true).await;
    let response = mp4_stream_request(&server)
        .await
        .header("Range", "bytes=0-99")
        .send()
        .await;
    assert_eq!(response.status, 206);
}

#[tokio::test(flavor = "multi_thread")]
async fn names_the_served_range_and_the_file_size() {
    let server = spawn_test_server(true).await;
    let response = mp4_stream_request(&server)
        .await
        .header("Range", "bytes=0-99")
        .send()
        .await;
    let expected = format!("bytes 0-99/{}", read_fixture("sample.mp4").len());
    assert_eq!(response.header("Content-Range"), Some(expected.as_str()));
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_exactly_the_requested_bytes() {
    let server = spawn_test_server(true).await;
    let response = mp4_stream_request(&server)
        .await
        .header("Range", "bytes=0-99")
        .send()
        .await;
    assert_eq!(response.bytes, read_fixture("sample.mp4")[..100]);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_range_beyond_the_end_of_the_file_is_not_satisfiable() {
    let server = spawn_test_server(true).await;
    let response = mp4_stream_request(&server)
        .await
        .header("Range", "bytes=99999999-")
        .send()
        .await;
    assert_eq!(response.status, 416);
}

#[tokio::test(flavor = "multi_thread")]
async fn an_unsatisfiable_range_response_names_the_file_size() {
    let server = spawn_test_server(true).await;
    let response = mp4_stream_request(&server)
        .await
        .header("Range", "bytes=99999999-")
        .send()
        .await;
    let expected = format!("bytes */{}", read_fixture("sample.mp4").len());
    assert_eq!(response.header("Content-Range"), Some(expected.as_str()));
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_the_whole_file_without_a_range() {
    let server = spawn_test_server(true).await;
    let response = mp4_stream_request(&server).await.send().await;
    assert_eq!(response.bytes, read_fixture("sample.mp4"));
}

#[tokio::test(flavor = "multi_thread")]
async fn advertises_range_support() {
    let server = spawn_test_server(true).await;
    let response = mp4_stream_request(&server).await.send().await;
    assert_eq!(response.header("Accept-Ranges"), Some("bytes"));
}

#[tokio::test(flavor = "multi_thread")]
async fn guesses_the_content_type_from_the_extension() {
    let server = spawn_test_server(true).await;
    let response = mp4_stream_request(&server).await.send().await;
    assert_eq!(response.header("Content-Type"), Some("video/mp4"));
}

#[tokio::test(flavor = "multi_thread")]
async fn accepts_the_token_as_a_query_parameter() {
    let server = spawn_test_server(true).await;
    let path = stream_path(&server, path_source("sample.mp4")).await;
    let response = server
        .request("GET", &format!("{path}?token={TOKEN}"))
        .without_token()
        .send()
        .await;
    assert_eq!(response.status, 200);
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_streaming_when_local_paths_are_not_allowed() {
    let server = spawn_test_server(false).await;
    let response = mp4_stream_request(&server).await.send().await;
    assert_eq!(response.status, 403);
}

#[tokio::test(flavor = "multi_thread")]
async fn cannot_stream_a_file_the_browser_holds() {
    let server = spawn_test_server(true).await;
    let path = stream_path(&server, browser_source()).await;
    let response = server.get(&path).await;
    assert_eq!(response.json()["code"], "not_resolvable");
}

#[tokio::test(flavor = "multi_thread")]
async fn a_missing_file_is_not_found() {
    let server = spawn_test_server(true).await;
    let path = stream_path(&server, path_source("missing.mp4")).await;
    assert_eq!(server.get(&path).await.status, 404);
}

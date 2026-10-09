use easyimmerse_core::media_file::MediaFileSource;
use easyimmerse_core::project::ProjectId;
use serde_json::{Value, json};

use crate::support::{
    TestServer, fixture_path, seeded_storage, spawn_test_server, spawn_test_server_with_storage,
};

const PROJECT: &str = "placeholder-1";

fn path_source(name: &str) -> Value {
    json!({ "kind": "path", "path": fixture_path(name) })
}

fn browser_source() -> Value {
    json!({ "kind": "browser_file", "size": 48822, "last_modified_ms": 1700000000000u64 })
}

async fn add(server: &TestServer, name: &str, source: Value) -> Value {
    let response = server
        .post_json(
            &format!("/projects/{PROJECT}/media"),
            &json!({ "name": name, "source": source }),
        )
        .await;
    assert_eq!(response.status, 201, "{}", response.text());
    response.json()
}

fn stream_path(media_file: &Value) -> String {
    format!(
        "/projects/{PROJECT}/media/{}/stream",
        media_file["id"].as_str().unwrap()
    )
}

#[tokio::test(flavor = "multi_thread")]
async fn lists_no_media_files_for_a_new_project() {
    let server = spawn_test_server(false).await;
    let response = server.get(&format!("/projects/{PROJECT}/media")).await;
    assert_eq!(response.json()["media_files"], json!([]));
}

#[tokio::test(flavor = "multi_thread")]
async fn lists_an_added_media_file() {
    let server = spawn_test_server(true).await;
    let added = add(&server, "sample.mp4", path_source("sample.mp4")).await;
    let response = server.get(&format!("/projects/{PROJECT}/media")).await;
    assert_eq!(response.json()["media_files"], json!([added]));
}

#[tokio::test(flavor = "multi_thread")]
async fn an_added_media_file_carries_its_canonical_path() {
    let server = spawn_test_server(true).await;
    let added = add(&server, "sample.mp4", path_source("sample.mp4")).await;
    let canonical = fixture_path("sample.mp4").canonicalize().unwrap();
    assert_eq!(
        added["source"],
        json!({ "kind": "path", "path": canonical })
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_a_path_source_when_local_paths_are_not_allowed() {
    let server = spawn_test_server(false).await;
    let response = server
        .post_json(
            &format!("/projects/{PROJECT}/media"),
            &json!({ "name": "a", "source": path_source("sample.mp4") }),
        )
        .await;
    assert_eq!(response.status, 403);
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_a_path_source_that_names_no_file() {
    let server = spawn_test_server(true).await;
    let response = server
        .post_json(
            &format!("/projects/{PROJECT}/media"),
            &json!({ "name": "a", "source": path_source("missing.mp4") }),
        )
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn accepts_a_browser_file_source_without_local_path_permission() {
    let server = spawn_test_server(false).await;
    let added = add(&server, "clip.webm", browser_source()).await;
    assert_eq!(added["source"], browser_source());
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_to_add_to_an_unknown_project() {
    let server = spawn_test_server(false).await;
    let response = server
        .post_json(
            "/projects/missing/media",
            &json!({ "name": "a", "source": browser_source() }),
        )
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn removes_a_media_file() {
    let server = spawn_test_server(false).await;
    let added = add(&server, "clip.webm", browser_source()).await;
    let id = added["id"].as_str().unwrap();
    let response = server
        .delete(&format!("/projects/{PROJECT}/media/{id}"))
        .await;
    assert_eq!(response.status, 204);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_removed_media_file_is_no_longer_listed() {
    let server = spawn_test_server(false).await;
    let added = add(&server, "clip.webm", browser_source()).await;
    let id = added["id"].as_str().unwrap();
    server
        .delete(&format!("/projects/{PROJECT}/media/{id}"))
        .await;
    let response = server.get(&format!("/projects/{PROJECT}/media")).await;
    assert_eq!(response.json()["media_files"], json!([]));
}

#[tokio::test(flavor = "multi_thread")]
async fn does_not_remove_a_media_file_through_another_project() {
    let server = spawn_test_server(false).await;
    let added = add(&server, "clip.webm", browser_source()).await;
    let id = added["id"].as_str().unwrap();
    let response = server
        .delete(&format!("/projects/placeholder-2/media/{id}"))
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn streams_the_whole_file() {
    let server = spawn_test_server(true).await;
    let added = add(&server, "sample.mp4", path_source("sample.mp4")).await;
    let response = server.get(&stream_path(&added)).await;
    assert_eq!(
        response.bytes,
        std::fs::read(fixture_path("sample.mp4")).unwrap()
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn answers_a_whole_file_request_with_200() {
    let server = spawn_test_server(true).await;
    let added = add(&server, "sample.mp4", path_source("sample.mp4")).await;
    let response = server.get(&stream_path(&added)).await;
    assert_eq!(response.status, 200);
}

#[tokio::test(flavor = "multi_thread")]
async fn advertises_byte_ranges() {
    let server = spawn_test_server(true).await;
    let added = add(&server, "sample.mp4", path_source("sample.mp4")).await;
    let response = server.get(&stream_path(&added)).await;
    assert_eq!(response.header("accept-ranges"), Some("bytes"));
}

#[tokio::test(flavor = "multi_thread")]
async fn guesses_the_content_type_from_the_extension() {
    let server = spawn_test_server(true).await;
    let added = add(&server, "sample.mp4", path_source("sample.mp4")).await;
    let response = server.get(&stream_path(&added)).await;
    assert_eq!(response.header("content-type"), Some("video/mp4"));
}

#[tokio::test(flavor = "multi_thread")]
async fn answers_a_range_request_with_206() {
    let server = spawn_test_server(true).await;
    let added = add(&server, "sample.mp4", path_source("sample.mp4")).await;
    let response = server
        .request("GET", &stream_path(&added))
        .header("Range", "bytes=0-3")
        .send()
        .await;
    assert_eq!(response.status, 206);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_range_response_carries_the_requested_bytes() {
    let server = spawn_test_server(true).await;
    let added = add(&server, "sample.mp4", path_source("sample.mp4")).await;
    let response = server
        .request("GET", &stream_path(&added))
        .header("Range", "bytes=4-7")
        .send()
        .await;
    assert_eq!(response.bytes, b"ftyp");
}

#[tokio::test(flavor = "multi_thread")]
async fn a_range_response_names_its_position_in_the_file() {
    let server = spawn_test_server(true).await;
    let added = add(&server, "sample.mp4", path_source("sample.mp4")).await;
    let size = std::fs::metadata(fixture_path("sample.mp4")).unwrap().len();
    let response = server
        .request("GET", &stream_path(&added))
        .header("Range", "bytes=4-7")
        .send()
        .await;
    assert_eq!(
        response.header("content-range"),
        Some(format!("bytes 4-7/{size}").as_str())
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn a_range_past_the_end_is_unsatisfiable() {
    let server = spawn_test_server(true).await;
    let added = add(&server, "sample.mp4", path_source("sample.mp4")).await;
    let response = server
        .request("GET", &stream_path(&added))
        .header("Range", "bytes=999999999-")
        .send()
        .await;
    assert_eq!(response.status, 416);
}

#[tokio::test(flavor = "multi_thread")]
async fn accepts_the_token_as_a_query_parameter() {
    let server = spawn_test_server(true).await;
    let added = add(&server, "sample.mp4", path_source("sample.mp4")).await;
    let response = server
        .request(
            "GET",
            &format!("{}?token={}", stream_path(&added), server.token),
        )
        .without_token()
        .send()
        .await;
    assert_eq!(response.status, 200);
}

/// A media element with `crossOrigin="anonymous"` on another origin needs the CORS header on
/// the stream response, or the page cannot draw its frames to a canvas.
#[tokio::test(flavor = "multi_thread")]
async fn a_cross_origin_stream_request_is_allowed() {
    let server = spawn_test_server(true).await;
    let added = add(&server, "sample.mp4", path_source("sample.mp4")).await;
    let response = server
        .request(
            "GET",
            &format!("{}?token={}", stream_path(&added), server.token),
        )
        .without_token()
        .header("Origin", "http://localhost:5173")
        .header("Range", "bytes=0-3")
        .send()
        .await;
    assert_eq!(response.header("access-control-allow-origin"), Some("*"));
}

#[tokio::test(flavor = "multi_thread")]
async fn rejects_a_wrong_query_token() {
    let server = spawn_test_server(true).await;
    let added = add(&server, "sample.mp4", path_source("sample.mp4")).await;
    let response = server
        .request("GET", &format!("{}?token=wrong", stream_path(&added)))
        .without_token()
        .send()
        .await;
    assert_eq!(response.status, 401);
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_to_stream_when_local_paths_are_not_allowed() {
    let storage = seeded_storage();
    let added = storage
        .add_media_file(
            &ProjectId(PROJECT.to_string()),
            "sample.mp4",
            &MediaFileSource::Path {
                path: fixture_path("sample.mp4").to_string_lossy().into_owned(),
            },
        )
        .unwrap();
    let server = spawn_test_server_with_storage(false, storage).await;
    let response = server
        .get(&format!("/projects/{PROJECT}/media/{}/stream", added.id.0))
        .await;
    assert_eq!(response.status, 403);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_browser_file_is_not_resolvable() {
    let server = spawn_test_server(true).await;
    let added = add(&server, "clip.webm", browser_source()).await;
    let response = server.get(&stream_path(&added)).await;
    assert_eq!(response.json()["code"], "not_resolvable");
}

#[tokio::test(flavor = "multi_thread")]
async fn a_browser_file_streams_as_not_found() {
    let server = spawn_test_server(true).await;
    let added = add(&server, "clip.webm", browser_source()).await;
    let response = server.get(&stream_path(&added)).await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn an_unknown_media_file_streams_as_not_found() {
    let server = spawn_test_server(true).await;
    let response = server
        .get(&format!("/projects/{PROJECT}/media/missing/stream"))
        .await;
    assert_eq!(response.status, 404);
}

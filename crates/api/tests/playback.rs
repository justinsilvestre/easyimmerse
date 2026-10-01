mod support;

use serde_json::{Value, json};
use support::{
    TestResponse, TestServer, browser_source, has_ffmpeg, spawn_converting_server,
    spawn_test_server,
};

/// Plans playback of a fixture in a new project.
async fn plan(server: &TestServer, fixture: &str, engine: &str, direct_play: bool) -> TestResponse {
    let media_path = server.add_fixture_media(fixture).await;
    server.plan_playback(&media_path, engine, direct_play).await
}

/// Plans the Matroska fixture for WebKit, which cannot play Matroska directly.
async fn plan_matroska(server: &TestServer) -> Value {
    plan(server, "conversion.mkv", "webkit", false).await.json()
}

fn is_conversion_key(text: &str) -> bool {
    text.len() == 64
        && text
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

#[tokio::test(flavor = "multi_thread")]
async fn tracks_of_a_server_file_are_read() {
    let server = spawn_test_server(true).await;
    let media_path = server.add_fixture_media("sample.mp4").await;
    let response = server.get(&format!("{media_path}/tracks")).await;
    assert_eq!(response.status, 200);
}

#[tokio::test(flavor = "multi_thread")]
async fn tracks_name_the_mime_type_for_direct_play() {
    let server = spawn_test_server(true).await;
    let media_path = server.add_fixture_media("sample.mp4").await;
    let tracks = server.get(&format!("{media_path}/tracks")).await.json();
    let direct_type = tracks["direct_type"].as_str().unwrap_or_default();
    assert!(direct_type.starts_with("video/mp4"), "{direct_type}");
}

#[tokio::test(flavor = "multi_thread")]
async fn tracks_of_a_file_the_browser_holds_cannot_be_read() {
    let server = spawn_test_server(true).await;
    let project_id = server.create_project().await;
    let media_id = server
        .add_media(&project_id, "a.mp4", browser_source())
        .await;
    let response = server
        .get(&format!("/projects/{project_id}/media/{media_id}/tracks"))
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn tracks_are_refused_when_local_paths_are_not_allowed() {
    let server = spawn_test_server(false).await;
    let media_path = server.add_fixture_media("sample.mp4").await;
    let response = server.get(&format!("{media_path}/tracks")).await;
    assert_eq!(response.status, 403);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_playable_mp4_is_planned_for_direct_play() {
    let server = spawn_test_server(true).await;
    let response = plan(&server, "sample.mp4", "chromium", true).await.json();
    assert_eq!(response["plan"], json!({ "kind": "direct" }));
}

#[tokio::test(flavor = "multi_thread")]
async fn a_direct_plan_has_no_playlist() {
    let server = spawn_test_server(true).await;
    let response = plan(&server, "sample.mp4", "chromium", true).await.json();
    assert_eq!(response["playlist_path"], Value::Null);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_conversion_is_unavailable_without_the_conversion_service() {
    if !has_ffmpeg() {
        return;
    }
    let server = spawn_test_server(true).await;
    let response = plan_matroska(&server).await;
    assert_eq!(
        response["plan"],
        json!({ "kind": "unsupported", "reason": "conversion_unavailable" })
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn matroska_is_planned_for_conversion_in_webkit() {
    if !has_ffmpeg() {
        return;
    }
    let (server, _cache) = spawn_converting_server().await;
    let response = plan_matroska(&server).await;
    assert_eq!(response["plan"]["kind"], "convert");
}

#[tokio::test(flavor = "multi_thread")]
async fn a_conversion_names_its_playlist() {
    if !has_ffmpeg() {
        return;
    }
    let (server, _cache) = spawn_converting_server().await;
    let response = plan_matroska(&server).await;
    let playlist_path = response["playlist_path"].as_str().unwrap_or_default();
    let key = playlist_path
        .strip_prefix("/conversions/")
        .and_then(|rest| rest.strip_suffix("/index.m3u8"))
        .unwrap_or_default();
    assert!(is_conversion_key(key), "{playlist_path}");
}

mod support;

use easyimmerse_core::timed_text::parse_timed_text;
use easyimmerse_media::{TrackKind, probe_container};
use serde_json::{Value, json};
use support::{
    TestResponse, TestServer, browser_source, id_of, path_source, read_fixture, spawn_test_server,
};

fn srt_cues() -> Value {
    let text = String::from_utf8(read_fixture("sample.srt")).unwrap();
    serde_json::to_value(parse_timed_text(&text, None).unwrap().cues).unwrap()
}

fn mp4_subtitle_track_id() -> u32 {
    probe_container(&read_fixture("sample.mp4"))
        .unwrap()
        .tracks
        .into_iter()
        .find(|track| track.kind == TrackKind::Subtitle)
        .unwrap()
        .id
}

fn file_track(source: Value) -> Value {
    json!({ "name": "English", "role": "target", "language": "en",
            "source": { "kind": "file", "source": source } })
}

fn embedded_track(track_id: u32) -> Value {
    json!({ "name": "English", "role": "target", "language": "en",
            "source": { "kind": "embedded", "track_id": track_id } })
}

/// Registers the media file, attaches the track, and fetches the track's cues.
async fn fetch_cues(
    server: &TestServer,
    media: &str,
    media_source: Value,
    track: Value,
) -> TestResponse {
    let project_id = server.create_project().await;
    let media_id = server.add_media(&project_id, media, media_source).await;
    let tracks_path = format!("/projects/{project_id}/media/{media_id}/subtitle-tracks");
    let track_id = id_of(&server.post_json(&tracks_path, &track).await);
    server.get(&format!("{tracks_path}/{track_id}/cues")).await
}

async fn list_embedded(server: &TestServer, media_source: Value) -> TestResponse {
    let project_id = server.create_project().await;
    let media_id = server
        .add_media(&project_id, "sample.mp4", media_source)
        .await;
    server
        .get(&format!(
            "/projects/{project_id}/media/{media_id}/embedded-subtitles"
        ))
        .await
}

#[tokio::test(flavor = "multi_thread")]
async fn reads_the_cues_of_a_subtitle_file_on_the_server() {
    let server = spawn_test_server(true).await;
    let track = file_track(path_source("sample.srt"));
    let response = fetch_cues(&server, "sample.mp4", browser_source(), track).await;
    assert_eq!(response.json()["cues"], srt_cues());
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_a_subtitle_file_when_local_paths_are_not_allowed() {
    let server = spawn_test_server(false).await;
    let track = file_track(path_source("sample.srt"));
    let response = fetch_cues(&server, "sample.mp4", browser_source(), track).await;
    assert_eq!(response.status, 403);
}

#[tokio::test(flavor = "multi_thread")]
async fn cannot_resolve_a_subtitle_file_the_browser_holds() {
    let server = spawn_test_server(true).await;
    let track = file_track(browser_source());
    let response = fetch_cues(&server, "sample.mp4", browser_source(), track).await;
    assert_eq!(response.json()["code"], "not_resolvable");
}

#[tokio::test(flavor = "multi_thread")]
async fn extracts_the_cues_of_a_track_embedded_in_an_mp4() {
    let server = spawn_test_server(true).await;
    let track = embedded_track(mp4_subtitle_track_id());
    let response = fetch_cues(&server, "sample.mp4", path_source("sample.mp4"), track).await;
    assert_eq!(response.json()["cues"], srt_cues());
}

#[tokio::test(flavor = "multi_thread")]
async fn reports_embedded_subtitles_in_matroska_as_unsupported() {
    let server = spawn_test_server(true).await;
    let track = embedded_track(3);
    let response = fetch_cues(&server, "sample.mkv", path_source("sample.mkv"), track).await;
    assert_eq!(response.json()["code"], "embedded_subtitles_unsupported");
}

#[tokio::test(flavor = "multi_thread")]
async fn the_cues_of_an_unknown_subtitle_track_are_not_found() {
    let server = spawn_test_server(true).await;
    let project_id = server.create_project().await;
    let media_id = server
        .add_media(&project_id, "sample.mp4", path_source("sample.mp4"))
        .await;
    let response = server
        .get(&format!(
            "/projects/{project_id}/media/{media_id}/subtitle-tracks/missing/cues"
        ))
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn lists_the_subtitle_track_embedded_in_an_mp4() {
    let server = spawn_test_server(true).await;
    let response = list_embedded(&server, path_source("sample.mp4")).await;
    assert_eq!(
        response.json()["tracks"][0]["track_id"],
        mp4_subtitle_track_id()
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn reports_the_language_of_an_embedded_track() {
    let server = spawn_test_server(true).await;
    let response = list_embedded(&server, path_source("sample.mp4")).await;
    assert_eq!(response.json()["tracks"][0]["language"], "eng");
}

#[tokio::test(flavor = "multi_thread")]
async fn cannot_list_the_embedded_subtitles_of_a_browser_file() {
    let server = spawn_test_server(true).await;
    let response = list_embedded(&server, browser_source()).await;
    assert_eq!(response.json()["code"], "not_resolvable");
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_to_list_embedded_subtitles_when_local_paths_are_not_allowed() {
    let server = spawn_test_server(false).await;
    let response = list_embedded(&server, path_source("sample.mp4")).await;
    assert_eq!(response.status, 403);
}

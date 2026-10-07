//! The text subtitle tracks inside a media file, added as its subtitle tracks when the file
//! is added by path. These tests skip when ffmpeg and ffprobe are not found.

use serde_json::{Value, json};
use tempfile::TempDir;

use crate::support::{TestServer, ffmpeg_available, read_fixture, spawn_test_server};

const PROJECT: &str = "placeholder-1";

/// A folder holding only `Episode.mkv`, whose English SubRip track matches `sample.srt`.
fn media_folder() -> TempDir {
    let folder = TempDir::new().expect("a temporary folder");
    std::fs::write(
        folder.path().join("Episode.mkv"),
        read_fixture("sample.mkv"),
    )
    .unwrap();
    folder
}

async fn add_episode(server: &TestServer, folder: &TempDir) -> String {
    let path = folder.path().join("Episode.mkv");
    let response = server
        .post_json(
            &format!("/projects/{PROJECT}/media"),
            &json!({ "name": "Episode.mkv", "source": { "kind": "path", "path": path } }),
        )
        .await;
    assert_eq!(response.status, 201, "{}", response.text());
    response.json()["id"].as_str().unwrap().to_string()
}

async fn list_tracks(server: &TestServer, media_id: &str) -> Value {
    server
        .get(&format!("/projects/{PROJECT}/media/{media_id}/subtitles"))
        .await
        .json()
}

#[tokio::test(flavor = "multi_thread")]
async fn adds_the_embedded_text_track() {
    if !ffmpeg_available() {
        return;
    }
    let server = spawn_test_server(true).await;
    let folder = media_folder();
    let media_id = add_episode(&server, &folder).await;
    let listed = list_tracks(&server, &media_id).await;
    assert_eq!(listed["tracks"][0]["name"], "Embedded track 1 (eng)");
}

#[tokio::test(flavor = "multi_thread")]
async fn the_embedded_track_has_the_cues_of_the_subtitles_file() {
    if !ffmpeg_available() {
        return;
    }
    let server = spawn_test_server(true).await;
    let folder = media_folder();
    let media_id = add_episode(&server, &folder).await;
    let track_id = list_tracks(&server, &media_id).await["tracks"][0]["id"].clone();
    let cues = server
        .get(&format!(
            "/projects/{PROJECT}/media/{media_id}/subtitles/{}/cues",
            track_id.as_str().unwrap_or_default()
        ))
        .await
        .json();
    let expected = server
        .post_json(
            "/timed-text/parse",
            &json!({ "source": { "kind": "inline", "text": String::from_utf8(read_fixture("sample.srt")).unwrap() }, "format": "srt" }),
        )
        .await
        .json();
    assert_eq!(cues["cues"], expected["cues"]);
}

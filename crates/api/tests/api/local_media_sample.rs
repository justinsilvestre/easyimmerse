//! Adds a media file from the developer's own library, named by `EASYIMMERSE_SAMPLE_MEDIA`, to
//! the Japanese project. The file should hold an English text subtitle track and sit beside a
//! Japanese `.ja.srt` file. These tests skip when the variable is unset, so they never run in CI.

use std::time::Instant;

use serde_json::{Value, json};

use crate::support::{TestServer, spawn_test_server};

/// A project whose target language is Japanese and whose translation language is English.
const PROJECT: &str = "placeholder-2";

fn sample_media_path() -> Option<String> {
    let path = std::env::var("EASYIMMERSE_SAMPLE_MEDIA").ok();
    if path.is_none() {
        eprintln!("skipped: EASYIMMERSE_SAMPLE_MEDIA is unset");
    }
    path
}

async fn add_sample_and_list_tracks(server: &TestServer, path: &str) -> Value {
    let started = Instant::now();
    let response = server
        .post_json(
            &format!("/projects/{PROJECT}/media"),
            &json!({ "name": "Sample", "source": { "kind": "path", "path": path } }),
        )
        .await;
    eprintln!("adding the sample took {:?}", started.elapsed());
    assert_eq!(response.status, 201, "{}", response.text());
    let media_id = response.json()["id"].as_str().unwrap().to_string();
    server
        .get(&format!("/projects/{PROJECT}/media/{media_id}/subtitles"))
        .await
        .json()
}

fn embedded_track_id(listed: &Value) -> Value {
    listed["tracks"]
        .as_array()
        .unwrap()
        .iter()
        .find(|track| {
            track["name"]
                .as_str()
                .unwrap()
                .starts_with("Embedded track")
        })
        .unwrap_or_else(|| panic!("no embedded track was added: {listed:#}"))["id"]
        .clone()
}

#[tokio::test(flavor = "multi_thread")]
async fn adds_the_embedded_english_track_as_the_translation() {
    let Some(path) = sample_media_path() else {
        return;
    };
    let server = spawn_test_server(true).await;
    let listed = add_sample_and_list_tracks(&server, &path).await;
    assert_eq!(
        listed["selection"]["translation_track_id"],
        embedded_track_id(&listed),
        "{listed:#}"
    );
}

use serde_json::{Value, json};
use tempfile::TempDir;

use crate::support::{TestServer, read_fixture, spawn_test_server};

/// A Spanish-learning project whose translation language is English.
const PROJECT: &str = "placeholder-1";

/// A folder holding `Show.mp4` with a Spanish SubRip file, an English WebVTT file,
/// a French file that does not parse, and the subtitles of another episode.
/// `Show.mp4` has no subtitle track of its own.
fn media_folder() -> TempDir {
    let folder = TempDir::new().expect("a temporary folder");
    let write = |name: &str, bytes: &[u8]| std::fs::write(folder.path().join(name), bytes);
    write("Show.mp4", &read_fixture("conversion-h264-aac.mp4")).unwrap();
    write("Show.es.srt", &read_fixture("sample.srt")).unwrap();
    write("Show.en.vtt", &read_fixture("sample.vtt")).unwrap();
    write("Show.fr.vtt", b"not subtitles").unwrap();
    write("Show.S01E02.srt", &read_fixture("sample.srt")).unwrap();
    folder
}

async fn add_show(server: &TestServer, folder: &TempDir) -> String {
    let path = folder.path().join("Show.mp4");
    let response = server
        .post_json(
            &format!("/projects/{PROJECT}/media"),
            &json!({ "name": "Show.mp4", "source": { "kind": "path", "path": path } }),
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

fn track_id_named(listed: &Value, name: &str) -> Value {
    listed["tracks"]
        .as_array()
        .unwrap()
        .iter()
        .find(|track| track["name"] == name)
        .map_or(Value::Null, |track| track["id"].clone())
}

#[tokio::test(flavor = "multi_thread")]
async fn adds_the_parsable_sidecar_files_as_tracks() {
    let server = spawn_test_server(true).await;
    let folder = media_folder();
    let media_id = add_show(&server, &folder).await;
    let listed = list_tracks(&server, &media_id).await;
    let names: Vec<&str> = listed["tracks"]
        .as_array()
        .unwrap()
        .iter()
        .map(|track| track["name"].as_str().unwrap())
        .collect();
    assert_eq!(names, ["Show.en.vtt", "Show.es.srt"]);
}

#[tokio::test(flavor = "multi_thread")]
async fn selects_the_sidecar_tracks_by_the_project_languages() {
    let server = spawn_test_server(true).await;
    let folder = media_folder();
    let media_id = add_show(&server, &folder).await;
    let listed = list_tracks(&server, &media_id).await;
    assert_eq!(
        listed["selection"],
        json!({
            "target_track_id": track_id_named(&listed, "Show.es.srt"),
            "translation_track_id": track_id_named(&listed, "Show.en.vtt"),
        })
    );
}

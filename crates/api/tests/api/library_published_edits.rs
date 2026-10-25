//! Changes to the words, subtitles and file of a library item after it is published, which its learners see at once.
//! The tests that publish a video skip when ffmpeg and ffprobe are not found.

use easyimmerse_storage::Storage;
use serde_json::{Value, json};

use crate::library::{
    create_item, draft, library_server, library_server_on, published_document, published_video,
    put_words, upload, word,
};
use crate::stored_copies::sign_up;
use crate::support::{TestResponse, TestServer, ffmpeg_available, read_fixture};
use crate::sync::send_as;

/// Subtitles with one cue, at a time none of the sample's cues has.
const NEW_SUBTITLES: &str = "1\n00:00:02,000 --> 00:00:03,500\nNeu.\n";

async fn put_subtitles(server: &TestServer, item_id: &str, subtitles: &str) -> TestResponse {
    let body = json!({ "target_text": subtitles, "translation_text": null, "format": null });
    server
        .put_json(&format!("/library/items/{item_id}/subtitles"), &body)
        .await
}

/// The text of the sample subtitles as a new item of the kind stores it.
async fn sample_text_of_new(server: &TestServer, kind: &str) -> Value {
    let item_id = create_item(server, kind).await;
    let subtitles = String::from_utf8(read_fixture("sample.srt")).unwrap();
    put_subtitles(server, &item_id, &subtitles).await.json()
}

/// A published video whose subtitles were then replaced by `NEW_SUBTITLES`:
/// the item id, and the learner's token, project id and media file id.
async fn resubtitled_video(server: &TestServer) -> (String, (String, String, String)) {
    let (item, learner) = published_video(server).await;
    let item_id = item["id"].as_str().unwrap().to_string();
    let response = put_subtitles(server, &item_id, NEW_SUBTITLES).await;
    assert_eq!(response.status, 200, "{}", response.text());
    (item_id, learner)
}

async fn learner_get(
    server: &TestServer,
    learner: &(String, String, String),
    query: &str,
) -> TestResponse {
    let (token, project_id, media_id) = learner;
    let path = format!("/projects/{project_id}/media/{media_id}/{query}");
    send_as(server, token, "GET", &path, None).await
}

#[tokio::test(flavor = "multi_thread")]
async fn a_learner_reads_the_words_set_after_publishing() {
    let (server, _dir) = library_server().await;
    let item_id = published_document(&server).await;
    put_words(&server, &item_id, json!([word(0, 3, "der")])).await;
    let token = sign_up(&server, "learner@example.com").await;
    let path = format!("/library/items/{item_id}/text");
    let text = send_as(&server, &token, "GET", &path, None).await.json();
    assert_eq!(text["segments"][0]["words"][0]["entry"]["term"], "der");
}

#[tokio::test(flavor = "multi_thread")]
async fn the_subtitles_of_a_video_take_their_screenshots_at_the_midpoints_of_the_cues() {
    let (server, _dir) = library_server().await;
    let text = sample_text_of_new(&server, "video").await;
    assert_eq!(text["segments"][0]["screenshot_at_ms"], 1_000);
}

#[tokio::test(flavor = "multi_thread")]
async fn the_subtitles_of_an_audio_item_take_no_screenshots() {
    let (server, _dir) = library_server().await;
    let text = sample_text_of_new(&server, "audio").await;
    assert_eq!(text["segments"][0]["screenshot_at_ms"], Value::Null);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_video_stays_published_when_its_subtitles_change() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _dir) = library_server().await;
    let (item_id, _) = resubtitled_video(&server).await;
    let item = server
        .get(&format!("/library/items/{item_id}"))
        .await
        .json();
    assert_eq!(item["status"], json!({ "kind": "published" }));
}

#[tokio::test(flavor = "multi_thread")]
async fn the_clip_of_a_new_cue_is_served_once_the_subtitles_change() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _dir) = library_server().await;
    let (_, learner) = resubtitled_video(&server).await;
    let response = learner_get(&server, &learner, "clip?start_ms=2000&end_ms=3500").await;
    assert_eq!(response.header("content-type"), Some("audio/mp4"));
}

#[tokio::test(flavor = "multi_thread")]
async fn the_clip_of_a_new_cue_is_not_the_clip_rendered_for_the_old_cue_of_its_index() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _dir) = library_server().await;
    let (item, learner) = published_video(&server).await;
    let old = learner_get(&server, &learner, "clip?start_ms=500&end_ms=1500").await;
    put_subtitles(&server, item["id"].as_str().unwrap(), NEW_SUBTITLES).await;
    let new = learner_get(&server, &learner, "clip?start_ms=2000&end_ms=3500").await;
    assert!(
        new.bytes != old.bytes,
        "the old clip was served for the new cue"
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn the_clip_of_a_removed_cue_is_no_longer_served() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _dir) = library_server().await;
    let (_, learner) = resubtitled_video(&server).await;
    let response = learner_get(&server, &learner, "clip?start_ms=500&end_ms=1500").await;
    assert_eq!(response.json()["code"], "not_preprocessed");
}

#[tokio::test(flavor = "multi_thread")]
async fn the_screenshot_of_a_new_cue_is_served_once_the_subtitles_change() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _dir) = library_server().await;
    let (_, learner) = resubtitled_video(&server).await;
    let response = learner_get(&server, &learner, "frame?at_ms=2750").await;
    assert_eq!(response.header("content-type"), Some("image/jpeg"));
}

#[tokio::test(flavor = "multi_thread")]
async fn a_published_video_keeps_its_file_when_the_new_one_cannot_be_read() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _dir) = library_server().await;
    let (item, _) = published_video(&server).await;
    let item_id = item["id"].as_str().unwrap();
    upload(&server, item_id, "broken.mp4", b"not a video".to_vec()).await;
    let file = server.get(&format!("/library/items/{item_id}/file")).await;
    assert!(
        file.bytes == read_fixture("sample.mp4"),
        "the old file is gone"
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn the_words_of_an_item_being_published_cannot_change() {
    let dir = tempfile::tempdir().unwrap();
    let database = dir.path().join("easyimmerse.db");
    let storage = Storage::open(&database).unwrap();
    let german = serde_json::from_value(json!({ "language": "de" })).unwrap();
    storage.set_library_settings(&german).unwrap();
    let server = library_server_on(Storage::open(&database).unwrap(), &dir).await;
    let item = storage
        .create_library_item(&serde_json::from_value(draft("document")).unwrap())
        .unwrap();
    storage.begin_library_publish(&item.id).unwrap();
    let response = put_words(&server, &item.id.0, json!([])).await;
    assert_eq!(
        (response.status, response.json()["code"].clone()),
        (409, json!("item_processing"))
    );
}

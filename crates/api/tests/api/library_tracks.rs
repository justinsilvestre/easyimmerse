//! The subtitle tracks of a library item's media file, which make the item's text while a library manager prepares it in a project.

use serde_json::{Value, json};

use crate::library::{create_item, library_server};
use crate::support::{TestResponse, TestServer};

const TARGET: &str =
    "1\n00:00:00,000 --> 00:00:01,000\nHallo.\n\n2\n00:00:01,000 --> 00:00:02,000\nTschüss.\n";
const TRANSLATION: &str = "1\n00:00:01,100 --> 00:00:01,900\nBye.\n";

/// The project and media file that adding a draft video item gives the launch token's holder, a library manager, and the item's id.
async fn draft_video_media(server: &TestServer) -> (String, String, String) {
    let item_id = create_item(server, "video").await;
    let path = format!("/library/items/{item_id}/add");
    let added = server
        .post_json(&path, &json!({ "project_id": null }))
        .await
        .json();
    let id = |key: &str| added[key].as_str().unwrap().to_string();
    (id("project_id"), id("media_file_id"), item_id)
}

async fn add_track(
    server: &TestServer,
    (project_id, media_id): (&str, &str),
    text: &str,
    role: &str,
) -> TestResponse {
    let body = json!({
        "name": "subtitles.srt",
        "source": { "kind": "inline", "text": text },
        "format": null,
        "role": role,
    });
    let path = format!("/projects/{project_id}/media/{media_id}/subtitles");
    server.post_json(&path, &body).await
}

async fn segments_of(server: &TestServer, item_id: &str) -> Vec<Value> {
    let text = server.get(&format!("/library/items/{item_id}/text")).await;
    text.json()["segments"].as_array().unwrap().clone()
}

#[tokio::test(flavor = "multi_thread")]
async fn a_subtitles_file_added_to_a_drafts_media_file_becomes_its_text() {
    let (server, _dir) = library_server().await;
    let (project_id, media_id, item_id) = draft_video_media(&server).await;
    let added = add_track(&server, (&project_id, &media_id), TARGET, "target").await;
    assert_eq!(added.status, 201, "{}", added.text());
    let texts: Vec<Value> = (segments_of(&server, &item_id).await.iter())
        .map(|segment| segment["text"].clone())
        .collect();
    assert_eq!(texts, [json!("Hallo."), json!("Tschüss.")]);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_translation_track_translates_the_segments_it_overlaps() {
    let (server, _dir) = library_server().await;
    let (project_id, media_id, item_id) = draft_video_media(&server).await;
    add_track(&server, (&project_id, &media_id), TARGET, "target").await;
    add_track(
        &server,
        (&project_id, &media_id),
        TRANSLATION,
        "translation",
    )
    .await;
    let translations: Vec<Value> = (segments_of(&server, &item_id).await.iter())
        .map(|segment| segment["translation"].clone())
        .collect();
    assert_eq!(translations, [Value::Null, json!("Bye.")]);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_new_translation_keeps_the_words_of_the_segments() {
    let (server, _dir) = library_server().await;
    let (project_id, media_id, item_id) = draft_video_media(&server).await;
    add_track(&server, (&project_id, &media_id), TARGET, "target").await;
    let word = json!([{
        "start": 0,
        "end": 5,
        "entry": { "term": "hallo", "reading": null, "l1_definition": "hello", "l2_definition": "" },
    }]);
    let path = format!("/library/items/{item_id}/segments/0/words");
    server.put_json(&path, &word).await;
    add_track(
        &server,
        (&project_id, &media_id),
        TRANSLATION,
        "translation",
    )
    .await;
    let segments = segments_of(&server, &item_id).await;
    assert_eq!(segments[0]["words"].as_array().unwrap().len(), 1);
}

#[tokio::test(flavor = "multi_thread")]
async fn choosing_no_target_track_empties_the_text() {
    let (server, _dir) = library_server().await;
    let (project_id, media_id, item_id) = draft_video_media(&server).await;
    add_track(&server, (&project_id, &media_id), TARGET, "target").await;
    let path = format!("/projects/{project_id}/media/{media_id}/subtitle-selection");
    let none = json!({ "target_track_id": null, "translation_track_id": null });
    let saved = server.put_json(&path, &none).await;
    assert_eq!(saved.status, 204, "{}", saved.text());
    assert!(segments_of(&server, &item_id).await.is_empty());
}

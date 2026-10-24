//! The audio and video tracks of a library item: the library manager chooses them in their own media file of the item
//! while the item is a draft, and learners play them without choosing others. The test that publishes a video skips when ffmpeg and ffprobe are not found.

use serde_json::{Value, json};

use crate::library::{create_item, document_item, item_dir, library_server, publish, upload};
use crate::stored_copies::sign_up;
use crate::support::{TestServer, ffmpeg_available, fixture_path, read_fixture};
use crate::sync::send_as;

const MKV: &str = "conversion-h264-aac.mkv";
const SECOND_AUDIO: &str = "{\"video\":0,\"audio\":2}";

/// Adds the item to a new project of the launch token's holder, a library manager; the project id and media file id.
async fn add_as_manager(server: &TestServer, item_id: &str) -> (String, String) {
    let path = format!("/library/items/{item_id}/add");
    let added = server
        .post_json(&path, &json!({ "project_id": null }))
        .await
        .json();
    let id = |key: &str| added[key].as_str().unwrap().to_string();
    (id("project_id"), id("media_file_id"))
}

async fn choose_second_audio(server: &TestServer, project_id: &str, media_id: &str) {
    let path = format!("/projects/{project_id}/media/{media_id}/track-selection");
    let body: Value = serde_json::from_str(SECOND_AUDIO).unwrap();
    let response = server.put_json(&path, &body).await;
    assert_eq!(response.status, 204, "{}", response.text());
}

/// The track selection of the media file that adding the item gives a new learner.
async fn learners_track_selection(server: &TestServer, item_id: &str) -> Value {
    let token = sign_up(server, "learner@example.com").await;
    let path = format!("/library/items/{item_id}/add");
    let body = json!({ "project_id": null });
    let added = send_as(server, &token, "POST", &path, Some(&body))
        .await
        .json();
    let project_id = added["project_id"].as_str().unwrap();
    let media = format!("/projects/{project_id}/media");
    let listed = send_as(server, &token, "GET", &media, None).await.json();
    listed["media_files"][0]["track_selection_json"].clone()
}

#[tokio::test(flavor = "multi_thread")]
async fn a_learner_plays_the_tracks_the_manager_chose_before_publishing() {
    let (server, _dir) = library_server().await;
    let item_id = document_item(&server).await;
    let (project_id, media_id) = add_as_manager(&server, &item_id).await;
    choose_second_audio(&server, &project_id, &media_id).await;
    publish(&server, &item_id).await;
    assert_eq!(
        learners_track_selection(&server, &item_id).await,
        json!(SECOND_AUDIO)
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn a_learner_who_added_the_item_before_plays_the_tracks_chosen_for_the_next_publish() {
    let (server, _dir) = library_server().await;
    let item_id = document_item(&server).await;
    let (project_id, media_id) = add_as_manager(&server, &item_id).await;
    publish(&server, &item_id).await;
    let token = sign_up(&server, "learner@example.com").await;
    let path = format!("/library/items/{item_id}/add");
    let body = json!({ "project_id": null });
    let added = send_as(&server, &token, "POST", &path, Some(&body))
        .await
        .json();
    let unpublish = format!("/library/items/{item_id}/unpublish");
    server.post_json(&unpublish, &json!({})).await;
    choose_second_audio(&server, &project_id, &media_id).await;
    publish(&server, &item_id).await;
    let media = format!("/projects/{}/media", added["project_id"].as_str().unwrap());
    let listed = send_as(&server, &token, "GET", &media, None).await.json();
    assert_eq!(
        listed["media_files"][0]["track_selection_json"],
        json!(SECOND_AUDIO)
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn a_learner_plays_the_default_tracks_of_an_item_its_manager_never_opened() {
    let (server, _dir) = library_server().await;
    let item_id = document_item(&server).await;
    publish(&server, &item_id).await;
    assert_eq!(
        learners_track_selection(&server, &item_id).await,
        Value::Null
    );
}

/// The clip of the window that an ordinary media file of the Matroska fixture in the project gives with its second audio track.
async fn clip_of_second_audio(server: &TestServer, project_id: &str, window: &str) -> Vec<u8> {
    let body = json!({ "name": MKV, "source": { "kind": "path", "path": fixture_path(MKV) } });
    let added = server
        .post_json(&format!("/projects/{project_id}/media"), &body)
        .await;
    assert_eq!(added.status, 201, "{}", added.text());
    let media_id = added.json()["id"].as_str().unwrap().to_string();
    choose_second_audio(server, project_id, &media_id).await;
    let path = format!("/projects/{project_id}/media/{media_id}/clip?{window}");
    server.get(&path).await.bytes
}

#[tokio::test(flavor = "multi_thread")]
async fn the_clips_of_a_published_video_come_from_the_audio_track_the_manager_chose() {
    if !ffmpeg_available() {
        return;
    }
    let (server, dir) = library_server().await;
    let item_id = create_item(&server, "video").await;
    let uploaded = upload(&server, &item_id, MKV, read_fixture(MKV)).await;
    assert_eq!(uploaded.status, 200, "{}", uploaded.text());
    let subtitles = String::from_utf8(read_fixture("sample.srt")).unwrap();
    let body = json!({ "target_text": subtitles, "translation_text": null, "format": null });
    server
        .put_json(&format!("/library/items/{item_id}/subtitles"), &body)
        .await;
    let (project_id, media_id) = add_as_manager(&server, &item_id).await;
    choose_second_audio(&server, &project_id, &media_id).await;
    publish(&server, &item_id).await;
    let clip = std::fs::read(item_dir(dir.path(), &item_id).join("cues/0.m4a")).unwrap();
    let expected = clip_of_second_audio(&server, &project_id, "start_ms=500&end_ms=1500").await;
    assert!(
        clip == expected,
        "the clip differs from the second audio track's"
    );
}

fn track_selection_path(project_id: &str, media_id: &str) -> String {
    format!("/projects/{project_id}/media/{media_id}/track-selection")
}

/// A learner's project and media file of a published document item: the learner's token, project id and media file id.
async fn learner_media(server: &TestServer) -> (String, String, String) {
    let item_id = document_item(server).await;
    publish(server, &item_id).await;
    let token = sign_up(server, "learner@example.com").await;
    let path = format!("/library/items/{item_id}/add");
    let body = json!({ "project_id": null });
    let added = send_as(server, &token, "POST", &path, Some(&body))
        .await
        .json();
    let id = |key: &str| added[key].as_str().unwrap().to_string();
    (token, id("project_id"), id("media_file_id"))
}

#[tokio::test(flavor = "multi_thread")]
async fn a_learner_may_not_choose_the_tracks_of_a_library_media_file() {
    let (server, _dir) = library_server().await;
    let (token, project_id, media_id) = learner_media(&server).await;
    let body: Value = serde_json::from_str(SECOND_AUDIO).unwrap();
    let path = track_selection_path(&project_id, &media_id);
    let response = send_as(&server, &token, "PUT", &path, Some(&body)).await;
    assert_eq!(response.status, 403);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_learner_may_not_clear_the_track_choice_of_a_library_media_file() {
    let (server, _dir) = library_server().await;
    let (token, project_id, media_id) = learner_media(&server).await;
    let path = track_selection_path(&project_id, &media_id);
    let response = send_as(&server, &token, "DELETE", &path, None).await;
    assert_eq!(response.status, 403);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_library_manager_chooses_the_tracks_of_a_draft() {
    let (server, _dir) = library_server().await;
    let item_id = document_item(&server).await;
    let (project_id, media_id) = add_as_manager(&server, &item_id).await;
    let body: Value = serde_json::from_str(SECOND_AUDIO).unwrap();
    let path = track_selection_path(&project_id, &media_id);
    assert_eq!(server.put_json(&path, &body).await.status, 204);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_library_manager_may_not_choose_the_tracks_of_a_published_item() {
    let (server, _dir) = library_server().await;
    let item_id = document_item(&server).await;
    let (project_id, media_id) = add_as_manager(&server, &item_id).await;
    publish(&server, &item_id).await;
    let body: Value = serde_json::from_str(SECOND_AUDIO).unwrap();
    let path = track_selection_path(&project_id, &media_id);
    let response = server.put_json(&path, &body).await;
    assert_eq!(
        (response.status, response.json()["code"].clone()),
        (409, json!("item_published"))
    );
}

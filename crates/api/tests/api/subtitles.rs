use serde_json::{Value, json};

use crate::support::{TestServer, fixture_path, read_fixture, spawn_test_server};

const PROJECT: &str = "placeholder-1";

async fn add_media(server: &TestServer) -> String {
    let response = server
        .post_json(
            &format!("/projects/{PROJECT}/media"),
            &json!({ "name": "clip.webm", "source": { "kind": "browser_file", "size": 1, "last_modified_ms": 2 } }),
        )
        .await;
    response.json()["id"].as_str().unwrap().to_string()
}

fn subtitles_route(media_id: &str, suffix: &str) -> String {
    format!("/projects/{PROJECT}/media/{media_id}/subtitles{suffix}")
}

fn inline_request(role: Option<&str>) -> Value {
    json!({
        "name": "sample.srt",
        "source": { "kind": "inline", "text": String::from_utf8(read_fixture("sample.srt")).unwrap() },
        "format": null,
        "role": role,
    })
}

async fn add_track(server: &TestServer, media_id: &str, request: &Value) -> Value {
    let response = server
        .post_json(&subtitles_route(media_id, ""), request)
        .await;
    assert_eq!(response.status, 201, "{}", response.text());
    response.json()
}

#[tokio::test(flavor = "multi_thread")]
async fn a_new_media_file_has_no_subtitle_tracks() {
    let server = spawn_test_server(false).await;
    let media_id = add_media(&server).await;
    let response = server.get(&subtitles_route(&media_id, "")).await;
    assert_eq!(
        response.json(),
        json!({ "tracks": [], "selection": { "target_track_id": null, "translation_track_id": null } })
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn an_added_track_detects_its_format() {
    let server = spawn_test_server(false).await;
    let media_id = add_media(&server).await;
    let added = add_track(&server, &media_id, &inline_request(None)).await;
    assert_eq!(added["format"], "srt");
}

#[tokio::test(flavor = "multi_thread")]
async fn an_added_track_samples_its_first_cue() {
    let server = spawn_test_server(false).await;
    let media_id = add_media(&server).await;
    let added = add_track(&server, &media_id, &inline_request(None)).await;
    assert_eq!(added["sample"], "The cat is sleeping.");
}

#[tokio::test(flavor = "multi_thread")]
async fn a_track_added_with_a_role_is_selected_for_it() {
    let server = spawn_test_server(false).await;
    let media_id = add_media(&server).await;
    let added = add_track(&server, &media_id, &inline_request(Some("target"))).await;
    let response = server.get(&subtitles_route(&media_id, "")).await;
    assert_eq!(response.json()["selection"]["target_track_id"], added["id"]);
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_text_that_does_not_parse() {
    let server = spawn_test_server(false).await;
    let media_id = add_media(&server).await;
    let response = server
        .post_json(
            &subtitles_route(&media_id, ""),
            &json!({ "name": "bad.vtt", "source": { "kind": "inline", "text": "not subtitles" }, "format": "vtt", "role": null }),
        )
        .await;
    assert_eq!(response.status, 400);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_path_source_needs_local_path_permission() {
    let server = spawn_test_server(false).await;
    let media_id = add_media(&server).await;
    let response = server
        .post_json(
            &subtitles_route(&media_id, ""),
            &json!({ "name": "sample.srt", "source": { "kind": "path", "path": fixture_path("sample.srt") }, "format": null, "role": null }),
        )
        .await;
    assert_eq!(response.status, 403);
}

#[tokio::test(flavor = "multi_thread")]
async fn reads_the_cues_of_a_path_source() {
    let server = spawn_test_server(true).await;
    let media_id = add_media(&server).await;
    let added = add_track(
        &server,
        &media_id,
        &json!({ "name": "sample.vtt", "source": { "kind": "path", "path": fixture_path("sample.vtt") }, "format": null, "role": null }),
    )
    .await;
    let id = added["id"].as_str().unwrap();
    let response = server
        .get(&subtitles_route(&media_id, &format!("/{id}/cues")))
        .await;
    assert_eq!(response.json()["cues"].as_array().unwrap().len(), 4);
}

#[tokio::test(flavor = "multi_thread")]
async fn reads_the_cues_of_an_inline_source() {
    let server = spawn_test_server(false).await;
    let media_id = add_media(&server).await;
    let added = add_track(&server, &media_id, &inline_request(None)).await;
    let id = added["id"].as_str().unwrap();
    let response = server
        .get(&subtitles_route(&media_id, &format!("/{id}/cues")))
        .await;
    assert_eq!(response.json()["cues"][1]["text"], "The dog wants to eat.\nIt is hungry.");
}

#[tokio::test(flavor = "multi_thread")]
async fn stores_the_selection() {
    let server = spawn_test_server(false).await;
    let media_id = add_media(&server).await;
    let added = add_track(&server, &media_id, &inline_request(None)).await;
    let response = server
        .request("PUT", &format!("/projects/{PROJECT}/media/{media_id}/subtitle-selection"))
        .json(&json!({ "target_track_id": null, "translation_track_id": added["id"] }))
        .send()
        .await;
    assert_eq!(response.status, 204);
    let listed = server.get(&subtitles_route(&media_id, "")).await;
    assert_eq!(listed.json()["selection"]["translation_track_id"], added["id"]);
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_a_selection_naming_an_unknown_track() {
    let server = spawn_test_server(false).await;
    let media_id = add_media(&server).await;
    let response = server
        .request("PUT", &format!("/projects/{PROJECT}/media/{media_id}/subtitle-selection"))
        .json(&json!({ "target_track_id": "missing", "translation_track_id": null }))
        .send()
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn removes_a_track() {
    let server = spawn_test_server(false).await;
    let media_id = add_media(&server).await;
    let added = add_track(&server, &media_id, &inline_request(Some("target"))).await;
    let id = added["id"].as_str().unwrap();
    let response = server
        .delete(&subtitles_route(&media_id, &format!("/{id}")))
        .await;
    assert_eq!(response.status, 204);
    let listed = server.get(&subtitles_route(&media_id, "")).await;
    assert_eq!(
        listed.json(),
        json!({ "tracks": [], "selection": { "target_track_id": null, "translation_track_id": null } })
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn does_not_reach_a_track_through_another_media_file() {
    let server = spawn_test_server(false).await;
    let media_id = add_media(&server).await;
    let other_media_id = add_media(&server).await;
    let added = add_track(&server, &media_id, &inline_request(None)).await;
    let id = added["id"].as_str().unwrap();
    let response = server
        .get(&subtitles_route(&other_media_id, &format!("/{id}/cues")))
        .await;
    assert_eq!(response.status, 404);
}

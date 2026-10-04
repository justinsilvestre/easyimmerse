//! The subtitles file, subtitle selection, and embedded subtitle cue routes.
//! The embedded cue routes skip when ffmpeg and ffprobe are not found.

use easyimmerse_core::timed_text::parse_timed_text;
use serde_json::{Value, json};

use crate::support::{
    TestServer, ffmpeg_available, fixture_path, read_fixture, spawn_test_server,
    spawn_test_server_with_cache,
};

const PROJECT: &str = "placeholder-1";
const MKV: &str = "conversion-h264-aac.mkv";

fn fixture_text() -> String {
    String::from_utf8(read_fixture("sample.srt")).unwrap()
}

fn inline_request() -> Value {
    json!({
        "name": "sample.srt",
        "source": { "kind": "inline", "text": fixture_text() },
        "format": null,
        "language": "es"
    })
}

async fn add_browser_media(server: &TestServer) -> String {
    let response = server
        .post_json(
            &format!("/projects/{PROJECT}/media"),
            &json!({ "name": "clip.webm", "source": { "kind": "browser_file", "size": 1, "last_modified_ms": 2 } }),
        )
        .await;
    response.json()["id"].as_str().unwrap().to_owned()
}

async fn add_path_media(server: &TestServer, name: &str) -> String {
    let response = server
        .post_json(
            &format!("/projects/{PROJECT}/media"),
            &json!({ "name": name, "source": { "kind": "path", "path": fixture_path(name) } }),
        )
        .await;
    assert_eq!(response.status, 201, "{}", response.text());
    response.json()["id"].as_str().unwrap().to_owned()
}

fn media_route(media_id: &str, suffix: &str) -> String {
    format!("/projects/{PROJECT}/media/{media_id}/{suffix}")
}

async fn add_file(server: &TestServer, media_id: &str) -> Value {
    let response = server
        .post_json(&media_route(media_id, "subtitle-files"), &inline_request())
        .await;
    assert_eq!(response.status, 201, "{}", response.text());
    response.json()
}

async fn subtitle_selection(server: &TestServer) -> Value {
    let listed = server.get(&format!("/projects/{PROJECT}/media")).await;
    listed.json()["media_files"][0]["subtitle_selection"].clone()
}

#[tokio::test(flavor = "multi_thread")]
async fn adds_a_file_with_its_cues() {
    let server = spawn_test_server(false).await;
    let media_id = add_browser_media(&server).await;
    let file = add_file(&server, &media_id).await;
    let expected = parse_timed_text(&fixture_text(), None).unwrap();
    assert_eq!(file["cues"], serde_json::to_value(expected.cues).unwrap());
}

#[tokio::test(flavor = "multi_thread")]
async fn lists_an_added_file() {
    let server = spawn_test_server(false).await;
    let media_id = add_browser_media(&server).await;
    let file = add_file(&server, &media_id).await;
    let response = server.get(&media_route(&media_id, "subtitle-files")).await;
    assert_eq!(response.json()["subtitle_files"], json!([file]));
}

#[tokio::test(flavor = "multi_thread")]
async fn adds_a_file_from_a_local_path_when_allowed() {
    let server = spawn_test_server(true).await;
    let media_id = add_browser_media(&server).await;
    let request = json!({
        "name": "sample.vtt",
        "source": { "kind": "path", "path": fixture_path("sample.vtt") },
        "format": null,
        "language": null
    });
    let response = server
        .post_json(&media_route(&media_id, "subtitle-files"), &request)
        .await;
    assert_eq!(response.status, 201);
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_a_local_path_when_not_allowed() {
    let server = spawn_test_server(false).await;
    let media_id = add_browser_media(&server).await;
    let request = json!({
        "name": "sample.vtt",
        "source": { "kind": "path", "path": fixture_path("sample.vtt") },
        "format": null,
        "language": null
    });
    let response = server
        .post_json(&media_route(&media_id, "subtitle-files"), &request)
        .await;
    assert_eq!(response.status, 403);
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_text_that_does_not_parse() {
    let server = spawn_test_server(false).await;
    let media_id = add_browser_media(&server).await;
    let mut request = inline_request();
    request["format"] = json!("vtt");
    let response = server
        .post_json(&media_route(&media_id, "subtitle-files"), &request)
        .await;
    assert_eq!(response.status, 400);
}

#[tokio::test(flavor = "multi_thread")]
async fn files_of_an_unknown_media_file_are_not_found() {
    let server = spawn_test_server(false).await;
    let response = server.get(&media_route("missing", "subtitle-files")).await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn saves_a_subtitle_selection() {
    let server = spawn_test_server(false).await;
    let media_id = add_browser_media(&server).await;
    let file = add_file(&server, &media_id).await;
    let selection = json!({
        "target": "embedded:3",
        "translation": format!("file:{}", file["id"].as_str().unwrap())
    });
    let response = server
        .put_json(&media_route(&media_id, "subtitle-selection"), &selection)
        .await;
    assert_eq!(
        (response.status, subtitle_selection(&server).await),
        (204, selection)
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn a_new_media_file_has_no_subtitle_selection() {
    let server = spawn_test_server(false).await;
    add_browser_media(&server).await;
    assert_eq!(
        subtitle_selection(&server).await,
        json!({ "target": null, "translation": null })
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn refuses_a_selection_naming_an_unknown_file() {
    let server = spawn_test_server(false).await;
    let media_id = add_browser_media(&server).await;
    let response = server
        .put_json(
            &media_route(&media_id, "subtitle-selection"),
            &json!({ "target": "file:missing", "translation": null }),
        )
        .await;
    assert_eq!(response.status, 400);
}

#[tokio::test(flavor = "multi_thread")]
async fn removing_a_file_clears_the_selection_that_named_it() {
    let server = spawn_test_server(false).await;
    let media_id = add_browser_media(&server).await;
    let file_id = add_file(&server, &media_id).await["id"]
        .as_str()
        .unwrap()
        .to_owned();
    server
        .put_json(
            &media_route(&media_id, "subtitle-selection"),
            &json!({ "target": format!("file:{file_id}"), "translation": null }),
        )
        .await;
    let response = server
        .delete(&media_route(
            &media_id,
            &format!("subtitle-files/{file_id}"),
        ))
        .await;
    assert_eq!(
        (response.status, subtitle_selection(&server).await),
        (204, json!({ "target": null, "translation": null }))
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn removing_an_unknown_file_is_not_found() {
    let server = spawn_test_server(false).await;
    let media_id = add_browser_media(&server).await;
    let response = server
        .delete(&media_route(&media_id, "subtitle-files/missing"))
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn embedded_cues_of_a_browser_file_are_not_resolvable() {
    let server = spawn_test_server(true).await;
    let media_id = add_browser_media(&server).await;
    let response = server
        .get(&media_route(&media_id, "subtitle-tracks/3/cues"))
        .await;
    assert_eq!(response.json()["code"], "not_resolvable");
}

#[tokio::test(flavor = "multi_thread")]
async fn embedded_cues_are_unavailable_without_a_conversion_service() {
    let server = spawn_test_server(true).await;
    let media_id = add_path_media(&server, MKV).await;
    let response = server
        .get(&media_route(&media_id, "subtitle-tracks/3/cues"))
        .await;
    assert_eq!(response.json()["code"], "conversion_unavailable");
}

#[tokio::test(flavor = "multi_thread")]
async fn reads_the_cues_of_the_embedded_subtitle() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _cache_dir) = spawn_test_server_with_cache(true).await;
    let media_id = add_path_media(&server, MKV).await;
    let response = server
        .get(&media_route(&media_id, "subtitle-tracks/3/cues"))
        .await;
    let texts: Vec<Value> = response.json()["cues"]
        .as_array()
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .map(|cue| cue["text"].clone())
        .collect();
    let expected: Vec<Value> = parse_timed_text(&fixture_text(), None)
        .unwrap()
        .cues
        .into_iter()
        .map(|cue| json!(cue.text))
        .collect();
    assert_eq!(texts, expected);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_stream_that_is_not_a_subtitle_is_a_bad_request() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _cache_dir) = spawn_test_server_with_cache(true).await;
    let media_id = add_path_media(&server, MKV).await;
    let response = server
        .get(&media_route(&media_id, "subtitle-tracks/0/cues"))
        .await;
    assert_eq!(response.status, 400);
}

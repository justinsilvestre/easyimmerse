mod support;

use support::{TestServer, has_ffmpeg, spawn_converting_server, spawn_test_server};

/// A well-formed key under which nothing is registered.
const UNKNOWN_KEY: &str = "0000000000000000000000000000000000000000000000000000000000000000";

/// Registers the conversion of the Matroska fixture for WebKit and returns its directory on the server.
async fn register_conversion(server: &TestServer) -> String {
    let media_path = server.add_fixture_media("conversion.mkv").await;
    let response = server
        .plan_playback(&media_path, "webkit", false)
        .await
        .json();
    let playlist_path = response["playlist_path"].as_str().expect("a playlist path");
    playlist_path
        .strip_suffix("/index.m3u8")
        .expect("a playlist file name")
        .to_string()
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_the_playlist() {
    if !has_ffmpeg() {
        return;
    }
    let (server, _cache) = spawn_converting_server().await;
    let conversion = register_conversion(&server).await;
    let response = server.get(&format!("{conversion}/index.m3u8")).await;
    assert!(response.bytes.starts_with(b"#EXTM3U"));
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_the_playlist_as_an_hls_playlist() {
    if !has_ffmpeg() {
        return;
    }
    let (server, _cache) = spawn_converting_server().await;
    let conversion = register_conversion(&server).await;
    let response = server.get(&format!("{conversion}/index.m3u8")).await;
    assert_eq!(
        response.header("Content-Type"),
        Some("application/vnd.apple.mpegurl")
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_the_init_segment_as_mp4() {
    if !has_ffmpeg() {
        return;
    }
    let (server, _cache) = spawn_converting_server().await;
    let conversion = register_conversion(&server).await;
    let response = server.get(&format!("{conversion}/init.mp4")).await;
    assert_eq!(response.header("Content-Type"), Some("video/mp4"));
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_a_media_segment() {
    if !has_ffmpeg() {
        return;
    }
    let (server, _cache) = spawn_converting_server().await;
    let conversion = register_conversion(&server).await;
    let response = server.get(&format!("{conversion}/seg-3.m4s")).await;
    assert_eq!(response.header("Content-Type"), Some("video/iso.segment"));
}

#[tokio::test(flavor = "multi_thread")]
async fn a_segment_past_the_end_is_not_found() {
    if !has_ffmpeg() {
        return;
    }
    let (server, _cache) = spawn_converting_server().await;
    let conversion = register_conversion(&server).await;
    let response = server.get(&format!("{conversion}/seg-99.m4s")).await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_malformed_segment_name_is_not_found() {
    if !has_ffmpeg() {
        return;
    }
    let (server, _cache) = spawn_converting_server().await;
    let conversion = register_conversion(&server).await;
    let response = server.get(&format!("{conversion}/segment.ts")).await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn an_unknown_conversion_is_not_found() {
    if !has_ffmpeg() {
        return;
    }
    let (server, _cache) = spawn_converting_server().await;
    let response = server
        .get(&format!("/conversions/{UNKNOWN_KEY}/index.m3u8"))
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_malformed_key_is_not_found() {
    if !has_ffmpeg() {
        return;
    }
    let (server, _cache) = spawn_converting_server().await;
    let response = server.get("/conversions/..%2F..%2Fsecrets/init.mp4").await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn conversions_are_unavailable_without_the_conversion_service() {
    let server = spawn_test_server(true).await;
    let response = server
        .get(&format!("/conversions/{UNKNOWN_KEY}/index.m3u8"))
        .await;
    assert_eq!(response.json()["code"], "conversion_unavailable");
}

#[tokio::test(flavor = "multi_thread")]
async fn conversions_require_the_token() {
    let server = spawn_test_server(true).await;
    let response = server
        .request("GET", &format!("/conversions/{UNKNOWN_KEY}/index.m3u8"))
        .without_token()
        .send()
        .await;
    assert_eq!(response.status, 401);
}

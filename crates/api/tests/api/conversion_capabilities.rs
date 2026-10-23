//! The conversion capabilities route. Tests with a conversion service skip when ffmpeg and
//! ffprobe are not found.

use std::time::Duration;

use serde_json::Value;

use crate::support::{ffmpeg_available, spawn_test_server, spawn_test_server_with_cache};

const PATH: &str = "/conversion/capabilities";
const DISCOVERY_LIMIT: Duration = Duration::from_secs(30);
const POLL_INTERVAL: Duration = Duration::from_millis(100);

#[tokio::test(flavor = "multi_thread")]
async fn reports_no_ffmpeg_without_a_conversion_service() {
    let server = spawn_test_server(true).await;
    let response = server.get(PATH).await;
    assert_eq!(response.json()["ffmpeg"], Value::Null);
}

#[tokio::test(flavor = "multi_thread")]
async fn reports_the_ffmpeg_version() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _cache_dir) = spawn_test_server_with_cache(true).await;
    let response = server.get(PATH).await;
    let version = response.json()["ffmpeg"]["version"].clone();
    assert!(
        version.as_str().is_some_and(|text| !text.is_empty()),
        "{version}"
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn reports_a_build_found_in_the_usual_places_as_not_custom() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _cache_dir) = spawn_test_server_with_cache(true).await;
    let response = server.get(PATH).await;
    assert_eq!(response.json()["ffmpeg"]["is_custom"], false);
}

#[tokio::test(flavor = "multi_thread")]
async fn reports_when_encoder_discovery_has_finished() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _cache_dir) = spawn_test_server_with_cache(true).await;
    let deadline = tokio::time::Instant::now() + DISCOVERY_LIMIT;
    let mut finished = false;
    while !finished && tokio::time::Instant::now() < deadline {
        tokio::time::sleep(POLL_INTERVAL).await;
        finished = server.get(PATH).await.json()["encoder_discovery_finished"] == true;
    }
    assert!(finished);
}

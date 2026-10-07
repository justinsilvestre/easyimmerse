//! The tracks, playback, conversion, cache, track-selection, waveform, and subtitle routes.
//! Routes that probe or convert skip when ffmpeg and ffprobe are not found.

use easyimmerse_core::media_file::MediaFileSource;
use easyimmerse_core::project::ProjectId;
use easyimmerse_media_ffmpeg::{BinaryName, FfmpegPaths, locate_binary};
use serde_json::{Value, json};
use tempfile::TempDir;

use crate::support::{
    TestServer, fixture_path, seeded_storage, spawn_test_server, spawn_test_server_with_cache,
    spawn_test_server_with_storage,
};

const PROJECT: &str = "placeholder-1";
const MKV: &str = "conversion-h264-aac.mkv";
const TONE_WAV: &str = "conversion-tone.wav";

fn ffmpeg_available() -> bool {
    let paths = FfmpegPaths::default();
    let available = locate_binary(BinaryName::Ffmpeg, &paths).is_ok()
        && locate_binary(BinaryName::Ffprobe, &paths).is_ok();
    if !available {
        eprintln!("skipped: ffmpeg or ffprobe not found");
    }
    available
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

async fn add_browser_media(server: &TestServer) -> String {
    let response = server
        .post_json(
            &format!("/projects/{PROJECT}/media"),
            &json!({ "name": "clip.webm", "source": { "kind": "browser_file", "size": 1, "last_modified_ms": 2 } }),
        )
        .await;
    response.json()["id"].as_str().unwrap().to_owned()
}

fn media_route(media_id: &str, suffix: &str) -> String {
    format!("/projects/{PROJECT}/media/{media_id}/{suffix}")
}

/// A Chromium that plays MP4 and accepts H.264 and AAC in fragmented MP4, so that the
/// Matroska fixture is remuxed by copying both tracks.
fn chromium_request() -> Value {
    json!({
        "environment": {
            "engine": "chromium",
            "can_play_type": "no",
            "mse_codec_strings": ["avc1.4D400C", "avc1.640033", "mp4a.40.2"]
        },
        "selection": null,
        "preferred_audio_target": null
    })
}

async fn converting_server() -> (TestServer, TempDir, String) {
    let (server, cache_dir) = spawn_test_server_with_cache(true).await;
    let media_id = add_path_media(&server, MKV).await;
    (server, cache_dir, media_id)
}

async fn playlist_path(server: &TestServer, media_id: &str) -> String {
    let response = server
        .post_json(&media_route(media_id, "playback"), &chromium_request())
        .await;
    assert_eq!(response.status, 200, "{}", response.text());
    response.json()["playlist_path"]
        .as_str()
        .expect("a playlist path")
        .to_owned()
}

#[tokio::test(flavor = "multi_thread")]
async fn tracks_report_the_default_selection() {
    if !ffmpeg_available() {
        return;
    }
    let server = spawn_test_server(true).await;
    let media_id = add_path_media(&server, MKV).await;
    let response = server.get(&media_route(&media_id, "tracks")).await;
    assert_eq!(
        response.json()["default_selection"],
        json!({ "video": 0, "audio": 1 })
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn tracks_report_the_direct_mime_type() {
    if !ffmpeg_available() {
        return;
    }
    let server = spawn_test_server(true).await;
    let media_id = add_path_media(&server, MKV).await;
    let response = server.get(&media_route(&media_id, "tracks")).await;
    assert_eq!(
        response.json()["direct_mime_type"],
        json!("video/x-matroska; codecs=\"avc1.4D400C, mp4a.40.2\"")
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn tracks_of_a_browser_file_are_not_resolvable() {
    let server = spawn_test_server(true).await;
    let media_id = add_browser_media(&server).await;
    let response = server.get(&media_route(&media_id, "tracks")).await;
    assert_eq!(
        (response.status, response.json()["code"].as_str()),
        (404, Some("not_resolvable"))
    );
}

/// A server that may not read local paths, holding a media file that names one anyway.
async fn server_without_local_paths() -> (TestServer, String) {
    let storage = seeded_storage();
    let added = storage
        .add_media_file(
            &ProjectId(PROJECT.to_string()),
            MKV,
            &MediaFileSource::Path {
                path: fixture_path(MKV).to_string_lossy().into_owned(),
            },
        )
        .expect("a media file");
    let server = spawn_test_server_with_storage(false, storage).await;
    (server, added.id.0)
}

#[tokio::test(flavor = "multi_thread")]
async fn tracks_need_local_path_permission() {
    let (server, media_id) = server_without_local_paths().await;
    let response = server.get(&media_route(&media_id, "tracks")).await;
    assert_eq!(response.status, 403);
}

#[tokio::test(flavor = "multi_thread")]
async fn embedded_subtitles_need_local_path_permission() {
    let (server, media_id) = server_without_local_paths().await;
    let response = server
        .get(&media_route(&media_id, "embedded-subtitles"))
        .await;
    assert_eq!(response.status, 403);
}

#[tokio::test(flavor = "multi_thread")]
async fn playback_needs_local_path_permission() {
    let (server, media_id) = server_without_local_paths().await;
    let response = server
        .post_json(&media_route(&media_id, "playback"), &chromium_request())
        .await;
    assert_eq!(response.status, 403);
}

#[tokio::test(flavor = "multi_thread")]
async fn the_waveform_needs_local_path_permission() {
    let (server, media_id) = server_without_local_paths().await;
    let response = server
        .get(&media_route(&media_id, "waveform?start_ms=0&end_ms=1000"))
        .await;
    assert_eq!(response.status, 403);
}

#[tokio::test(flavor = "multi_thread")]
async fn embedded_subtitles_list_the_embedded_subtitle_track() {
    if !ffmpeg_available() {
        return;
    }
    let server = spawn_test_server(true).await;
    let media_id = add_path_media(&server, MKV).await;
    let response = server
        .get(&media_route(&media_id, "embedded-subtitles"))
        .await;
    let tracks = response.json()["tracks"]
        .as_array()
        .cloned()
        .unwrap_or_default();
    assert_eq!(
        tracks
            .iter()
            .map(|track| track["index"].clone())
            .collect::<Vec<_>>(),
        [json!(3)]
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn playback_without_a_conversion_service_is_unsupported() {
    if !ffmpeg_available() {
        return;
    }
    let server = spawn_test_server(true).await;
    let media_id = add_path_media(&server, MKV).await;
    let response = server
        .post_json(&media_route(&media_id, "playback"), &chromium_request())
        .await;
    assert_eq!(
        response.json()["plan"],
        json!({ "kind": "unsupported", "reason": "conversion_unavailable" })
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn playback_of_a_matroska_file_converts_by_copying() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _cache_dir, media_id) = converting_server().await;
    let response = server
        .post_json(&media_route(&media_id, "playback"), &chromium_request())
        .await;
    let plan = &response.json()["plan"];
    assert_eq!(
        (plan["kind"].clone(), plan["video"]["action"].clone()),
        (json!("convert"), json!("copy"))
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn playback_names_the_playlist_below_conversions() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _cache_dir, media_id) = converting_server().await;
    let path = playlist_path(&server, &media_id).await;
    assert!(
        path.starts_with("/conversions/") && path.ends_with("/index.m3u8"),
        "{path}"
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_the_playlist_with_its_media_type() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _cache_dir, media_id) = converting_server().await;
    let path = playlist_path(&server, &media_id).await;
    let response = server.get(&path).await;
    assert_eq!(
        (response.status, response.header("content-type")),
        (200, Some("application/vnd.apple.mpegurl"))
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn the_playlist_lists_five_segments() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _cache_dir, media_id) = converting_server().await;
    let path = playlist_path(&server, &media_id).await;
    let response = server.get(&path).await;
    assert_eq!(response.text().matches("#EXTINF:").count(), 5);
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_the_init_segment() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _cache_dir, media_id) = converting_server().await;
    let path = playlist_path(&server, &media_id).await;
    let response = server.get(&path.replace("index.m3u8", "init.mp4")).await;
    assert_eq!(
        (response.status, &response.bytes[4..8]),
        (200, &b"ftyp"[..]),
        "{}",
        response.text()
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_a_media_segment() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _cache_dir, media_id) = converting_server().await;
    let path = playlist_path(&server, &media_id).await;
    let response = server.get(&path.replace("index.m3u8", "s00002.m4s")).await;
    assert_eq!(
        (response.status, response.header("content-type")),
        (200, Some("video/mp4")),
        "{}",
        response.text()
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn an_unknown_conversion_key_is_not_found() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _cache_dir, _) = converting_server().await;
    let response = server
        .get(&format!("/conversions/{}/index.m3u8", "0".repeat(64)))
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_segment_beyond_the_playlist_is_not_found() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _cache_dir, media_id) = converting_server().await;
    let path = playlist_path(&server, &media_id).await;
    let response = server.get(&path.replace("index.m3u8", "s00099.m4s")).await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn conversion_files_need_the_bearer_token() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _cache_dir, media_id) = converting_server().await;
    let path = playlist_path(&server, &media_id).await;
    let response = server.request("GET", &path).without_token().send().await;
    assert_eq!(response.status, 401);
}

#[tokio::test(flavor = "multi_thread")]
async fn the_cache_status_is_unavailable_without_a_cache_directory() {
    let server = spawn_test_server(true).await;
    let response = server.get("/conversion-cache").await;
    assert_eq!(
        (response.status, response.json()["code"].as_str()),
        (503, Some("conversion_unavailable"))
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn the_cache_status_reports_its_fields() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _cache_dir, _) = converting_server().await;
    let status = server.get("/conversion-cache").await.json();
    let fields = [
        "usage_bytes",
        "limit_bytes",
        "budget_bytes",
        "free_bytes",
        "space_low",
    ];
    assert!(
        fields.iter().all(|field| !status[field].is_null()),
        "{status}"
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn clearing_the_cache_answers_with_the_status() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _cache_dir, _) = converting_server().await;
    let response = server
        .post_json("/conversion-cache/clear", &json!({}))
        .await;
    assert_eq!(
        (response.status, response.json()["usage_bytes"].as_u64()),
        (200, Some(0))
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn setting_the_budget_answers_with_the_status_under_it() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _cache_dir, _) = converting_server().await;
    let response = server
        .put_json(
            "/conversion-cache/budget",
            &json!({ "budget_bytes": 5_000_000_000u64 }),
        )
        .await;
    assert_eq!(
        (response.status, response.json()["budget_bytes"].as_u64()),
        (200, Some(5_000_000_000))
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn the_chosen_budget_is_kept_in_the_preferences() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _cache_dir, _) = converting_server().await;
    server
        .put_json(
            "/conversion-cache/budget",
            &json!({ "budget_bytes": 5_000_000_000u64 }),
        )
        .await;
    let response = server.get("/preferences/conversionCacheBudgetBytes").await;
    assert_eq!(response.json()["value"], "5000000000");
}

#[tokio::test(flavor = "multi_thread")]
async fn removing_a_media_file_removes_its_conversions() {
    if !ffmpeg_available() {
        return;
    }
    let (server, cache_dir, media_id) = converting_server().await;
    let path = playlist_path(&server, &media_id).await;
    server.get(&path.replace("index.m3u8", "s00000.m4s")).await;
    server
        .delete(&format!("/projects/{PROJECT}/media/{media_id}"))
        .await;
    let entries = std::fs::read_dir(cache_dir.path().join("conversions"))
        .map(|entries| entries.count())
        .unwrap_or(0);
    assert_eq!(entries, 0);
}

#[tokio::test(flavor = "multi_thread")]
async fn saves_a_track_selection() {
    let server = spawn_test_server(false).await;
    let media_id = add_browser_media(&server).await;
    let response = server
        .request("PUT", &media_route(&media_id, "track-selection"))
        .json(&json!({ "video": 0, "audio": 2 }))
        .send()
        .await;
    let listed = server.get(&format!("/projects/{PROJECT}/media")).await;
    assert_eq!(
        (
            response.status,
            listed.json()["media_files"][0]["track_selection_json"].clone()
        ),
        (204, json!("{\"video\":0,\"audio\":2}"))
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn clears_a_track_selection() {
    let server = spawn_test_server(false).await;
    let media_id = add_browser_media(&server).await;
    server
        .request("PUT", &media_route(&media_id, "track-selection"))
        .json(&json!({ "video": 0, "audio": 2 }))
        .send()
        .await;
    let response = server
        .delete(&media_route(&media_id, "track-selection"))
        .await;
    let listed = server.get(&format!("/projects/{PROJECT}/media")).await;
    assert_eq!(
        (
            response.status,
            listed.json()["media_files"][0]["track_selection_json"].clone()
        ),
        (204, Value::Null)
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn a_track_selection_for_an_unknown_media_file_is_not_found() {
    let server = spawn_test_server(false).await;
    let response = server
        .request("PUT", &media_route("missing", "track-selection"))
        .json(&json!({ "video": 0, "audio": 1 }))
        .send()
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn the_waveform_is_unavailable_without_a_cache_directory() {
    let server = spawn_test_server(true).await;
    let media_id = add_path_media(&server, TONE_WAV).await;
    let response = server
        .get(&media_route(&media_id, "waveform?start_ms=0&end_ms=1000"))
        .await;
    assert_eq!(
        (response.status, response.json()["code"].as_str()),
        (503, Some("waveform_unavailable"))
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn the_waveform_of_a_browser_file_is_not_resolvable() {
    let (server, _cache_dir) = spawn_test_server_with_cache(true).await;
    let media_id = add_browser_media(&server).await;
    let response = server
        .get(&media_route(&media_id, "waveform?start_ms=0&end_ms=1000"))
        .await;
    assert_eq!(response.json()["code"], "not_resolvable");
}

#[tokio::test(flavor = "multi_thread")]
async fn an_inverted_waveform_window_is_a_bad_request() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _cache_dir) = spawn_test_server_with_cache(true).await;
    let media_id = add_path_media(&server, TONE_WAV).await;
    let response = server
        .get(&media_route(
            &media_id,
            "waveform?start_ms=2000&end_ms=1000",
        ))
        .await;
    assert_eq!(response.status, 400);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_waveform_window_over_five_minutes_is_a_bad_request() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _cache_dir) = spawn_test_server_with_cache(true).await;
    let media_id = add_path_media(&server, TONE_WAV).await;
    let response = server
        .get(&media_route(&media_id, "waveform?start_ms=0&end_ms=300001"))
        .await;
    assert_eq!(response.status, 400);
}

#[tokio::test(flavor = "multi_thread")]
async fn the_waveform_yields_one_hundred_peaks_per_second() {
    if !ffmpeg_available() {
        return;
    }
    let (server, _cache_dir) = spawn_test_server_with_cache(true).await;
    let media_id = add_path_media(&server, TONE_WAV).await;
    let response = server
        .get(&media_route(
            &media_id,
            "waveform?start_ms=1000&end_ms=3000",
        ))
        .await;
    let body = response.json();
    assert_eq!(
        (
            body["start_ms"].as_u64(),
            body["peaks"].as_array().map(Vec::len)
        ),
        (Some(1000), Some(200))
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn the_frame_needs_local_path_permission() {
    let (server, media_id) = server_without_local_paths().await;
    let response = server.get(&media_route(&media_id, "frame?at_ms=0")).await;
    assert_eq!(response.status, 403);
}

#[tokio::test(flavor = "multi_thread")]
async fn the_frame_is_a_jpeg_image() {
    if !ffmpeg_available() {
        return;
    }
    let server = spawn_test_server(true).await;
    let media_id = add_path_media(&server, MKV).await;
    let response = server
        .get(&media_route(&media_id, "frame?at_ms=1000"))
        .await;
    assert_eq!(response.status, 200, "{}", response.text());
    assert_eq!(response.header("content-type"), Some("image/jpeg"));
}

#[tokio::test(flavor = "multi_thread")]
async fn the_frame_accepts_the_token_as_a_query_parameter() {
    if !ffmpeg_available() {
        return;
    }
    let server = spawn_test_server(true).await;
    let media_id = add_path_media(&server, MKV).await;
    let response = server
        .request(
            "GET",
            &media_route(
                &media_id,
                &format!("frame?at_ms=1000&token={}", server.token),
            ),
        )
        .without_token()
        .send()
        .await;
    assert_eq!(response.status, 200);
}

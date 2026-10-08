//! Adds a media file from the developer's own library, named by `EASYIMMERSE_SAMPLE_MEDIA`, to
//! the Japanese project. The file should hold an English text subtitle track with more than
//! 300 cues and sit beside a Japanese `.ja.srt` file. These tests skip when the variable is
//! unset, so they never run in CI. `mise run test:sample-media` runs them against the app's
//! own ffmpeg sidecar.

use std::time::Instant;

use easyimmerse_media_ffmpeg::{BinaryName, FfmpegPaths, locate_binary};
use serde_json::{Value, json};

use crate::support::{TestServer, has_srt_muxer, spawn_test_server};

/// A project whose target language is Japanese and whose translation language is English.
const PROJECT: &str = "placeholder-2";

const EMBEDDED_TRACK_NAME_PREFIX: &str = "Embedded track";

/// A lower bound on the cues of a full episode's subtitles, well above what a partial
/// extraction would yield.
const MINIMUM_CUE_COUNT: usize = 300;

struct AddedSample {
    server: TestServer,
    media_id: String,
    listed: Value,
}

fn sample_media_path() -> Option<String> {
    let Ok(path) = std::env::var("EASYIMMERSE_SAMPLE_MEDIA") else {
        eprintln!("skipped: EASYIMMERSE_SAMPLE_MEDIA is unset");
        return None;
    };
    assert_ffmpeg_writes_subrip();
    Some(path)
}

/// Fails rather than skips when the ffmpeg the server would run cannot write SubRip, because
/// the server then adds the media file without its embedded tracks and only logs why.
fn assert_ffmpeg_writes_subrip() {
    let ffmpeg = locate_binary(BinaryName::Ffmpeg, &FfmpegPaths::default())
        .expect("ffmpeg should be on the PATH or in EASYIMMERSE_FFMPEG_DIR");
    assert!(
        has_srt_muxer(&ffmpeg),
        "{} has no srt muxer, so it cannot extract embedded subtitles. \
         If it is a copy of the app's sidecar, run `mise run fetch-ffmpeg` and copy \
         apps/native/src-tauri/binaries/easyimmerse-ffmpeg-<target triple> over it, \
         or rebuild the desktop app. To test against the fetched sidecar directly, \
         run `mise run test:sample-media`.",
        ffmpeg.display()
    );
}

async fn add_sample(path: &str) -> AddedSample {
    let server = spawn_test_server(true).await;
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
    let listed = server
        .get(&format!("/projects/{PROJECT}/media/{media_id}/subtitles"))
        .await
        .json();
    AddedSample {
        server,
        media_id,
        listed,
    }
}

impl AddedSample {
    fn track_id_named(&self, is_wanted: impl Fn(&str) -> bool) -> Option<Value> {
        self.listed["tracks"]
            .as_array()
            .unwrap()
            .iter()
            .find(|track| is_wanted(track["name"].as_str().unwrap()))
            .map(|track| track["id"].clone())
    }

    fn embedded_track_id(&self) -> Option<Value> {
        self.track_id_named(|name| name.starts_with(EMBEDDED_TRACK_NAME_PREFIX))
    }

    fn sidecar_track_id(&self) -> Option<Value> {
        self.track_id_named(|name| !name.starts_with(EMBEDDED_TRACK_NAME_PREFIX))
    }

    async fn cue_count(&self, track_id: &Value) -> usize {
        let track_id = track_id.as_str().unwrap();
        let media_id = &self.media_id;
        let path = format!("/projects/{PROJECT}/media/{media_id}/subtitles/{track_id}/cues");
        let response = self.server.get(&path).await;
        assert_eq!(response.status, 200, "{}", response.text());
        response.json()["cues"].as_array().unwrap().len()
    }
}

#[tokio::test(flavor = "multi_thread")]
async fn adds_an_embedded_track() {
    let Some(path) = sample_media_path() else {
        return;
    };
    let sample = add_sample(&path).await;
    assert!(sample.embedded_track_id().is_some(), "{:#}", sample.listed);
}

#[tokio::test(flavor = "multi_thread")]
async fn extracts_every_cue_of_the_embedded_track() {
    let Some(path) = sample_media_path() else {
        return;
    };
    let sample = add_sample(&path).await;
    let track_id = sample.embedded_track_id().expect("an embedded track");
    let cue_count = sample.cue_count(&track_id).await;
    assert!(cue_count > MINIMUM_CUE_COUNT, "only {cue_count} cues");
}

#[tokio::test(flavor = "multi_thread")]
async fn gives_the_embedded_english_track_the_translation_role() {
    let Some(path) = sample_media_path() else {
        return;
    };
    let sample = add_sample(&path).await;
    assert_eq!(
        sample.listed["selection"]["translation_track_id"],
        sample.embedded_track_id().expect("an embedded track"),
        "{:#}",
        sample.listed
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn gives_the_japanese_sidecar_the_target_role() {
    let Some(path) = sample_media_path() else {
        return;
    };
    let sample = add_sample(&path).await;
    assert_eq!(
        sample.listed["selection"]["target_track_id"],
        sample.sidecar_track_id().expect("a sidecar track"),
        "{:#}",
        sample.listed
    );
}

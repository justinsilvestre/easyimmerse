//! Requests served by a stand-in ffmpeg that exits at once without writing anything, which
//! shows how often a request starts a run. These tests need no real ffmpeg.

#![cfg(unix)]

use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};

use easyimmerse_conversion::manifest::{Manifest, write_manifest};
use easyimmerse_conversion::source_identity::SourceIdentity;
use easyimmerse_conversion::{
    CONVERTER_VERSION, ConversionError, ConversionKey, ConversionService, INIT_SEGMENT_FILE_NAME,
};
use easyimmerse_media::{AudioAction, Rational, Segment, SegmentPlan};
use easyimmerse_media_ffmpeg::FfmpegPaths;
use tempfile::TempDir;

use crate::support::{audio_only_plan, selection_of};

const STDERR_TEXT: &str = "stand-in ffmpeg wrote nothing";

struct StandIn {
    service: ConversionService,
    key: ConversionKey,
    dir: TempDir,
}

impl StandIn {
    fn starts(&self) -> usize {
        std::fs::read_to_string(self.starts_log())
            .map(|log| log.lines().count())
            .unwrap_or(0)
    }

    fn starts_log(&self) -> PathBuf {
        self.dir.path().join("starts.log")
    }

    fn entry_dir(&self) -> PathBuf {
        self.dir
            .path()
            .join("cache/conversions")
            .join(self.key.as_str())
    }
}

/// A service whose ffmpeg logs each start and exits successfully, with one registered entry.
fn stand_in() -> StandIn {
    let dir = TempDir::new().expect("temp dir");
    let script = write_stand_in_ffmpeg(dir.path());
    let paths = FfmpegPaths {
        ffmpeg: Some(script.clone()),
        ffprobe: Some(script),
    };
    let service = ConversionService::open(dir.path().join("cache"), paths).expect("service");
    let key = ConversionKey::parse(&"b".repeat(64)).expect("key");
    let test = StandIn { service, key, dir };
    std::fs::create_dir_all(test.entry_dir()).expect("entry dir");
    write_manifest(&test.entry_dir(), &manifest()).expect("manifest");
    test
}

fn write_stand_in_ffmpeg(dir: &Path) -> PathBuf {
    let script = dir.join("ffmpeg");
    let log = dir.join("starts.log");
    let body = format!(
        "#!/bin/sh\necho start >> '{}'\necho '{STDERR_TEXT}' >&2\nexit 0\n",
        log.display()
    );
    std::fs::write(&script, body).expect("script");
    std::fs::set_permissions(&script, std::fs::Permissions::from_mode(0o755)).expect("chmod");
    script
}

fn manifest() -> Manifest {
    let plan = audio_only_plan(AudioAction::Copy { index: 0 });
    Manifest {
        converter_version: CONVERTER_VERSION,
        source: SourceIdentity {
            path: PathBuf::from("/videos/missing.mp3"),
            size: 1,
            modified_ms: 2,
        },
        selection: selection_of(&plan),
        plan,
        segment_plan: SegmentPlan {
            timebase: Rational::new(1, 1000),
            start_ticks: 0,
            segments: vec![
                Segment {
                    start_ticks: 0,
                    end_ticks: 4000,
                },
                Segment {
                    start_ticks: 4000,
                    end_ticks: 8000,
                },
            ],
        },
        video_codec: None,
    }
}

#[tokio::test(flavor = "multi_thread")]
async fn a_segment_request_starts_at_most_three_runs_that_produce_nothing() {
    let test = stand_in();
    let _ = test.service.segment(&test.key, 1).await;
    assert_eq!(test.starts(), 3);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_segment_request_fails_with_the_runs_stderr_once_its_runs_produce_nothing() {
    let test = stand_in();
    let error = test.service.segment(&test.key, 1).await;
    assert!(matches!(
        error,
        Err(ConversionError::SegmentNotProduced { stderr, .. }) if stderr.contains(STDERR_TEXT)
    ));
}

#[tokio::test(flavor = "multi_thread")]
async fn an_init_segment_request_starts_at_most_three_runs_that_produce_nothing() {
    let test = stand_in();
    let _ = test.service.init_segment(&test.key).await;
    assert_eq!(test.starts(), 3);
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_a_cached_init_segment_without_starting_a_run() {
    let test = stand_in();
    std::fs::write(test.entry_dir().join(INIT_SEGMENT_FILE_NAME), b"init").expect("init");
    test.service.init_segment(&test.key).await.expect("init");
    assert_eq!(test.starts(), 0);
}

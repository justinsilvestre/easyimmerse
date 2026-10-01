//! Converts the fixtures through the conversion service with a real ffmpeg.

use std::collections::HashSet;
use std::path::{Path, PathBuf};

use easyimmerse_conversion::{ConversionError, ConversionKey, ConversionService, EntryPaths};
use easyimmerse_media::playback::{AudioTarget, ConversionPlan, TrackAction, TrackConversion};
use easyimmerse_media::{ContainerInfo, TrackKind, read_first_decode_times, read_track_timescales};
use easyimmerse_media_ffmpeg::{BinaryName, FfmpegPaths, locate_binary, probe_file};
use tempfile::TempDir;

/// The keyframe times of `conversion.mkv` in seconds, from the fixture's documentation. Segment `n` starts at keyframe `n`.
const KEYFRAME_SECONDS: [f64; 11] = [
    0.0, 1.502, 2.711, 6.131, 7.216, 11.22, 12.93, 14.014, 18.018, 19.311, 23.315,
];

/// How far a segment's first decode time may precede its keyframe, which covers the reordering of B-frames.
const DECODE_TOLERANCE_SECONDS: f64 = 0.2;

/// The fMP4 track id of the first mapped track.
const FIRST_TRACK_ID: u32 = 1;

/// An order of segment requests that makes ffmpeg restart partway through the file several times.
const OUT_OF_ORDER_INDEXES: [u32; 11] = [7, 2, 0, 1, 3, 4, 5, 6, 8, 10, 9];

struct Setup {
    service: ConversionService,
    key: ConversionKey,
    cache: TempDir,
}

fn fixture_path(name: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../fixtures")
        .join(name)
}

fn has_ffmpeg() -> bool {
    let paths = FfmpegPaths::default();
    let found = locate_binary(BinaryName::Ffmpeg, &paths).is_ok()
        && locate_binary(BinaryName::Ffprobe, &paths).is_ok();
    if !found {
        eprintln!(
            "skipping: ffmpeg or ffprobe was not found; set EASYIMMERSE_FFMPEG_DIR to run this test"
        );
    }
    found
}

fn track_conversion(
    container: &ContainerInfo,
    kind: TrackKind,
    action: TrackAction,
) -> Option<TrackConversion> {
    let track = container.tracks.iter().find(|track| track.kind == kind)?;
    Some(TrackConversion {
        track_id: track.id,
        action,
        reasons: Vec::new(),
    })
}

/// Copies the video, when there is any, and transcodes the audio to AAC.
fn plan(container: &ContainerInfo) -> ConversionPlan {
    let aac = TrackAction::Transcode {
        target: AudioTarget::Aac,
    };
    ConversionPlan {
        video: track_conversion(container, TrackKind::Video, TrackAction::Copy),
        audio: track_conversion(container, TrackKind::Audio, aac),
    }
}

async fn register(service: &ConversionService, fixture: &str) -> ConversionKey {
    let source = fixture_path(fixture);
    let container = probe_file(&source, &FfmpegPaths::default()).expect("the fixture probes");
    service
        .register(&source, &container, &plan(&container))
        .await
        .expect("registers")
}

async fn set_up(fixture: &str) -> Option<Setup> {
    if !has_ffmpeg() {
        return None;
    }
    let cache = TempDir::new().expect("temp dir");
    let service = ConversionService::new(cache.path().to_owned(), FfmpegPaths::default())
        .expect("ffmpeg found");
    let key = register(&service, fixture).await;
    Some(Setup {
        service,
        key,
        cache,
    })
}

/// Fetches a segment, and then the init segment, and returns the segment's first decode time in seconds.
/// Fetching the segment first lets it decide where ffmpeg starts.
async fn first_decode_seconds(setup: &Setup, index: u32) -> f64 {
    let segment_path = setup
        .service
        .segment(&setup.key, index)
        .await
        .expect("segment");
    let init_path = setup.service.init_segment(&setup.key).await.expect("init");
    let segment = std::fs::read(segment_path).expect("read segment");
    let init = std::fs::read(init_path).expect("read init");
    let timescale = read_track_timescales(&init).expect("timescales")[&FIRST_TRACK_ID];
    let decode_time = read_first_decode_times(&segment).expect("decode times")[&FIRST_TRACK_ID];
    // A time before zero is stored as its 64-bit two's complement.
    decode_time as i64 as f64 / f64::from(timescale)
}

fn is_segment_start(index: u32, seconds: f64) -> bool {
    let keyframe = KEYFRAME_SECONDS[index as usize];
    seconds <= keyframe + 0.001 && keyframe - seconds < DECODE_TOLERANCE_SECONDS
}

#[tokio::test(flavor = "multi_thread")]
async fn fetches_the_first_segment() {
    let Some(setup) = set_up("conversion.mkv").await else {
        return;
    };
    let path = setup
        .service
        .segment(&setup.key, 0)
        .await
        .expect("segment 0");
    assert!(path.is_file());
}

#[tokio::test(flavor = "multi_thread")]
async fn fetches_a_late_segment_by_restarting_ffmpeg_near_it() {
    let Some(setup) = set_up("conversion.mkv").await else {
        return;
    };
    assert!(is_segment_start(9, first_decode_seconds(&setup, 9).await));
}

#[tokio::test(flavor = "multi_thread")]
async fn fills_each_segment_with_its_own_media_when_fetched_out_of_order() {
    let Some(setup) = set_up("conversion.mkv").await else {
        return;
    };
    let mut mismatched = Vec::new();
    for index in OUT_OF_ORDER_INDEXES {
        let seconds = first_decode_seconds(&setup, index).await;
        if !is_segment_start(index, seconds) {
            mismatched.push((index, seconds));
        }
    }
    assert_eq!(mismatched, []);
}

#[tokio::test(flavor = "multi_thread")]
async fn discards_the_segment_at_which_a_restarted_ffmpeg_begins() {
    let Some(setup) = set_up("conversion.mkv").await else {
        return;
    };
    setup
        .service
        .segment(&setup.key, 9)
        .await
        .expect("segment 9");
    let entry = EntryPaths::new(setup.cache.path(), &setup.key);
    assert!(!entry.segment(8).exists());
}

#[tokio::test(flavor = "multi_thread")]
async fn rejects_a_segment_beyond_the_plan() {
    let Some(setup) = set_up("conversion.mkv").await else {
        return;
    };
    assert!(setup.service.segment(&setup.key, 11).await.is_err());
}

#[cfg(unix)]
#[tokio::test(flavor = "multi_thread")]
async fn serves_a_cached_segment_without_running_ffmpeg() {
    let Some(setup) = set_up("conversion.mkv").await else {
        return;
    };
    setup
        .service
        .segment(&setup.key, 3)
        .await
        .expect("segment 3");
    setup.service.shutdown().await;
    let (fake_ffmpeg, marker) = write_fake_ffmpeg(setup.cache.path());
    let paths = FfmpegPaths {
        ffmpeg: Some(fake_ffmpeg),
        ffprobe: None,
    };
    let service =
        ConversionService::new(setup.cache.path().to_owned(), paths).expect("fake ffmpeg found");
    let key = register(&service, "conversion.mkv").await;
    service.segment(&key, 3).await.expect("cached segment 3");
    assert!(!marker.exists());
}

#[tokio::test(flavor = "multi_thread")]
async fn fetches_the_first_segment_of_audio_alone() {
    let Some(setup) = set_up("conversion.mp3").await else {
        return;
    };
    let seconds = first_decode_seconds(&setup, 0).await;
    assert!(seconds.abs() < 0.1, "{seconds}");
}

#[tokio::test(flavor = "multi_thread")]
async fn fetches_a_late_segment_of_audio_alone() {
    let Some(setup) = set_up("conversion.mp3").await else {
        return;
    };
    let seconds = first_decode_seconds(&setup, 2).await;
    assert!((seconds - 8.023).abs() < 0.1, "{seconds}");
}

#[tokio::test(flavor = "multi_thread")]
async fn keeps_a_registered_conversion_when_cleaning_up() {
    let Some(setup) = set_up("conversion.mkv").await else {
        return;
    };
    let segment = setup
        .service
        .segment(&setup.key, 0)
        .await
        .expect("segment 0");
    setup
        .service
        .clean_up(HashSet::new())
        .await
        .expect("clean up");
    assert!(segment.exists());
}

#[tokio::test(flavor = "multi_thread")]
async fn removes_the_entry_of_an_unknown_source_when_cleaning_up_at_startup() {
    let Some(setup) = set_up("conversion.mkv").await else {
        return;
    };
    setup
        .service
        .segment(&setup.key, 0)
        .await
        .expect("segment 0");
    setup.service.shutdown().await;
    let restarted = ConversionService::new(setup.cache.path().to_owned(), FfmpegPaths::default())
        .expect("ffmpeg found");
    restarted.clean_up(HashSet::new()).await.expect("clean up");
    assert!(!EntryPaths::new(setup.cache.path(), &setup.key).dir.exists());
}

#[tokio::test(flavor = "multi_thread")]
async fn removes_the_entry_of_a_removed_source() {
    let Some(setup) = set_up("conversion.mkv").await else {
        return;
    };
    setup
        .service
        .segment(&setup.key, 0)
        .await
        .expect("segment 0");
    let source = fixture_path("conversion.mkv");
    setup.service.remove_source(&source).await.expect("remove");
    assert!(!EntryPaths::new(setup.cache.path(), &setup.key).dir.exists());
}

#[tokio::test(flavor = "multi_thread")]
async fn forgets_the_conversions_of_a_removed_source() {
    let Some(setup) = set_up("conversion.mkv").await else {
        return;
    };
    let source = fixture_path("conversion.mkv");
    setup.service.remove_source(&source).await.expect("remove");
    let result = setup.service.segment(&setup.key, 0).await;
    assert!(matches!(result, Err(ConversionError::UnknownConversion)));
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_a_segment_again_after_its_entry_is_removed_from_disk() {
    let Some(setup) = set_up("conversion.mkv").await else {
        return;
    };
    setup
        .service
        .segment(&setup.key, 0)
        .await
        .expect("segment 0");
    let entry = EntryPaths::new(setup.cache.path(), &setup.key);
    std::fs::remove_dir_all(&entry.dir).expect("remove entry");
    let segment = setup
        .service
        .segment(&setup.key, 0)
        .await
        .expect("segment 0 again");
    assert!(segment.is_file());
}

/// Writes a script that records that it ran and fails, standing in for ffmpeg.
#[cfg(unix)]
fn write_fake_ffmpeg(dir: &Path) -> (PathBuf, PathBuf) {
    use std::os::unix::fs::PermissionsExt;
    let (script, marker) = (dir.join("fake-ffmpeg"), dir.join("fake-ffmpeg-ran"));
    std::fs::write(
        &script,
        format!("#!/bin/sh\ntouch '{}'\nexit 1\n", marker.display()),
    )
    .expect("write script");
    std::fs::set_permissions(&script, std::fs::Permissions::from_mode(0o755)).expect("chmod");
    (script, marker)
}

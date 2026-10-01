//! Runs ffmpeg with the HLS arguments on the conversion fixture and reads the segments it writes.

use std::path::{Path, PathBuf};
use std::process::Command;

use easyimmerse_media::playback::{AudioTarget, TrackAction, TrackConversion};
use easyimmerse_media::{TrackKind, read_first_decode_times, read_track_timescales};
use easyimmerse_media_ffmpeg::{
    AacEncoder, BinaryName, FfmpegPaths, HlsSource, HlsTracks, TIMESTAMP_OFFSET_SECONDS,
    hls_arguments, locate_binary, probe_file,
};
use tempfile::TempDir;

/// The fMP4 track id of the video, which ffmpeg numbers from 1 in the order the tracks are mapped.
const VIDEO_TRACK_ID: u32 = 1;

/// The time of the second keyframe in the fixture, in seconds.
const SECOND_KEYFRAME_SECONDS: f64 = 1.502;

/// The duration of one frame of the fixture, in seconds.
const FRAME_SECONDS: f64 = 1001.0 / 24000.0;

fn fixture_path() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/conversion.mkv")
}

/// Converts the fixture's video and transcodes its audio to AAC, or returns `None` when ffmpeg or ffprobe cannot be found.
fn convert_fixture() -> Option<TempDir> {
    let paths = FfmpegPaths::default();
    let (Ok(ffmpeg), Ok(_)) = (
        locate_binary(BinaryName::Ffmpeg, &paths),
        locate_binary(BinaryName::Ffprobe, &paths),
    ) else {
        eprintln!(
            "skipping: ffmpeg or ffprobe was not found; set EASYIMMERSE_FFMPEG_DIR to run this test"
        );
        return None;
    };
    let source = fixture_path();
    let container = probe_file(&source, &paths).expect("the fixture should probe");
    let video = container.tracks.iter().find(|t| t.kind == TrackKind::Video);
    let audio = container
        .tracks
        .iter()
        .find(|t| t.kind == TrackKind::Audio)
        .expect("the fixture has audio");
    let audio = TrackConversion {
        track_id: audio.id,
        action: TrackAction::Transcode {
            target: AudioTarget::Aac,
        },
        reasons: Vec::new(),
    };
    let output = TempDir::new().expect("temp dir");
    let arguments = hls_arguments(
        &HlsSource {
            path: &source,
            start_seconds: None,
            timeline_start_seconds: "0.000000",
        },
        &HlsTracks {
            video,
            audio: Some(&audio),
        },
        AacEncoder::for_current_platform(),
        output.path(),
    );
    let status = Command::new(ffmpeg)
        .args(["-v", "error"])
        .args(arguments)
        .status()
        .expect("ffmpeg should start");
    assert!(status.success(), "ffmpeg failed with {status}");
    Some(output)
}

fn read_output(output: &TempDir, name: &str) -> Vec<u8> {
    std::fs::read(output.path().join(name)).expect("the output file should exist")
}

#[test]
fn writes_the_init_segment() {
    let Some(output) = convert_fixture() else {
        return;
    };
    assert!(output.path().join("init.mp4").is_file());
}

#[test]
fn writes_the_first_media_segment() {
    let Some(output) = convert_fixture() else {
        return;
    };
    assert!(output.path().join("s00000.m4s").is_file());
}

/// Returns the first decode time of a track in an output segment, in seconds of the source timeline.
fn first_decode_seconds(output: &TempDir, segment_name: &str, track_id: u32) -> f64 {
    let timescales = read_track_timescales(&read_output(output, "init.mp4")).expect("init");
    let decode_times =
        read_first_decode_times(&read_output(output, segment_name)).expect("segment");
    let seconds = decode_times[&track_id] as f64 / f64::from(timescales[&track_id]);
    seconds - f64::from(TIMESTAMP_OFFSET_SECONDS)
}

#[test]
fn starts_the_first_segment_at_the_start_of_the_source() {
    let Some(output) = convert_fixture() else {
        return;
    };
    assert_eq!(
        first_decode_seconds(&output, "s00000.m4s", VIDEO_TRACK_ID),
        0.0
    );
}

#[test]
fn starts_the_second_segment_within_a_frame_of_the_second_keyframe() {
    let Some(output) = convert_fixture() else {
        return;
    };
    let seconds = first_decode_seconds(&output, "s00001.m4s", VIDEO_TRACK_ID);
    assert!(
        (seconds - SECOND_KEYFRAME_SECONDS).abs() < FRAME_SECONDS,
        "{seconds}"
    );
}

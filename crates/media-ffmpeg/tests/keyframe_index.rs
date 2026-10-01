use std::path::{Path, PathBuf};

use easyimmerse_media_ffmpeg::{
    BinaryName, FfmpegPaths, audio_timeline, keyframe_index, locate_binary,
};

fn fixture_path(name: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../fixtures")
        .join(name)
}

fn has_ffprobe() -> bool {
    let found = locate_binary(BinaryName::Ffprobe, &FfmpegPaths::default()).is_ok();
    if !found {
        eprintln!("skipped: ffprobe not found");
    }
    found
}

#[test]
fn lists_the_keyframes_of_the_conversion_fixture() {
    if !has_ffprobe() {
        return;
    }
    let index = keyframe_index(&fixture_path("conversion.mkv"), &FfmpegPaths::default())
        .expect("keyframe index");
    assert_eq!(
        index.keyframe_pts,
        [
            0, 1502, 2711, 6131, 7216, 11220, 12930, 14014, 18018, 19311, 23315
        ]
    );
}

#[test]
fn reads_the_duration_of_the_conversion_fixture() {
    if !has_ffprobe() {
        return;
    }
    let index = keyframe_index(&fixture_path("conversion.mkv"), &FfmpegPaths::default())
        .expect("keyframe index");
    assert_eq!(index.timeline.duration_ticks, 24_024);
}

#[test]
fn reads_the_delayed_start_of_the_mp3_fixture() {
    if !has_ffprobe() {
        return;
    }
    let timeline = audio_timeline(&fixture_path("conversion.mp3"), &FfmpegPaths::default())
        .expect("audio timeline");
    assert_eq!(timeline.start_pts, 324_872);
}

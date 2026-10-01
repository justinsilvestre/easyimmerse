//! The only candidate encoders so far are for macOS, so these tests run only there.
#![cfg(target_os = "macos")]

use std::os::unix::fs::PermissionsExt;

use easyimmerse_media_ffmpeg::{
    BinaryName, FfmpegPaths, VideoEncoder, discover_video_encoders, locate_binary,
};

const SAMPLE_LISTING: &str = include_str!("data/ffmpeg-encoders-sample.txt");

fn is_ffmpeg_missing() -> bool {
    locate_binary(BinaryName::Ffmpeg, &FfmpegPaths::default()).is_err()
}

#[test]
fn finds_videotoolbox_working_on_macos() {
    if is_ffmpeg_missing() {
        eprintln!("skipped: ffmpeg not found");
        return;
    }
    let encoders = discover_video_encoders(&FfmpegPaths::default()).expect("discover");
    assert_eq!(encoders, [VideoEncoder::VideoToolboxH264]);
}

#[test]
fn keeps_a_listed_encoder_whose_test_encode_succeeds() {
    let dir = create_stand_in_ffmpeg(SAMPLE_LISTING, 0);
    assert_eq!(
        discover_with_stand_in(&dir),
        Some(vec![VideoEncoder::VideoToolboxH264])
    );
}

#[test]
fn leaves_out_an_encoder_whose_test_encode_fails() {
    let dir = create_stand_in_ffmpeg(SAMPLE_LISTING, 1);
    assert_eq!(discover_with_stand_in(&dir), Some(Vec::new()));
}

#[test]
fn leaves_out_an_encoder_that_is_not_listed() {
    let dir = create_stand_in_ffmpeg("Encoders:\n ------\n", 0);
    assert_eq!(discover_with_stand_in(&dir), Some(Vec::new()));
}

fn discover_with_stand_in(dir: &tempfile::TempDir) -> Option<Vec<VideoEncoder>> {
    let paths = FfmpegPaths {
        ffmpeg: Some(dir.path().join("ffmpeg")),
        ffprobe: None,
    };
    discover_video_encoders(&paths).ok()
}

/// Creates a stand-in ffmpeg that prints the given encoder listing and exits with the given code for any encode.
fn create_stand_in_ffmpeg(listing: &str, encode_exit_code: u8) -> tempfile::TempDir {
    let dir = tempfile::TempDir::new().expect("temp dir");
    let path = dir.path().join("ffmpeg");
    let script = format!(
        "#!/bin/sh\ncase \" $* \" in *\" -encoders \"*) cat <<'EOF'\n{listing}EOF\nexit 0;;\nesac\nexit {encode_exit_code}\n"
    );
    std::fs::write(&path, script).expect("write script");
    std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o755)).expect("chmod");
    dir
}

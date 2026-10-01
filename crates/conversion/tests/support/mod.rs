//! Converts the `conversion.mkv` fixture and reads its source and converted forms for comparison.

pub mod converted_media;
pub mod displayed_video;
pub mod fmp4_samples;
pub mod seek_comparison;
pub mod segment_comparison;
pub mod source_media;

use std::path::{Path, PathBuf};

use easyimmerse_media_ffmpeg::{BinaryName, FfmpegPaths, locate_binary};

/// The fixture with B-frames, irregular keyframes, and MP3 audio, whose frames show their own index.
pub const FIXTURE_NAME: &str = "conversion.mkv";

pub fn fixture_path(name: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../fixtures")
        .join(name)
}

/// Returns the path of a binary, or `None` after explaining that the test is skipped.
pub fn find_binary(name: BinaryName) -> Option<PathBuf> {
    let found = locate_binary(name, &FfmpegPaths::default()).ok();
    if found.is_none() {
        eprintln!(
            "skipping: ffmpeg or ffprobe was not found; set EASYIMMERSE_FFMPEG_DIR to run this test"
        );
    }
    found
}

/// Converts a count of a timescale's units to microseconds. The conversion must be exact.
pub fn units_to_microseconds(units: i64, timescale: u32) -> i64 {
    let scaled = i128::from(units) * 1_000_000;
    let timescale = i128::from(timescale);
    assert_eq!(
        scaled % timescale,
        0,
        "{units} units of 1/{timescale} s is not a whole microsecond"
    );
    i64::try_from(scaled / timescale).expect("fits in i64")
}

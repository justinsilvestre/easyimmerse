use std::path::{Path, PathBuf};

use easyimmerse_media_ffmpeg::{BinaryName, FfmpegPaths, locate_binary};

pub fn fixture_path(name: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../fixtures")
        .join(name)
}

/// True when ffprobe can be found through `EASYIMMERSE_FFMPEG_DIR` or `PATH`. Tests that need
/// it return early with a message when this is false, since CI runners have no ffmpeg.
pub fn ffprobe_available() -> bool {
    let available = locate_binary(BinaryName::Ffprobe, &FfmpegPaths::default()).is_ok();
    if !available {
        eprintln!("skipped: ffprobe not found");
    }
    available
}

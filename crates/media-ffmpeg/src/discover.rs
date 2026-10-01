//! Finding out which video encoders an ffmpeg binary can actually use on this machine.

use std::path::Path;
use std::process::{Command, Output, Stdio};

use crate::encoder_list::parse_encoder_names;
use crate::error::FfmpegError;
use crate::locate::{BinaryName, FfmpegPaths, locate_binary};
use crate::video_encoder::{VideoEncoder, candidate_video_encoders};

/// Generates one small black frame, which is enough to show whether an encoder works.
const TEST_SOURCE_ARGUMENTS: &[&str] = &[
    "-hide_banner",
    "-nostdin",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "color=c=black:s=256x144:r=25",
    "-frames:v",
    "1",
    "-pix_fmt",
    "yuv420p",
];

/// Discards the encoded frame.
const NULL_OUTPUT_ARGUMENTS: &[&str] = &["-f", "null", "-"];

/// Returns the video encoders that ffmpeg lists and that succeed in encoding a test frame, in order of preference.
/// An encoder that is listed but fails its test encode is left out.
/// Takes a fraction of a second per candidate encoder.
/// Fails when ffmpeg cannot be found or cannot list its encoders.
pub fn discover_video_encoders(paths: &FfmpegPaths) -> Result<Vec<VideoEncoder>, FfmpegError> {
    let ffmpeg = locate_binary(BinaryName::Ffmpeg, paths)?;
    let listed = parse_encoder_names(&list_encoders(&ffmpeg)?);
    Ok(candidate_video_encoders(std::env::consts::OS)
        .into_iter()
        .filter(|encoder| listed.contains(encoder.ffmpeg_name()))
        .filter(|encoder| passes_test_encode(&ffmpeg, *encoder))
        .collect())
}

fn list_encoders(ffmpeg: &Path) -> Result<String, FfmpegError> {
    let output = run_ffmpeg(ffmpeg, &["-hide_banner", "-encoders"])?;
    if !output.status.success() {
        return Err(FfmpegError::Failed {
            binary: BinaryName::Ffmpeg,
            status: output.status,
            stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        });
    }
    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

fn passes_test_encode(ffmpeg: &Path, encoder: VideoEncoder) -> bool {
    let arguments = [
        TEST_SOURCE_ARGUMENTS,
        encoder.encoder_arguments(),
        NULL_OUTPUT_ARGUMENTS,
    ]
    .concat();
    run_ffmpeg(ffmpeg, &arguments).is_ok_and(|output| output.status.success())
}

fn run_ffmpeg(ffmpeg: &Path, arguments: &[&str]) -> Result<Output, FfmpegError> {
    Command::new(ffmpeg)
        .args(arguments)
        .stdin(Stdio::null())
        .output()
        .map_err(|source| FfmpegError::Spawn {
            binary: BinaryName::Ffmpeg,
            source,
        })
}

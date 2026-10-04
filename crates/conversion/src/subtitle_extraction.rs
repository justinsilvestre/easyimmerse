//! Converts an embedded text subtitle stream to WebVTT with ffmpeg on demand.

use std::path::Path;
use std::process::Stdio;

use easyimmerse_media_ffmpeg::{
    BinaryName, FfmpegError, background_command, subtitle_extract_args,
};
use tokio::process::Command;

use crate::error::ConversionError;

pub async fn extract_subtitle_vtt(
    ffmpeg: &Path,
    source: &Path,
    stream_index: u32,
) -> Result<String, ConversionError> {
    let mut command = background_command(ffmpeg);
    command.args(subtitle_extract_args(source, stream_index));
    let output = Command::from(command)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .output()
        .await
        .map_err(|source| FfmpegError::Spawn {
            binary: BinaryName::Ffmpeg,
            source,
        })?;
    if !output.status.success() {
        return Err(FfmpegError::Failed {
            binary: BinaryName::Ffmpeg,
            status: output.status,
            stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        }
        .into());
    }
    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

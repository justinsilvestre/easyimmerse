//! Runs ffprobe on one file and captures what it prints.

use std::path::Path;
use std::process::Command;

use crate::error::FfmpegError;
use crate::locate::BinaryName;

/// Runs ffprobe with `args` followed by `path`, printing only errors, and returns its standard output.
pub(crate) fn run_ffprobe(
    ffprobe: &Path,
    path: &Path,
    args: &[&str],
) -> Result<String, FfmpegError> {
    let output = Command::new(ffprobe)
        .args(["-v", "error"])
        .args(args)
        .arg(path)
        .output()
        .map_err(|source| FfmpegError::Spawn {
            binary: BinaryName::Ffprobe,
            source,
        })?;
    if !output.status.success() {
        return Err(FfmpegError::Failed {
            binary: BinaryName::Ffprobe,
            status: output.status,
            stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        });
    }
    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

//! Running ffprobe and collecting its standard output.

use std::ffi::OsStr;
use std::path::Path;

use crate::background_command::background_command;
use crate::error::FfmpegError;
use crate::locate::{BinaryName, FfmpegPaths, locate_binary};

/// Runs ffprobe with the given arguments followed by the file path and returns its output,
/// which the arguments should ask for as JSON.
pub(crate) fn run_ffprobe<S: AsRef<OsStr>>(
    args: &[S],
    file: &Path,
    paths: &FfmpegPaths,
) -> Result<String, FfmpegError> {
    let ffprobe = locate_binary(BinaryName::Ffprobe, paths)?;
    let output = background_command(&ffprobe)
        .args(["-v", "error", "-print_format", "json"])
        .args(args)
        .arg(file)
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

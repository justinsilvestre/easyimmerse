use std::process::ExitStatus;
use std::time::Duration;

use thiserror::Error;

use crate::locate::BinaryName;

#[derive(Debug, Error)]
pub enum FfmpegError {
    #[error(
        "{0} was not found: set EASYIMMERSE_FFMPEG_DIR to a directory holding easyimmerse-{0}, easyimmerse-{0}-<target triple>, or {0}; place one of those next to the executable; or add {0} to PATH"
    )]
    BinaryNotFound(BinaryName),
    #[error("failed to start {binary}: {source}")]
    Spawn {
        binary: BinaryName,
        source: std::io::Error,
    },
    #[error("{binary} exited with {status}: {stderr}")]
    Failed {
        binary: BinaryName,
        status: ExitStatus,
        stderr: String,
    },
    #[error("{binary} did not finish within {limit:?}")]
    TimedOut { binary: BinaryName, limit: Duration },
    #[error("ffprobe printed output that could not be parsed: {0}")]
    InvalidOutput(#[from] serde_json::Error),
    #[error("ffprobe reported a format this application does not handle: {0}")]
    UnsupportedFormat(String),
    #[error("ffprobe listed no stream with index {0}")]
    StreamNotFound(u32),
    #[error("ffprobe reported a timebase that is not a positive ratio: {0}")]
    InvalidTimebase(String),
}

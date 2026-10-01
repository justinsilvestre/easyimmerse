use easyimmerse_media_ffmpeg::{FfmpegError, KeyframeIndexError};
use thiserror::Error;

use crate::key::KeyError;
use crate::manifest::ManifestError;

#[derive(Debug, Error)]
pub enum ConversionError {
    #[error(transparent)]
    Ffmpeg(#[from] FfmpegError),
    #[error("failed to read the source's timing: {0}")]
    Timeline(#[from] KeyframeIndexError),
    #[error(transparent)]
    Key(#[from] KeyError),
    #[error(transparent)]
    Manifest(#[from] ManifestError),
    #[error("a file operation for the conversion failed: {0}")]
    Io(#[from] std::io::Error),
    #[error("the plan names video track {0}, which the container does not have")]
    MissingVideoTrack(u32),
    #[error("no conversion is registered under this key")]
    UnknownConversion,
    #[error("the conversion has no segment {0}")]
    SegmentOutOfRange(u32),
    #[error("timed out waiting for the conversion")]
    Timeout,
    #[error("ffmpeg failed: {0}")]
    RunFailed(String),
    #[error("ffmpeg did not produce segment {0}")]
    NotProduced(u32),
    #[error("the conversion service has shut down")]
    ShutDown,
    #[error("a background task failed: {0}")]
    Task(#[from] tokio::task::JoinError),
}

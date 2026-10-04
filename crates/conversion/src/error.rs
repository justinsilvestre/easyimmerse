use std::path::PathBuf;
use std::time::Duration;

use easyimmerse_media_ffmpeg::FfmpegError;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConversionError {
    #[error(transparent)]
    Ffmpeg(#[from] FfmpegError),
    #[error("could not read the media file {path}: {source}")]
    SourceUnreadable {
        path: PathBuf,
        source: std::io::Error,
    },
    #[error("the conversion cache failed at {path}: {source}")]
    CacheIo {
        path: PathBuf,
        source: std::io::Error,
    },
    #[error("the manifest at {path} is not valid: {source}")]
    InvalidManifest {
        path: PathBuf,
        source: serde_json::Error,
    },
    #[error("no conversion has the key {0}")]
    UnknownKey(String),
    #[error("conversion {key} has no segment {index}")]
    UnknownSegment { key: String, index: usize },
    #[error("segment {index} of conversion {key} was not produced within {timeout:?}")]
    SegmentTimeout {
        key: String,
        index: usize,
        timeout: Duration,
    },
    #[error("ffmpeg failed while converting {key}: {stderr}")]
    RunFailed { key: String, stderr: String },
    #[error(
        "ffmpeg stopped {runs} times without producing {segment} of conversion {key}: {stderr}"
    )]
    SegmentNotProduced {
        key: String,
        segment: String,
        runs: usize,
        stderr: String,
    },
    #[error("the segment plan of conversion {0} is empty")]
    EmptyPlan(String),
    #[error("the waveform window must start before it ends and span at most {0:?}")]
    InvalidWaveformWindow(Duration),
    #[error("a background task failed: {0}")]
    TaskFailed(String),
}

impl ConversionError {
    pub(crate) fn cache_io(path: impl Into<PathBuf>) -> impl FnOnce(std::io::Error) -> Self {
        let path = path.into();
        move |source| ConversionError::CacheIo { path, source }
    }
}

impl From<tokio::task::JoinError> for ConversionError {
    fn from(error: tokio::task::JoinError) -> Self {
        ConversionError::TaskFailed(error.to_string())
    }
}

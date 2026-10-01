use thiserror::Error;

#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum TimedTextError {
    #[error("the text does not start with a WEBVTT header")]
    MissingWebVttHeader,
    #[error("cue {position} has no timing line")]
    MissingTimingLine { position: usize },
    #[error("invalid cue index: {0:?}")]
    InvalidCueIndex(String),
    #[error("invalid timing line: {0:?}")]
    InvalidTimingLine(String),
    #[error("invalid timestamp: {0:?}")]
    InvalidTimestamp(String),
}

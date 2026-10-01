use thiserror::Error;

use crate::container::ContainerFormat;
use crate::mov_text_sample::MovTextSampleError;

#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum MediaError {
    #[error("the data does not start with a recognized container signature")]
    UnknownContainerFormat,
    #[error("the pure-Rust probe cannot read {0:?} containers")]
    UnreadableContainerFormat(ContainerFormat),
    #[error("invalid MP4 data: {0}")]
    InvalidMp4(String),
    #[error("invalid Matroska data: {0}")]
    InvalidMatroska(String),
    #[error("track {0} not found")]
    TrackNotFound(u32),
    #[error("sample {sample_id} of track {track_id} is not valid mov_text: {source}")]
    InvalidMovTextSample {
        track_id: u32,
        sample_id: u32,
        source: MovTextSampleError,
    },
}

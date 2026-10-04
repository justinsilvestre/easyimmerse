use thiserror::Error;

use crate::container::ContainerFormat;
use crate::mov_text_sample::MovTextSampleError;

#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum MediaError {
    #[error("the data does not start with a recognized container signature")]
    UnknownContainerFormat,
    /// The container was recognized but no pure reader covers it, or the pure reader met a
    /// track it cannot describe, so the caller should probe the file with ffprobe instead.
    #[error("{0:?} files are probed with ffprobe")]
    RequiresFfprobe(ContainerFormat),
    #[error("invalid MP4 data: {0}")]
    InvalidMp4(String),
    #[error("invalid Matroska data: {0}")]
    InvalidMatroska(String),
    #[error("invalid fragmented MP4 data: {0}")]
    InvalidFragmentedMp4(String),
    #[error("track {0} not found")]
    TrackNotFound(u32),
    #[error("sample {sample_id} of track {track_id} is not valid mov_text: {source}")]
    InvalidMovTextSample {
        track_id: u32,
        sample_id: u32,
        source: MovTextSampleError,
    },
}

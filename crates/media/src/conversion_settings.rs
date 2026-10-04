//! What the server converts into: the audio codec and, when an encoder works, H.264 video.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum AudioTarget {
    Aac,
    Flac,
}

impl AudioTarget {
    /// The codec string of the converted audio: AAC LC, or FLAC in its MSE spelling.
    pub fn codec_string(self) -> &'static str {
        match self {
            AudioTarget::Aac => "mp4a.40.2",
            AudioTarget::Flac => "fLaC",
        }
    }
}

/// Transcoded video is always 8-bit H.264 High profile; only the encoder varies.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct VideoTarget {
    /// The ffmpeg encoder name, such as `h264_videotoolbox`.
    pub encoder: String,
}

impl VideoTarget {
    /// H.264 High profile at level 5.1, which covers every picture size the encoder accepts.
    pub const CODEC_STRING: &'static str = "avc1.640033";
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ConversionSettings {
    pub audio_target: AudioTarget,
    /// `None` when no working H.264 encoder was found, so video cannot be transcoded.
    pub video_target: Option<VideoTarget>,
}

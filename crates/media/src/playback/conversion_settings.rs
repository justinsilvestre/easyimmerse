//! The codecs that the server can convert tracks to.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

/// The codecs that the server converts to when a track's own codec cannot be streamed.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ConversionSettings {
    pub audio_target: AudioTarget,
    /// The video codec to convert to, or `None` when the server has no working video encoder.
    pub video_target: Option<VideoTarget>,
}

/// The audio codec to transcode to when a track's own codec cannot be streamed.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum AudioTarget {
    /// AAC LC, a lossy codec.
    Aac,
    /// 16-bit FLAC, a lossless codec.
    Flac,
}

/// The video codec to transcode to when a track's own codec cannot be streamed.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum VideoTarget {
    /// 8-bit H.264 in the High profile, a lossy codec.
    H264,
}

impl AudioTarget {
    /// Returns the codec string that a browser checks for this target.
    pub fn codec_string(self) -> &'static str {
        match self {
            AudioTarget::Aac => "mp4a.40.2",
            AudioTarget::Flac => "fLaC",
        }
    }
}

impl VideoTarget {
    /// Returns the codec string that a browser checks for this target.
    /// The H.264 string names the High profile at level 5.1, which allows up to 3840 by 2160 pixels at 30 frames per second.
    /// Converted video may use a lower level, which the browser also plays.
    pub fn codec_string(self) -> &'static str {
        match self {
            VideoTarget::H264 => "avc1.640033",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn spells_the_aac_target_as_aac_lc() {
        assert_eq!(AudioTarget::Aac.codec_string(), "mp4a.40.2");
    }

    #[test]
    fn spells_the_flac_target_as_webkit_accepts_it() {
        assert_eq!(AudioTarget::Flac.codec_string(), "fLaC");
    }

    #[test]
    fn spells_the_h264_target_as_high_profile_level_5_1() {
        assert_eq!(VideoTarget::H264.codec_string(), "avc1.640033");
    }

    #[test]
    fn serializes_the_h264_target_in_lowercase() {
        assert_eq!(
            serde_json::to_string(&VideoTarget::H264).expect("json"),
            "\"h264\""
        );
    }
}

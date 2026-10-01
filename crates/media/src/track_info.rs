//! The description of one stream inside a media container.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum TrackKind {
    Video,
    Audio,
    Subtitle,
    Other,
}

/// One stream inside a container.
/// The codec name comes from whichever probe read the file, so one codec can have different names.
/// Details that a probe cannot read are `None`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct TrackInfo {
    pub id: u32,
    pub kind: TrackKind,
    pub codec: String,
    /// The codec profile as ffprobe names it, for example `High` or `LC`.
    pub profile: Option<String>,
    /// The codec level as ffprobe reports it, for example `31` for H.264 level 3.1.
    pub level: Option<u32>,
    /// The average bit rate in bits per second.
    pub bit_rate: Option<u64>,
    /// The codec string that a browser checks to decide whether it can play this track inside fragmented MP4, for example `avc1.64001F`.
    /// `None` when the codec cannot be stored in fragmented MP4 or the probe could not identify it.
    pub codec_string: Option<String>,
    /// The language tag stored in the container, or `None` when it is undetermined.
    pub language: Option<String>,
    pub title: Option<String>,
    /// Whether the container marks this track as the one to play by default.
    pub is_default: bool,
    pub video: Option<VideoDetails>,
    pub audio: Option<AudioDetails>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct VideoDetails {
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub frame_rate: Option<FrameRate>,
    /// The pixel format as ffprobe names it, for example `yuv420p`.
    pub pixel_format: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AudioDetails {
    /// The sample rate in hertz.
    pub sample_rate: Option<u32>,
    pub channels: Option<u32>,
}

/// Frames per second as an exact fraction, for example 24000/1001 for NTSC film.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct FrameRate {
    pub numerator: u32,
    pub denominator: u32,
}

impl TrackInfo {
    /// Describes a track with only its identity known.
    pub fn new(id: u32, kind: TrackKind, codec: String) -> Self {
        TrackInfo {
            id,
            kind,
            codec,
            profile: None,
            level: None,
            bit_rate: None,
            codec_string: None,
            language: None,
            title: None,
            is_default: false,
            video: None,
            audio: None,
        }
    }
}

impl FrameRate {
    /// Returns `None` when either part is zero, which is how ffprobe reports an unknown rate.
    pub fn new(numerator: u32, denominator: u32) -> Option<Self> {
        (numerator != 0 && denominator != 0).then_some(FrameRate {
            numerator,
            denominator,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn treats_a_zero_denominator_as_an_unknown_frame_rate() {
        assert_eq!(FrameRate::new(24, 0), None);
    }

    #[test]
    fn treats_a_zero_numerator_as_an_unknown_frame_rate() {
        assert_eq!(FrameRate::new(0, 1), None);
    }

    #[test]
    fn keeps_a_fractional_frame_rate_exact() {
        let rate = FrameRate::new(24000, 1001).expect("rate");
        assert_eq!((rate.numerator, rate.denominator), (24000, 1001));
    }
}

//! The outcome of planning how a client plays a file.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::conversion_settings::AudioTarget;
use crate::transcode_video::PictureSize;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(tag = "kind", rename_all = "snake_case")]
#[ts(export)]
pub enum PlaybackPlan {
    /// The client plays the file's own bytes in a media element.
    Direct,
    /// The server converts the file into HLS with fragmented MP4 segments while it plays.
    Convert(ConversionPlan),
    Unsupported {
        reason: UnsupportedReason,
    },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ConversionPlan {
    pub video: Option<VideoAction>,
    pub audio: Option<AudioAction>,
    pub reasons: Vec<ConversionReason>,
}

impl ConversionPlan {
    /// True when every chosen track is copied, so the conversion only changes the container.
    pub fn copies_only(&self) -> bool {
        let video_copied = self.video.as_ref().is_none_or(VideoAction::is_copy);
        let audio_copied = self.audio.as_ref().is_none_or(AudioAction::is_copy);
        video_copied && audio_copied
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(tag = "action", rename_all = "snake_case")]
#[ts(export)]
pub enum VideoAction {
    Copy {
        index: u32,
    },
    /// Transcode to H.264, scaled to `scale_to` when set, at `bit_rate` bits per second.
    Transcode {
        index: u32,
        encoder: String,
        scale_to: Option<PictureSize>,
        bit_rate: u64,
        deinterlace: bool,
    },
}

impl VideoAction {
    pub fn is_copy(&self) -> bool {
        matches!(self, VideoAction::Copy { .. })
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(tag = "action", rename_all = "snake_case")]
#[ts(export)]
pub enum AudioAction {
    Copy { index: u32 },
    Transcode { index: u32, target: AudioTarget },
}

impl AudioAction {
    pub fn is_copy(&self) -> bool {
        matches!(self, AudioAction::Copy { .. })
    }
}

/// Why the file is converted rather than played directly.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum ConversionReason {
    ContainerUnsupported,
    InaccurateSeeking,
    NonDefaultTracks,
    CodecUnsupported,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum UnsupportedReason {
    NoTracks,
    TrackNotFound,
    VideoCodecUnsupported,
    AudioCodecUnsupported,
    ConversionUnavailable,
    PictureTooTall,
}

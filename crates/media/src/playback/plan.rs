//! The decision about how a browser will play a media file.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use super::conversion_settings::{AudioTarget, VideoTarget};

/// How a browser will play a file with the selected tracks.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(tag = "kind", rename_all = "snake_case")]
#[ts(export)]
pub enum PlaybackPlan {
    /// The browser plays the original file.
    Direct,
    /// The server converts the file into a stream that the browser can play.
    Convert(ConversionPlan),
    /// The browser cannot play the selected tracks, even after conversion.
    Unsupported { reason: UnsupportedReason },
}

/// The tracks that go into the converted stream. A kind without a track is left out of the stream.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ConversionPlan {
    pub video: Option<TrackConversion<VideoTarget>>,
    pub audio: Option<TrackConversion<AudioTarget>>,
}

/// How one selected track goes into the converted stream, where `Target` is the codec type of the track's kind.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct TrackConversion<Target> {
    pub track_id: u32,
    pub action: TrackAction<Target>,
    /// Why the track is converted rather than played from the original file.
    pub reasons: Vec<ConversionReason>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(tag = "kind", rename_all = "snake_case")]
#[ts(export)]
pub enum TrackAction<Target> {
    /// The encoded track passes into the stream unchanged, so quality is unchanged.
    Copy,
    /// The track is decoded and encoded again in the target codec.
    Transcode { target: Target },
}

impl<Target> TrackAction<Target> {
    /// Reports whether the track is encoded again, which can lower its quality.
    pub fn is_transcode(&self) -> bool {
        matches!(self, TrackAction::Transcode { .. })
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum ConversionReason {
    /// The browser cannot play the original file's container or codecs.
    ContainerUnsupported,
    /// The browser plays the original container, but seeking in it lands only near the requested time.
    InaccurateSeeking,
    /// The selection differs from the tracks the browser would play by default.
    NonDefaultTracks,
    /// The browser cannot play the track's codec inside fragmented MP4, the format of the converted stream.
    CodecUnsupported,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum UnsupportedReason {
    NoTracksSelected,
    /// A selected id names no track of the expected kind.
    TrackNotFound,
    /// The browser cannot play the video codec, and the server cannot convert the video to a codec that the browser plays.
    VideoCodecUnsupported,
    /// The browser can play neither the audio codec nor the audio target codec.
    AudioCodecUnsupported,
    /// The file needs conversion, but the server cannot convert because ffmpeg or a cache directory is missing.
    ConversionUnavailable,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_a_video_transcode_as_a_tagged_union() {
        let action = TrackAction::Transcode {
            target: VideoTarget::H264,
        };
        assert_eq!(
            serde_json::to_value(action).expect("json"),
            serde_json::json!({"kind": "transcode", "target": "h264"})
        );
    }
}

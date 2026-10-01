//! The decision about how a browser will play a media file.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use super::environment::AudioTarget;

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
    pub video: Option<TrackConversion>,
    pub audio: Option<TrackConversion>,
}

/// How one selected track goes into the converted stream.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct TrackConversion {
    pub track_id: u32,
    pub action: TrackAction,
    /// Why the track is converted rather than played from the original file.
    pub reasons: Vec<ConversionReason>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(tag = "kind", rename_all = "snake_case")]
#[ts(export)]
pub enum TrackAction {
    /// The encoded track passes into the stream unchanged, so quality is unchanged.
    Copy,
    /// The track is decoded and encoded again in the target codec.
    Transcode { target: AudioTarget },
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
    /// The browser cannot play the video codec, and converting video to another codec is not available.
    VideoCodecUnsupported,
    /// The browser can play neither the audio codec nor the audio target codec.
    AudioCodecUnsupported,
}

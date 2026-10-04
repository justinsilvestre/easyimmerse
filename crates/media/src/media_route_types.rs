//! The request and response bodies of the media tracks, playback, and conversion cache routes.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::container::ContainerInfo;
use crate::conversion_settings::AudioTarget;
use crate::playback_environment::PlaybackEnvironment;
use crate::playback_plan::PlaybackPlan;
use crate::track_selection::TrackSelection;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct TracksResponse {
    pub container: ContainerInfo,
    pub default_selection: TrackSelection,
    /// The MIME type with codecs to pass to `canPlayType`, or `None` when the file's own bytes
    /// cannot play in a media element at all.
    pub direct_mime_type: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct PlaybackRequest {
    pub environment: PlaybackEnvironment,
    /// The tracks to play; the default selection when absent.
    pub selection: Option<TrackSelection>,
    /// The user's preferred converted audio codec; the server's default when absent.
    pub preferred_audio_target: Option<AudioTarget>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct PlaybackResponse {
    pub plan: PlaybackPlan,
    /// The path of the HLS playlist, present only when the plan converts.
    pub playlist_path: Option<String>,
}

/// Sizes are in bytes.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ConversionCacheStatus {
    pub usage_bytes: u64,
    /// The size the cache may currently grow to: the budget, reduced when free space is short.
    pub limit_bytes: u64,
    /// The size the cache may grow to when disk space allows.
    pub budget_bytes: u64,
    pub free_bytes: u64,
    /// True when free disk space, not the budget, limits the cache.
    pub space_low: bool,
}

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::timed_text::TimedTextTrack;

/// Asks for the time range of each transcript segment within the audio.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AlignmentRequest {
    pub audio_path: String,
    pub transcript: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AlignmentResponse {
    pub track: TimedTextTrack,
}

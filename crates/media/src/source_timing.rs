//! The timing facts about a source file that the segment plan is built from.

use serde::{Deserialize, Serialize};

use crate::rational::Rational;

/// Timing of a source in the ticks of one stream's timebase, so that segment arithmetic stays
/// exact. The duration is a length; the source ends at `start_ticks + duration_ticks`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SourceTiming {
    pub timebase: Rational,
    /// The format's start time, which becomes player time zero.
    pub start_ticks: i64,
    pub duration_ticks: i64,
    /// Presentation times of the video keyframes in ascending order. Empty for audio-only sources.
    pub keyframe_ticks: Vec<i64>,
}

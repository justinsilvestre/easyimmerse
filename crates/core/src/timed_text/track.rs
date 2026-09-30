use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use super::TimedTextFormat;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct TimedTextTrack {
    pub format: TimedTextFormat,
    pub cues: Vec<Cue>,
}

/// One text segment with the time range during which it is shown.
///
/// The text keeps any inline markup from the source file, such as `<i>`, and joins
/// multiple lines with `\n`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct Cue {
    pub index: u32,
    pub start_ms: u64,
    pub end_ms: u64,
    pub text: String,
}

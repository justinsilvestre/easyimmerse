//! Projects, their settings, and their summaries as listed in the library.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(transparent)]
#[ts(export)]
pub struct ProjectId(pub String);

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ProjectSummary {
    pub id: ProjectId,
    pub name: String,
    pub language: String,
    /// An RFC 3339 timestamp.
    pub created_at: String,
}

/// Per-project settings. Only the subtitle offset exists so far.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ProjectSettings {
    /// Added to every cue time when displaying subtitles; negative values shift them earlier.
    pub subtitle_offset_ms: i64,
}

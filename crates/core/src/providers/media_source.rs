use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

/// Identifies a media item at an external source, in whatever form the source's plugin
/// understands, such as a URL.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(transparent)]
#[ts(export)]
pub struct MediaLocator(pub String);

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ResolvedMedia {
    pub title: String,
    pub media_path: String,
    pub subtitle_paths: Vec<String>,
    pub duration_ms: Option<u64>,
}

/// Progress of a long-running provider operation, with `fraction` between 0 and 1.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ProgressEvent {
    pub fraction: f32,
    pub message: String,
}

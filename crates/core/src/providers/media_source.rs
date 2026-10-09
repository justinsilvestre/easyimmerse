use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

/// Identifies a media item at an external source, in whatever form the source's plugin
/// understands, such as a URL.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(transparent)]
#[ts(export)]
pub struct MediaLocator(pub String);

/// What a media-source plugin fetched for a locator: the media file it wrote, and the
/// subtitle files beside it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ResolvedMedia {
    pub title: String,
    pub media_path: String,
    pub subtitles: Vec<ResolvedSubtitle>,
    pub duration_ms: Option<u64>,
}

/// A subtitle file a media-source plugin wrote, with its language when the source names one.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ResolvedSubtitle {
    /// The id the source offered the track under.
    pub id: String,
    pub path: String,
    /// A language tag such as "en" or "ja", as the source reports it.
    pub language: Option<String>,
    /// What the source calls the track.
    pub name: String,
}

/// A subtitle track that was asked for but not added to the media file, and why.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct SkippedSubtitle {
    /// The id the source offered the track under.
    pub id: String,
    pub reason: String,
}

/// Progress of a long-running provider operation, with `fraction` between 0 and 1.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ProgressEvent {
    pub fraction: f32,
    pub message: String,
}

//! Subtitles files the user added to a media file.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::media_file::MediaFileId;
use crate::timed_text::Cue;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(transparent)]
#[ts(export)]
pub struct SubtitleFileId(pub String);

/// A subtitles file added to a media file, with its parsed cues.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct SubtitleFile {
    pub id: SubtitleFileId,
    pub media_file_id: MediaFileId,
    /// The name shown when choosing subtitles, usually the file name.
    pub name: String,
    /// The BCP 47 code of the subtitles' language, when known.
    pub language: Option<String>,
    pub cues: Vec<Cue>,
}

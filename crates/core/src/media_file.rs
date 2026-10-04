//! Media files that belong to a project, and where their bytes come from.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::project::ProjectId;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(transparent)]
#[ts(export)]
pub struct MediaFileId(pub String);

/// A video or audio file added to a project.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct MediaFile {
    pub id: MediaFileId,
    pub project_id: ProjectId,
    /// The name shown in the project's media list, usually the file name.
    pub name: String,
    pub source: MediaFileSource,
    /// Milliseconds since the Unix epoch.
    pub created_at_ms: u64,
    /// The user's saved choice of video and audio tracks, as the JSON the media crate
    /// defines. Null until the user has chosen.
    pub track_selection_json: Option<String>,
    pub subtitle_selection: SubtitleSelection,
}

/// The subtitles shown for a media file: one track in the language being learned and one
/// with its translation. Each is named by a subtitle track id, either `embedded:<index>`
/// for a track inside the media file, with the stream index ffmpeg uses, or `file:<id>`
/// for a subtitles file added to the media file.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct SubtitleSelection {
    pub target: Option<String>,
    pub translation: Option<String>,
}

/// Where the bytes of a media file come from.
///
/// The `path` variant names a file on the machine running the server. The `browser_file`
/// variant describes a file the web app holds in memory; the server never sees its bytes,
/// so it records only what identifies the file when the user picks it again.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(tag = "kind", rename_all = "snake_case")]
#[ts(export)]
pub enum MediaFileSource {
    Path {
        path: String,
    },
    BrowserFile {
        size: u64,
        /// The file's modification time in milliseconds since the Unix epoch.
        last_modified_ms: u64,
    },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tags_a_path_source_with_its_kind() {
        let json = serde_json::to_value(MediaFileSource::Path {
            path: "/videos/a.mp4".to_string(),
        })
        .unwrap();
        assert_eq!(
            json,
            serde_json::json!({ "kind": "path", "path": "/videos/a.mp4" })
        );
    }

    #[test]
    fn reads_a_browser_file_source_from_snake_case_json() {
        let source: MediaFileSource = serde_json::from_value(serde_json::json!({
            "kind": "browser_file", "size": 10, "last_modified_ms": 20
        }))
        .unwrap();
        assert_eq!(
            source,
            MediaFileSource::BrowserFile {
                size: 10,
                last_modified_ms: 20
            }
        );
    }
}

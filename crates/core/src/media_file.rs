//! Media files that belong to a project, and where their bytes come from.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::project::ProjectId;
use crate::providers::media_source::MediaLocator;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(transparent)]
#[ts(export)]
pub struct MediaFileId(pub String);

/// A video, audio, or document file added to a project.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct MediaFile {
    pub id: MediaFileId,
    pub project_id: ProjectId,
    /// The name shown in the project's media list, usually the file name.
    pub name: String,
    pub source: MediaFileSource,
    /// Where the file was fetched from, when a media-source plugin fetched it.
    pub origin: Option<MediaOrigin>,
    /// Milliseconds since the Unix epoch.
    pub created_at_ms: u64,
    /// The user's saved choice of video and audio tracks, as the JSON the media crate
    /// defines. Null until the user has chosen.
    pub track_selection_json: Option<String>,
    /// The document that translates this one, when this is a document paired with its
    /// translation before the two are aligned. Null otherwise.
    pub translation_media_file_id: Option<MediaFileId>,
    /// Whether the user chose to keep a copy of the file's bytes on a server.
    pub is_upload_chosen: bool,
    /// Whether this server keeps a copy of the file's bytes, which it plays when the original cannot be read.
    pub has_stored_copy: bool,
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

/// The external source a media-source plugin fetched a media file from, kept so that
/// the same plugin can fetch more of what the source offers for it, such as subtitles.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct MediaOrigin {
    /// The name of the media-source plugin.
    pub plugin: String,
    pub locator: MediaLocator,
}

/// The endings of the names of documents, which open in the reader: ebooks and text files.
/// The client tells documents apart by the same endings.
const DOCUMENT_EXTENSIONS: [&str; 2] = [".epub", ".txt"];

/// Tells from its name whether a media file is a document, an ebook or a text file, rather
/// than a video or an audio file.
pub fn is_document_file_name(name: &str) -> bool {
    let name = name.to_ascii_lowercase();
    DOCUMENT_EXTENSIONS
        .iter()
        .any(|extension| name.ends_with(extension))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tells_that_an_ebook_is_a_document() {
        assert!(is_document_file_name("Die Verwandlung.EPUB"));
    }

    #[test]
    fn tells_that_a_text_file_is_a_document() {
        assert!(is_document_file_name("translation.txt"));
    }

    #[test]
    fn tells_that_an_audio_file_is_not_a_document() {
        assert!(!is_document_file_name("book.mp3"));
    }

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

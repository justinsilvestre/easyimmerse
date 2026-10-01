//! The media files registered in a project and the subtitle tracks attached to them.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

/// Guesses the kind of media from a file name's extension. Returns `None` for an
/// extension the app does not recognize.
pub fn media_kind_from_name(name: &str) -> Option<MediaKind> {
    let extension = name.rsplit_once('.')?.1.to_ascii_lowercase();
    match extension.as_str() {
        "mp4" | "m4v" | "mkv" | "webm" | "mov" | "avi" => Some(MediaKind::Video),
        "mp3" | "m4a" | "m4b" | "aac" | "ogg" | "oga" | "opus" | "flac" | "wav" => {
            Some(MediaKind::Audio)
        }
        "epub" | "txt" | "md" => Some(MediaKind::Document),
        _ => None,
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(transparent)]
#[ts(export)]
pub struct MediaId(pub String);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum MediaKind {
    Video,
    Audio,
    /// An ebook or plain text file, read rather than played.
    Document,
}

/// Where the bytes of a media or subtitle file live.
///
/// `path` names a file on the machine running the server, which only the native app can
/// use. `browser_file` names a file the web app stored in the browser; the server keeps the
/// key but never resolves it.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(tag = "kind", rename_all = "snake_case")]
#[ts(export)]
pub enum MediaSource {
    Path { path: String },
    BrowserFile { key: String },
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct MediaFile {
    pub id: MediaId,
    /// The file name, shown in lists and used as a default flashcard tag.
    pub name: String,
    pub kind: MediaKind,
    pub source: MediaSource,
    /// Filled in once the file has been opened and its length is known.
    pub duration_ms: Option<u64>,
    pub subtitle_tracks: Vec<SubtitleTrack>,
    /// An RFC 3339 timestamp.
    pub added_at: String,
}

/// The request body for adding a media file to a project.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct NewMediaFile {
    pub name: String,
    pub kind: MediaKind,
    pub source: MediaSource,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum SubtitleRole {
    /// Subtitles in the language being learned. Words in them can be looked up.
    Target,
    /// Subtitles in the user's own language, shown as a translation.
    Translation,
}

/// Where a subtitle track comes from: a separate file, or a track embedded in the media
/// container, identified by the container's own track id.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(tag = "kind", rename_all = "snake_case")]
#[ts(export)]
pub enum SubtitleTrackSource {
    File { source: MediaSource },
    Embedded { track_id: u32 },
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct SubtitleTrack {
    pub id: String,
    pub name: String,
    pub role: SubtitleRole,
    /// A BCP 47 tag when known.
    pub language: Option<String>,
    pub source: SubtitleTrackSource,
}

/// The request body for attaching a subtitle track to a media file.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct NewSubtitleTrack {
    pub name: String,
    pub role: SubtitleRole,
    pub language: Option<String>,
    pub source: SubtitleTrackSource,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recognizes_a_video_extension_regardless_of_case() {
        assert_eq!(media_kind_from_name("Movie.MKV"), Some(MediaKind::Video));
    }

    #[test]
    fn recognizes_an_audiobook_extension() {
        assert_eq!(media_kind_from_name("book.m4b"), Some(MediaKind::Audio));
    }

    #[test]
    fn recognizes_an_ebook_extension() {
        assert_eq!(
            media_kind_from_name("novel.epub"),
            Some(MediaKind::Document)
        );
    }

    #[test]
    fn returns_none_for_an_unknown_extension() {
        assert_eq!(media_kind_from_name("archive.zip"), None);
    }

    #[test]
    fn returns_none_without_an_extension() {
        assert_eq!(media_kind_from_name("README"), None);
    }

    #[test]
    fn serializes_a_source_with_a_kind_tag() {
        let json = serde_json::to_string(&MediaSource::BrowserFile { key: "k".into() }).unwrap();
        assert_eq!(json, r#"{"kind":"browser_file","key":"k"}"#);
    }
}

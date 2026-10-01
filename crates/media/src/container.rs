//! Container metadata read from the leading bytes of a media file.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::error::MediaError;
use crate::track_info::TrackInfo;
use crate::{mkv_container, mp3_container, mp4_container};

/// A container format the application accepts.
/// MOV and M4A files count as MP4, and WebM files count as Matroska.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum ContainerFormat {
    Mp4,
    Matroska,
    Mp3,
    /// Raw AAC audio framed as ADTS (Audio Data Transport Stream), usually a `.aac` file.
    Adts,
    Ogg,
    Flac,
    Wav,
    Avi,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ContainerInfo {
    pub format: ContainerFormat,
    pub duration_ms: Option<u64>,
    pub tracks: Vec<TrackInfo>,
}

const MP4_BOX_TYPE_OFFSET: usize = 4;
const EBML_MAGIC: [u8; 4] = [0x1A, 0x45, 0xDF, 0xA3];

/// Recognizes, from its signature bytes, a container that the pure-Rust probe can read.
pub fn detect_container_format(bytes: &[u8]) -> Option<ContainerFormat> {
    if bytes.get(MP4_BOX_TYPE_OFFSET..MP4_BOX_TYPE_OFFSET + 4) == Some(b"ftyp") {
        Some(ContainerFormat::Mp4)
    } else if bytes.starts_with(&EBML_MAGIC) {
        Some(ContainerFormat::Matroska)
    } else if has_mp3_signature(bytes) {
        Some(ContainerFormat::Mp3)
    } else {
        None
    }
}

/// Reads the container format, duration, and track list from a complete media file.
pub fn probe_container(bytes: &[u8]) -> Result<ContainerInfo, MediaError> {
    match detect_container_format(bytes).ok_or(MediaError::UnknownContainerFormat)? {
        ContainerFormat::Mp4 => mp4_container::probe_mp4(bytes),
        ContainerFormat::Matroska => mkv_container::probe_mkv(bytes),
        ContainerFormat::Mp3 => Ok(mp3_container::probe_mp3()),
        other => Err(MediaError::UnreadableContainerFormat(other)),
    }
}

/// Turns a container's language field into a tag, treating the empty string and
/// the ISO 639 code `und` (undetermined) as no language.
pub fn parse_language_tag(tag: &str) -> Option<String> {
    match tag {
        "" | "und" => None,
        other => Some(other.to_owned()),
    }
}

/// An MP3 file starts with an `ID3` tag or directly with a frame sync (11 set bits).
fn has_mp3_signature(bytes: &[u8]) -> bool {
    match bytes {
        [b'I', b'D', b'3', ..] => true,
        [0xFF, second, ..] => second & 0xE0 == 0xE0,
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::read_fixture_bytes;

    #[test]
    fn detects_the_mp4_fixture() {
        let format = detect_container_format(&read_fixture_bytes("sample.mp4"));
        assert_eq!(format, Some(ContainerFormat::Mp4));
    }

    #[test]
    fn detects_the_matroska_fixture() {
        let format = detect_container_format(&read_fixture_bytes("sample.mkv"));
        assert_eq!(format, Some(ContainerFormat::Matroska));
    }

    #[test]
    fn detects_the_mp3_fixture() {
        let format = detect_container_format(&read_fixture_bytes("sample.mp3"));
        assert_eq!(format, Some(ContainerFormat::Mp3));
    }

    #[test]
    fn detects_mp3_from_a_bare_frame_sync() {
        assert_eq!(
            detect_container_format(&[0xFF, 0xFB, 0x90, 0x00]),
            Some(ContainerFormat::Mp3)
        );
    }

    #[test]
    fn detects_nothing_in_garbage() {
        assert_eq!(
            detect_container_format(b"hello world, this is not media"),
            None
        );
    }

    #[test]
    fn detects_nothing_in_empty_input() {
        assert_eq!(detect_container_format(&[]), None);
    }

    #[test]
    fn probing_garbage_reports_an_unknown_format() {
        let result = probe_container(b"not a media file at all");
        assert_eq!(result, Err(MediaError::UnknownContainerFormat));
    }

    #[test]
    fn probing_a_truncated_mp4_reports_invalid_data() {
        let bytes = &read_fixture_bytes("sample.mp4")[..64];
        assert!(matches!(
            probe_container(bytes),
            Err(MediaError::InvalidMp4(_))
        ));
    }

    #[test]
    fn probes_each_fixture_with_its_format() {
        let formats: Vec<ContainerFormat> = ["sample.mp4", "sample.mkv", "sample.mp3"]
            .iter()
            .map(|name| {
                probe_container(&read_fixture_bytes(name))
                    .expect("probe")
                    .format
            })
            .collect();
        assert_eq!(
            formats,
            [
                ContainerFormat::Mp4,
                ContainerFormat::Matroska,
                ContainerFormat::Mp3
            ]
        );
    }

    #[test]
    fn treats_und_as_no_language() {
        assert_eq!(parse_language_tag("und"), None);
    }

    #[test]
    fn keeps_a_real_language_tag() {
        assert_eq!(parse_language_tag("eng"), Some("eng".to_owned()));
    }
}

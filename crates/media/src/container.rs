//! Container metadata, read from a file's bytes by the pure readers or mapped from ffprobe.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::container_signature::detect_container_format;
use crate::error::MediaError;
use crate::rational::Rational;
use crate::{mkv_container, mp3_container, mp4_container};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum ContainerFormat {
    /// MP4 and QuickTime (`mov`) files.
    Mp4,
    Matroska,
    Mp3,
    Ogg,
    Wav,
    Flac,
    /// Raw AAC in an audio data transport stream.
    Adts,
    MpegTs,
    Avi,
}

#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Hash, Default, Serialize, Deserialize, TS, ToSchema,
)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum TrackKind {
    Video,
    Audio,
    Subtitle,
    #[default]
    Other,
}

/// One stream inside a container. Fields the source does not state are `None`.
#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct TrackInfo {
    /// The stream's position counted over all stream kinds, as in ffmpeg's `0:N`.
    pub index: u32,
    /// The identifier the container itself uses for the track, such as the MP4 track id
    /// or the Matroska track number, when known.
    pub container_track_id: Option<u32>,
    pub kind: TrackKind,
    /// ffmpeg's name for the codec, such as `h264`, `aac`, or `subrip`.
    pub codec: String,
    /// ffmpeg's name for the codec profile, such as `High` or `LC`.
    pub profile: Option<String>,
    pub level: Option<i64>,
    /// The RFC 6381 codec string in the spelling Media Source Extensions accept,
    /// or `None` when the codec cannot be carried in fragmented MP4.
    pub codec_string: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub frame_rate: Option<Rational>,
    pub interlaced: bool,
    pub sample_rate: Option<u32>,
    pub channels: Option<u32>,
    pub bit_rate: Option<u64>,
    pub is_default: bool,
    /// The language tag stored in the container, or `None` when it is undetermined.
    pub language: Option<String>,
    pub title: Option<String>,
    pub start_ms: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ContainerInfo {
    pub format: ContainerFormat,
    pub duration_ms: Option<u64>,
    pub start_ms: Option<u64>,
    /// The overall bit rate of the file in bits per second.
    pub bit_rate: Option<u64>,
    pub tracks: Vec<TrackInfo>,
}

impl ContainerInfo {
    pub fn track(&self, index: u32) -> Option<&TrackInfo> {
        self.tracks.iter().find(|track| track.index == index)
    }

    pub fn tracks_of_kind(&self, kind: TrackKind) -> impl Iterator<Item = &TrackInfo> {
        self.tracks.iter().filter(move |track| track.kind == kind)
    }
}

/// Reads the container format, timing, and track list from a complete media file.
/// Formats without a pure reader fail with `MediaError::RequiresFfprobe`.
pub fn probe_container(bytes: &[u8]) -> Result<ContainerInfo, MediaError> {
    match detect_container_format(bytes).ok_or(MediaError::UnknownContainerFormat)? {
        ContainerFormat::Mp4 => mp4_container::probe_mp4(bytes),
        ContainerFormat::Matroska => mkv_container::probe_mkv(bytes),
        ContainerFormat::Mp3 => Ok(mp3_container::probe_mp3(bytes)),
        other => Err(MediaError::RequiresFfprobe(other)),
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::read_fixture_bytes;

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
    fn probing_ogg_defers_to_ffprobe() {
        assert_eq!(
            probe_container(b"OggS\0\x02"),
            Err(MediaError::RequiresFfprobe(ContainerFormat::Ogg))
        );
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
    fn finds_a_track_by_stream_index() {
        let info = probe_container(&read_fixture_bytes("sample.mp4")).expect("probe");
        assert_eq!(
            info.track(2).map(|track| track.kind),
            Some(TrackKind::Subtitle)
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

//! Which containers a browser engine plays directly, and the MIME type to ask it about.

use crate::container::{ContainerFormat, ContainerInfo, TrackInfo, TrackKind};
use crate::playback_environment::PlaybackEngine;
use crate::track_selection::TrackSelection;

/// How well an engine plays a container's own bytes in a media element.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DirectSupport {
    /// Plays and seeks to the exact sample.
    Accurate,
    /// Plays, but seeks land near the requested time rather than on it.
    InaccurateSeeking,
    Unsupported,
}

/// A conservative, fixed table. Raw MP3 and ADTS have no index, so seeking in them is
/// approximate. Matroska, MPEG-TS, and AVI are never trusted even where an engine has partial
/// support. Ogg and FLAC files play in Chromium and Gecko only.
pub fn direct_support(format: ContainerFormat, engine: PlaybackEngine) -> DirectSupport {
    use ContainerFormat::*;
    match (format, engine) {
        (Mp4 | Wav, _) => DirectSupport::Accurate,
        (Mp3 | Adts, _) => DirectSupport::InaccurateSeeking,
        (Ogg | Flac, PlaybackEngine::Chromium | PlaybackEngine::Gecko) => DirectSupport::Accurate,
        (Ogg | Flac, PlaybackEngine::WebKit) => DirectSupport::Unsupported,
        (Matroska | MpegTs | Avi, _) => DirectSupport::Unsupported,
    }
}

/// The MIME type with codecs for `canPlayType`, or `None` when a selected track's codec has no
/// codec string in a container that needs one, which means the file cannot play directly.
pub fn direct_mime_type(container: &ContainerInfo, selection: &TrackSelection) -> Option<String> {
    let selected: Vec<&TrackInfo> = [selection.video, selection.audio]
        .into_iter()
        .flatten()
        .filter_map(|index| container.track(index))
        .collect();
    let has_video = selected.iter().any(|track| track.kind == TrackKind::Video);
    let base = match (container.format, has_video) {
        (ContainerFormat::Mp4, true) => "video/mp4",
        (ContainerFormat::Mp4, false) => "audio/mp4",
        (ContainerFormat::Matroska, true) => "video/x-matroska",
        (ContainerFormat::Matroska, false) => "audio/x-matroska",
        (ContainerFormat::Ogg, true) => "video/ogg",
        (ContainerFormat::Ogg, false) => "audio/ogg",
        (ContainerFormat::Mp3, _) => return Some("audio/mpeg".to_owned()),
        (ContainerFormat::Adts, _) => return Some("audio/aac".to_owned()),
        (ContainerFormat::Wav, _) => return Some("audio/wav".to_owned()),
        (ContainerFormat::Flac, _) => return Some("audio/flac".to_owned()),
        (ContainerFormat::MpegTs, _) => return Some("video/mp2t".to_owned()),
        (ContainerFormat::Avi, _) => return Some("video/x-msvideo".to_owned()),
    };
    let codecs = selected
        .iter()
        .map(|track| codecs_parameter(container.format, track))
        .collect::<Option<Vec<&str>>>()?;
    Some(format!("{base}; codecs=\"{}\"", codecs.join(", ")))
}

/// Ogg names its codecs plainly; the MP4 family uses RFC 6381 strings.
fn codecs_parameter(format: ContainerFormat, track: &TrackInfo) -> Option<&str> {
    match format {
        ContainerFormat::Ogg => {
            matches!(track.codec.as_str(), "vorbis" | "opus" | "flac" | "theora")
                .then_some(track.codec.as_str())
        }
        _ => track.codec_string.as_deref(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn container(format: ContainerFormat, tracks: Vec<TrackInfo>) -> ContainerInfo {
        ContainerInfo {
            format,
            duration_ms: None,
            start_ms: None,
            bit_rate: None,
            tracks,
        }
    }

    fn track(index: u32, kind: TrackKind, codec: &str, codec_string: Option<&str>) -> TrackInfo {
        TrackInfo {
            index,
            kind,
            codec: codec.to_owned(),
            codec_string: codec_string.map(str::to_owned),
            ..TrackInfo::default()
        }
    }

    #[test]
    fn mp4_seeks_accurately_everywhere() {
        assert_eq!(
            direct_support(ContainerFormat::Mp4, PlaybackEngine::WebKit),
            DirectSupport::Accurate
        );
    }

    #[test]
    fn raw_mp3_seeks_inaccurately() {
        assert_eq!(
            direct_support(ContainerFormat::Mp3, PlaybackEngine::Chromium),
            DirectSupport::InaccurateSeeking
        );
    }

    #[test]
    fn matroska_is_never_played_directly() {
        assert_eq!(
            direct_support(ContainerFormat::Matroska, PlaybackEngine::Chromium),
            DirectSupport::Unsupported
        );
    }

    #[test]
    fn ogg_plays_in_gecko_but_not_webkit() {
        let supports = [PlaybackEngine::Gecko, PlaybackEngine::WebKit]
            .map(|engine| direct_support(ContainerFormat::Ogg, engine));
        assert_eq!(
            supports,
            [DirectSupport::Accurate, DirectSupport::Unsupported]
        );
    }

    #[test]
    fn spells_an_mp4_mime_type_with_both_codecs() {
        let container = container(
            ContainerFormat::Mp4,
            vec![
                track(0, TrackKind::Video, "h264", Some("avc1.64001F")),
                track(1, TrackKind::Audio, "aac", Some("mp4a.40.2")),
            ],
        );
        let selection = TrackSelection {
            video: Some(0),
            audio: Some(1),
        };
        assert_eq!(
            direct_mime_type(&container, &selection).as_deref(),
            Some("video/mp4; codecs=\"avc1.64001F, mp4a.40.2\"")
        );
    }

    #[test]
    fn uses_the_audio_type_for_an_mp4_without_a_selected_video_track() {
        let container = container(
            ContainerFormat::Mp4,
            vec![track(0, TrackKind::Audio, "aac", Some("mp4a.40.2"))],
        );
        let selection = TrackSelection {
            video: None,
            audio: Some(0),
        };
        assert_eq!(
            direct_mime_type(&container, &selection).as_deref(),
            Some("audio/mp4; codecs=\"mp4a.40.2\"")
        );
    }

    #[test]
    fn gives_no_mime_type_when_a_selected_mp4_track_has_no_codec_string() {
        let container = container(
            ContainerFormat::Mp4,
            vec![track(0, TrackKind::Audio, "vorbis", None)],
        );
        let selection = TrackSelection {
            video: None,
            audio: Some(0),
        };
        assert_eq!(direct_mime_type(&container, &selection), None);
    }

    #[test]
    fn names_ogg_codecs_plainly() {
        let container = container(
            ContainerFormat::Ogg,
            vec![track(0, TrackKind::Audio, "vorbis", None)],
        );
        let selection = TrackSelection {
            video: None,
            audio: Some(0),
        };
        assert_eq!(
            direct_mime_type(&container, &selection).as_deref(),
            Some("audio/ogg; codecs=\"vorbis\"")
        );
    }

    #[test]
    fn spells_raw_mp3_without_codecs() {
        let container = container(
            ContainerFormat::Mp3,
            vec![track(0, TrackKind::Audio, "mp3", Some("mp4a.6B"))],
        );
        let selection = TrackSelection {
            video: None,
            audio: Some(0),
        };
        assert_eq!(
            direct_mime_type(&container, &selection).as_deref(),
            Some("audio/mpeg")
        );
    }
}

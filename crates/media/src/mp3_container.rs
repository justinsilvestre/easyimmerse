use crate::codec_string::codec_string;
use crate::container::{ContainerFormat, ContainerInfo};
use crate::track_info::{TrackInfo, TrackKind};

/// Describes an MP3 file without parsing its frames. The duration stays unknown
/// because computing it requires walking every frame.
pub(crate) fn probe_mp3() -> ContainerInfo {
    ContainerInfo {
        format: ContainerFormat::Mp3,
        duration_ms: None,
        tracks: vec![TrackInfo {
            is_default: true,
            codec_string: codec_string("mp3", None, None),
            ..TrackInfo::new(1, TrackKind::Audio, "mp3".to_owned())
        }],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn describes_one_audio_track() {
        let kinds: Vec<TrackKind> = probe_mp3().tracks.iter().map(|t| t.kind).collect();
        assert_eq!(kinds, [TrackKind::Audio]);
    }

    #[test]
    fn names_the_codec_mp3() {
        assert_eq!(probe_mp3().tracks[0].codec, "mp3");
    }

    #[test]
    fn gives_the_mp3_codec_string() {
        assert_eq!(
            probe_mp3().tracks[0].codec_string.as_deref(),
            Some("mp4a.6B")
        );
    }

    #[test]
    fn leaves_the_duration_unknown() {
        assert_eq!(probe_mp3().duration_ms, None);
    }
}

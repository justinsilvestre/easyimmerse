//! The MIME type a browser checks to decide whether it can play the original file.

use super::selection::TrackSelection;
use crate::container::{ContainerFormat, ContainerInfo};
use crate::track_info::{TrackInfo, TrackKind};

/// Returns the MIME type of the original file with the selected tracks' codec strings, for example `video/mp4; codecs="avc1.64001F, mp4a.40.2"`.
/// Formats without a standard codecs parameter, such as MP3, carry none, and tracks without a codec string are left out of it.
pub fn direct_type(container: &ContainerInfo, selection: &TrackSelection) -> String {
    let has_video = selection.video.is_some();
    let mime_type = container_mime_type(container.format, has_video);
    let codecs = selected_codec_strings(container, selection);
    if codecs.is_empty() || !takes_codecs_parameter(container.format) {
        return mime_type.to_owned();
    }
    format!("{mime_type}; codecs=\"{}\"", codecs.join(", "))
}

fn container_mime_type(format: ContainerFormat, has_video: bool) -> &'static str {
    use ContainerFormat::*;
    match (format, has_video) {
        (Mp4, true) => "video/mp4",
        (Mp4, false) => "audio/mp4",
        (Matroska, true) => "video/x-matroska",
        (Matroska, false) => "audio/x-matroska",
        (Ogg, true) => "video/ogg",
        (Ogg, false) => "audio/ogg",
        (Mp3, _) => "audio/mpeg",
        (Adts, _) => "audio/aac",
        (Flac, _) => "audio/flac",
        (Wav, _) => "audio/wav",
        (Avi, _) => "video/x-msvideo",
    }
}

fn takes_codecs_parameter(format: ContainerFormat) -> bool {
    matches!(
        format,
        ContainerFormat::Mp4 | ContainerFormat::Matroska | ContainerFormat::Ogg
    )
}

fn selected_codec_strings<'a>(
    container: &'a ContainerInfo,
    selection: &TrackSelection,
) -> Vec<&'a str> {
    [
        (selection.video, TrackKind::Video),
        (selection.audio, TrackKind::Audio),
    ]
    .into_iter()
    .filter_map(|(id, kind)| find_track(&container.tracks, id?, kind))
    .filter_map(|track| track.codec_string.as_deref())
    .collect()
}

fn find_track(tracks: &[TrackInfo], id: u32, kind: TrackKind) -> Option<&TrackInfo> {
    tracks
        .iter()
        .find(|track| track.id == id && track.kind == kind)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::playback::test_containers::{AAC, H264, MP3, container, frieren_mkv, track};

    fn video_and_audio() -> TrackSelection {
        TrackSelection {
            video: Some(0),
            audio: Some(1),
        }
    }

    fn audio_only() -> TrackSelection {
        TrackSelection {
            video: None,
            audio: Some(0),
        }
    }

    #[test]
    fn lists_both_codecs_of_an_mp4_file() {
        let mp4 = container(
            ContainerFormat::Mp4,
            vec![
                track(0, TrackKind::Video, H264),
                track(1, TrackKind::Audio, AAC),
            ],
        );
        assert_eq!(
            direct_type(&mp4, &video_and_audio()),
            "video/mp4; codecs=\"avc1.64001F, mp4a.40.2\""
        );
    }

    #[test]
    fn names_matroska_by_its_unofficial_mime_type() {
        assert_eq!(
            direct_type(&frieren_mkv(), &video_and_audio()),
            "video/x-matroska; codecs=\"avc1.64001F, mp4a.6B\""
        );
    }

    #[test]
    fn uses_the_audio_mime_type_for_an_mp4_without_video() {
        let m4a = container(ContainerFormat::Mp4, vec![track(0, TrackKind::Audio, AAC)]);
        assert_eq!(
            direct_type(&m4a, &audio_only()),
            "audio/mp4; codecs=\"mp4a.40.2\""
        );
    }

    #[test]
    fn gives_mp3_no_codecs_parameter() {
        let mp3 = container(ContainerFormat::Mp3, vec![track(0, TrackKind::Audio, MP3)]);
        assert_eq!(direct_type(&mp3, &audio_only()), "audio/mpeg");
    }

    #[test]
    fn leaves_out_a_track_without_a_codec_string() {
        let vorbis = TrackInfo::new(1, TrackKind::Audio, "vorbis".to_owned());
        let mkv = container(
            ContainerFormat::Matroska,
            vec![track(0, TrackKind::Video, H264), vorbis],
        );
        assert_eq!(
            direct_type(&mkv, &video_and_audio()),
            "video/x-matroska; codecs=\"avc1.64001F\""
        );
    }

    #[test]
    fn gives_no_codecs_parameter_when_no_track_has_a_codec_string() {
        let vorbis = TrackInfo::new(0, TrackKind::Audio, "vorbis".to_owned());
        let ogg = container(ContainerFormat::Ogg, vec![vorbis]);
        assert_eq!(direct_type(&ogg, &audio_only()), "audio/ogg");
    }

    #[test]
    fn ignores_a_selected_id_of_the_wrong_kind() {
        let selection = TrackSelection {
            video: Some(1),
            audio: Some(1),
        };
        assert_eq!(
            direct_type(&frieren_mkv(), &selection),
            "video/x-matroska; codecs=\"mp4a.6B\""
        );
    }
}

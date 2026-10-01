use std::io::Cursor;

use matroska::{Matroska, Track, Tracktype};

use crate::container::{ContainerFormat, ContainerInfo, TrackInfo, TrackKind, parse_language_tag};
use crate::error::MediaError;

pub(crate) fn probe_mkv(bytes: &[u8]) -> Result<ContainerInfo, MediaError> {
    let matroska = Matroska::open(Cursor::new(bytes))
        .map_err(|error| MediaError::InvalidMatroska(error.to_string()))?;
    Ok(ContainerInfo {
        format: ContainerFormat::Matroska,
        duration_ms: matroska
            .info
            .duration
            .map(|duration| duration.as_millis() as u64),
        tracks: matroska.tracks.iter().map(describe_track).collect(),
    })
}

fn describe_track(track: &Track) -> TrackInfo {
    TrackInfo {
        id: track.number as u32,
        kind: to_track_kind(track.tracktype),
        codec: track.codec_id.clone(),
        language: track
            .language
            .as_ref()
            .and_then(|language| parse_language_tag(&language.to_string())),
    }
}

fn to_track_kind(track_type: Tracktype) -> TrackKind {
    match track_type {
        Tracktype::Video => TrackKind::Video,
        Tracktype::Audio => TrackKind::Audio,
        Tracktype::Subtitle => TrackKind::Subtitle,
        _ => TrackKind::Other,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::read_fixture_bytes;

    fn probe_fixture() -> ContainerInfo {
        probe_mkv(&read_fixture_bytes("sample.mkv")).expect("the fixture should parse")
    }

    #[test]
    fn lists_three_tracks() {
        assert_eq!(probe_fixture().tracks.len(), 3);
    }

    #[test]
    fn names_the_subtitle_codec() {
        let subtitle = probe_fixture().tracks.remove(2);
        assert_eq!(subtitle.codec, "S_TEXT/UTF8");
    }

    #[test]
    fn tags_the_subtitle_track_as_english() {
        let subtitle = probe_fixture().tracks.remove(2);
        assert_eq!(subtitle.language, Some("eng".to_owned()));
    }

    #[test]
    fn lists_the_track_kinds_in_order() {
        let kinds: Vec<TrackKind> = probe_fixture().tracks.iter().map(|t| t.kind).collect();
        assert_eq!(
            kinds,
            [TrackKind::Video, TrackKind::Audio, TrackKind::Subtitle]
        );
    }

    #[test]
    fn reads_a_duration_of_about_five_seconds() {
        let duration_ms = probe_fixture().duration_ms.expect("duration");
        assert!((5000..=5100).contains(&duration_ms), "{duration_ms}");
    }

    #[test]
    fn rejects_a_truncated_file() {
        let bytes = &read_fixture_bytes("sample.mkv")[..48];
        assert!(matches!(
            probe_mkv(bytes),
            Err(MediaError::InvalidMatroska(_))
        ));
    }
}

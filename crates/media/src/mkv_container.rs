use std::io::Cursor;

use matroska::{Matroska, Settings, Tag, TagValue, Track, Tracktype};

use crate::container::{ContainerFormat, ContainerInfo, TrackInfo, TrackKind, parse_language_tag};
use crate::error::MediaError;
use crate::mkv_codec::describe_mkv_codec;
use crate::rational::Rational;

const NANOS_PER_SECOND: u64 = 1_000_000_000;
const BIT_RATE_TAG_NAMES: [&str; 2] = ["BPS", "BPS-eng"];
const COMMON_FRAME_RATES: [Rational; 12] = [
    Rational::new(24000, 1001),
    Rational::new(24, 1),
    Rational::new(25, 1),
    Rational::new(30000, 1001),
    Rational::new(30, 1),
    Rational::new(48, 1),
    Rational::new(50, 1),
    Rational::new(60000, 1001),
    Rational::new(60, 1),
    Rational::new(120, 1),
    Rational::new(15, 1),
    Rational::new(12, 1),
];

pub(crate) fn probe_mkv(bytes: &[u8]) -> Result<ContainerInfo, MediaError> {
    let matroska = Matroska::open(Cursor::new(bytes))
        .map_err(|error| MediaError::InvalidMatroska(error.to_string()))?;
    Ok(ContainerInfo {
        format: ContainerFormat::Matroska,
        duration_ms: matroska
            .info
            .duration
            .map(|duration| duration.as_millis() as u64),
        start_ms: None,
        bit_rate: None,
        tracks: matroska
            .tracks
            .iter()
            .enumerate()
            .map(|(index, track)| describe_track(index as u32, track, &matroska.tags))
            .collect(),
    })
}

fn describe_track(index: u32, track: &Track, tags: &[Tag]) -> TrackInfo {
    let codec = describe_mkv_codec(&track.codec_id, track.codec_private.as_deref());
    let common = TrackInfo {
        index,
        container_track_id: Some(track.number as u32),
        kind: to_track_kind(track.tracktype),
        codec: codec.name,
        profile: codec.profile,
        level: codec.level,
        codec_string: codec.codec_string,
        frame_rate: track
            .default_duration
            .and_then(|duration| frame_rate_from_nanos(duration.as_nanos() as u64)),
        bit_rate: bit_rate_from_tags(track.uid, tags),
        is_default: track.default,
        language: track
            .language
            .as_ref()
            .and_then(|language| parse_language_tag(&language.to_string())),
        title: track.name.clone(),
        ..TrackInfo::default()
    };
    match &track.settings {
        Settings::Video(video) => TrackInfo {
            width: Some(video.pixel_width as u32),
            height: Some(video.pixel_height as u32),
            interlaced: video.interlaced.unwrap_or(false),
            ..common
        },
        Settings::Audio(audio) => TrackInfo {
            sample_rate: Some(audio.sample_rate.round() as u32),
            channels: Some(audio.channels as u32),
            ..common
        },
        Settings::None => common,
    }
}

/// Matroska stores the frame duration in whole nanoseconds, so common frame rates such as 24 or
/// 30000/1001 come back as long fractions. A rate from the usual set whose duration rounds to the
/// stored one is preferred; anything else keeps the exact stored ratio.
fn frame_rate_from_nanos(frame_duration_nanos: u64) -> Option<Rational> {
    if frame_duration_nanos == 0 {
        return None;
    }
    let matches_duration = |rate: &Rational| {
        let exact = u128::from(NANOS_PER_SECOND) * u128::from(rate.den);
        let rounded = (exact + u128::from(rate.num) / 2) / u128::from(rate.num);
        rounded.abs_diff(u128::from(frame_duration_nanos)) <= 1
    };
    Some(
        COMMON_FRAME_RATES
            .iter()
            .copied()
            .find(matches_duration)
            .unwrap_or_else(|| Rational::new(NANOS_PER_SECOND, frame_duration_nanos).reduced()),
    )
}

/// Statistics tags written by muxers such as mkvmerge carry the track's bit rate as `BPS`
/// (with `BPS-eng` as an older spelling), targeted at the track's UID.
fn bit_rate_from_tags(track_uid: u64, tags: &[Tag]) -> Option<u64> {
    tags.iter()
        .filter(|tag| {
            tag.targets
                .as_ref()
                .is_some_and(|targets| targets.track_uids.contains(&track_uid))
        })
        .flat_map(|tag| &tag.simple)
        .find(|simple| BIT_RATE_TAG_NAMES.contains(&simple.name.as_str()))
        .and_then(|simple| match &simple.value {
            Some(TagValue::String(text)) => text.trim().parse().ok(),
            _ => None,
        })
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

    fn probe_fixture(name: &str) -> ContainerInfo {
        probe_mkv(&read_fixture_bytes(name)).expect("the fixture should parse")
    }

    fn fixture_track(name: &str, index: usize) -> TrackInfo {
        probe_fixture(name).tracks.remove(index)
    }

    #[test]
    fn lists_three_tracks() {
        assert_eq!(probe_fixture("sample.mkv").tracks.len(), 3);
    }

    #[test]
    fn names_the_subtitle_codec() {
        assert_eq!(fixture_track("sample.mkv", 2).codec, "subrip");
    }

    #[test]
    fn tags_the_subtitle_track_as_english() {
        assert_eq!(
            fixture_track("sample.mkv", 2).language.as_deref(),
            Some("eng")
        );
    }

    #[test]
    fn lists_the_track_kinds_in_order() {
        let kinds: Vec<TrackKind> = probe_fixture("sample.mkv")
            .tracks
            .iter()
            .map(|t| t.kind)
            .collect();
        assert_eq!(
            kinds,
            [TrackKind::Video, TrackKind::Audio, TrackKind::Subtitle]
        );
    }

    #[test]
    fn reads_a_duration_of_about_five_seconds() {
        let duration_ms = probe_fixture("sample.mkv").duration_ms.expect("duration");
        assert!((5000..=5100).contains(&duration_ms), "{duration_ms}");
    }

    #[test]
    fn spells_the_video_codec_string_from_the_codec_private_data() {
        assert_eq!(
            fixture_track("sample.mkv", 0).codec_string.as_deref(),
            Some("avc1.64000C")
        );
    }

    #[test]
    fn reads_the_picture_size() {
        let video = fixture_track("sample.mkv", 0);
        assert_eq!((video.width, video.height), (Some(320), Some(180)));
    }

    #[test]
    fn reads_the_frame_rate_from_the_default_duration() {
        assert_eq!(
            fixture_track("sample.mkv", 0).frame_rate,
            Some(Rational::new(24, 1))
        );
    }

    #[test]
    fn reads_the_audio_sample_rate_and_channels() {
        let audio = fixture_track("sample.mkv", 1);
        assert_eq!((audio.sample_rate, audio.channels), (Some(44100), Some(1)));
    }

    #[test]
    fn reads_track_titles() {
        assert_eq!(
            fixture_track("conversion-h264-aac.mkv", 1).title.as_deref(),
            Some("Japanese")
        );
    }

    #[test]
    fn reads_the_default_flag() {
        let defaults: Vec<bool> = probe_fixture("conversion-h264-aac.mkv")
            .tracks
            .iter()
            .map(|track| track.is_default)
            .collect();
        assert_eq!(defaults, [true, true, false, false]);
    }

    #[test]
    fn reads_the_interlaced_flag() {
        assert!(fixture_track("conversion-interlaced-h264.mkv", 0).interlaced);
    }

    #[test]
    fn snaps_a_rounded_ntsc_frame_duration_to_its_rate() {
        assert_eq!(
            frame_rate_from_nanos(33_366_667),
            Some(Rational::new(30000, 1001))
        );
    }

    #[test]
    fn keeps_an_unusual_frame_duration_exact() {
        assert_eq!(
            frame_rate_from_nanos(100_000_000),
            Some(Rational::new(10, 1))
        );
    }

    #[test]
    fn reads_the_bit_rate_from_a_statistics_tag() {
        let tags = vec![Tag {
            targets: Some(matroska::Target {
                target_type_value: None,
                target_type: None,
                track_uids: vec![7],
                edition_uids: vec![],
                chapter_uids: vec![],
                attachment_uids: vec![],
            }),
            simple: vec![matroska::SimpleTag {
                name: "BPS".to_owned(),
                language: None,
                default: true,
                value: Some(TagValue::String("123456".to_owned())),
            }],
        }];
        assert_eq!(bit_rate_from_tags(7, &tags), Some(123_456));
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

//! Mapping of one ffprobe stream to a track description.

use easyimmerse_media::{Rational, TrackInfo, TrackKind, parse_language_tag, rfc6381_codec_string};

use crate::ffprobe_output::FfprobeStream;
use crate::ffprobe_time::parse_seconds_to_millis;

/// ffprobe's names for the four interlaced field orders: top or bottom field first, each either
/// displayed first or coded first.
const INTERLACED_FIELD_ORDERS: [&str; 4] = ["tt", "bb", "tb", "bt"];
/// ffprobe prints this level when the codec reports none.
const UNKNOWN_LEVEL: i64 = -99;

pub(crate) fn to_track_info(stream: &FfprobeStream) -> TrackInfo {
    let codec = stream
        .codec_name
        .clone()
        .unwrap_or_else(|| "unknown".to_owned());
    let profile = stream
        .profile
        .clone()
        .filter(|profile| profile != "unknown");
    let level = stream.level.filter(|&level| level != UNKNOWN_LEVEL);
    TrackInfo {
        index: stream.index,
        container_track_id: stream.id.as_deref().and_then(parse_hex_id),
        kind: to_track_kind(&stream.codec_type),
        codec_string: rfc6381_codec_string(&codec, profile.as_deref(), level),
        codec,
        profile,
        level,
        width: stream.width,
        height: stream.height,
        frame_rate: frame_rate(stream),
        interlaced: stream
            .field_order
            .as_deref()
            .is_some_and(|order| INTERLACED_FIELD_ORDERS.contains(&order)),
        sample_rate: stream
            .sample_rate
            .as_deref()
            .and_then(|text| text.parse().ok()),
        channels: stream.channels,
        bit_rate: bit_rate(stream),
        is_default: stream.disposition.default != 0,
        language: stream.tags.language.as_deref().and_then(parse_language_tag),
        title: stream.tags.title.clone(),
        start_ms: stream
            .start_time
            .as_deref()
            .and_then(parse_seconds_to_millis),
    }
}

/// The average frame rate describes the stream as a whole; the base rate is the fallback for
/// streams whose average ffprobe could not measure.
fn frame_rate(stream: &FfprobeStream) -> Option<Rational> {
    [&stream.avg_frame_rate, &stream.r_frame_rate]
        .into_iter()
        .flatten()
        .find_map(|text| Rational::parse(text))
        .map(Rational::reduced)
}

/// The stream's own bit rate, else the Matroska statistics tags `BPS` and `BPS-eng`.
fn bit_rate(stream: &FfprobeStream) -> Option<u64> {
    [&stream.bit_rate, &stream.tags.bps, &stream.tags.bps_eng]
        .into_iter()
        .flatten()
        .find_map(|text| text.trim().parse().ok())
}

fn parse_hex_id(id: &str) -> Option<u32> {
    u32::from_str_radix(id.strip_prefix("0x")?, 16).ok()
}

fn to_track_kind(codec_type: &str) -> TrackKind {
    match codec_type {
        "video" => TrackKind::Video,
        "audio" => TrackKind::Audio,
        "subtitle" => TrackKind::Subtitle,
        _ => TrackKind::Other,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ffprobe_output::parse_ffprobe_output;

    fn sample_track(index: usize) -> TrackInfo {
        let json = include_str!("../tests/data/ffprobe-sample.json");
        to_track_info(&parse_ffprobe_output(json).expect("parse").streams[index])
    }

    fn matroska_tagged_track() -> TrackInfo {
        let json = include_str!("../tests/data/ffprobe-matroska-tags.json");
        to_track_info(&parse_ffprobe_output(json).expect("parse").streams[0])
    }

    fn video_stream(field_order: &str) -> FfprobeStream {
        let json = format!(
            r#"{{"index":0,"codec_type":"video","codec_name":"h264","profile":"Main","level":21,"field_order":"{field_order}","avg_frame_rate":"0/0","r_frame_rate":"25/1"}}"#
        );
        serde_json::from_str(&json).expect("stream")
    }

    #[test]
    fn spells_the_video_codec_string() {
        assert_eq!(sample_track(0).codec_string.as_deref(), Some("avc1.64000C"));
    }

    #[test]
    fn reads_the_picture_size_and_frame_rate() {
        let video = sample_track(0);
        assert_eq!(
            (video.width, video.height, video.frame_rate),
            (Some(320), Some(180), Some(Rational::new(24, 1)))
        );
    }

    #[test]
    fn reads_the_mp4_track_id_from_the_hex_id() {
        assert_eq!(sample_track(1).container_track_id, Some(2));
    }

    #[test]
    fn reads_the_audio_sample_rate_channels_and_bit_rate() {
        let audio = sample_track(1);
        assert_eq!(
            (audio.sample_rate, audio.channels, audio.bit_rate),
            (Some(44100), Some(1), Some(48_361))
        );
    }

    #[test]
    fn keeps_the_subtitle_language_and_drops_undetermined_ones() {
        let languages: Vec<Option<String>> =
            (0..3).map(|index| sample_track(index).language).collect();
        assert_eq!(languages, [None, None, Some("eng".to_owned())]);
    }

    #[test]
    fn treats_each_interlaced_field_order_as_interlaced() {
        let interlaced: Vec<bool> = ["progressive", "tt", "bb", "tb", "bt"]
            .iter()
            .map(|order| to_track_info(&video_stream(order)).interlaced)
            .collect();
        assert_eq!(interlaced, [false, true, true, true, true]);
    }

    #[test]
    fn falls_back_to_the_base_frame_rate_without_an_average() {
        assert_eq!(
            to_track_info(&video_stream("progressive")).frame_rate,
            Some(Rational::new(25, 1))
        );
    }

    #[test]
    fn falls_back_to_the_matroska_statistics_tag_for_the_bit_rate() {
        assert_eq!(matroska_tagged_track().bit_rate, Some(1_500_000));
    }

    #[test]
    fn reads_the_title_tag() {
        assert_eq!(
            matroska_tagged_track().title.as_deref(),
            Some("Director's commentary")
        );
    }

    #[test]
    fn spells_dolby_digital() {
        assert_eq!(
            matroska_tagged_track().codec_string.as_deref(),
            Some("ac-3")
        );
    }
}

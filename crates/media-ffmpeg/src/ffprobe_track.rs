//! Converts one ffprobe stream into the application's track description.

use easyimmerse_media::{
    AudioDetails, FrameRate, TrackInfo, TrackKind, VideoDetails, parse_language_tag,
};

use crate::ffprobe_output::FfprobeStream;

pub(crate) fn to_track_info(stream: &FfprobeStream) -> TrackInfo {
    let kind = to_track_kind(&stream.codec_type);
    let codec = stream
        .codec_name
        .clone()
        .unwrap_or_else(|| "unknown".to_owned());
    TrackInfo {
        profile: stream.profile.clone(),
        level: stream.level.and_then(|level| u32::try_from(level).ok()),
        bit_rate: stream
            .bit_rate
            .as_deref()
            .and_then(|rate| rate.parse().ok()),
        language: stream.tags.language.as_deref().and_then(parse_language_tag),
        title: stream.tags.title.clone(),
        is_default: stream.disposition.default != 0,
        video: (kind == TrackKind::Video).then(|| to_video_details(stream)),
        audio: (kind == TrackKind::Audio).then(|| to_audio_details(stream)),
        ..TrackInfo::new(stream.index, kind, codec)
    }
}

fn to_track_kind(codec_type: &str) -> TrackKind {
    match codec_type {
        "video" => TrackKind::Video,
        "audio" => TrackKind::Audio,
        "subtitle" => TrackKind::Subtitle,
        _ => TrackKind::Other,
    }
}

fn to_video_details(stream: &FfprobeStream) -> VideoDetails {
    VideoDetails {
        width: stream.width,
        height: stream.height,
        frame_rate: to_frame_rate(stream),
        pixel_format: stream.pix_fmt.clone(),
    }
}

fn to_audio_details(stream: &FfprobeStream) -> AudioDetails {
    AudioDetails {
        sample_rate: stream
            .sample_rate
            .as_deref()
            .and_then(|rate| rate.parse().ok()),
        channels: stream.channels,
    }
}

/// Prefers the average frame rate and falls back to `r_frame_rate` when the average is unknown.
fn to_frame_rate(stream: &FfprobeStream) -> Option<FrameRate> {
    let parse = |rate: &Option<String>| rate.as_deref().and_then(parse_frame_rate);
    parse(&stream.avg_frame_rate).or_else(|| parse(&stream.r_frame_rate))
}

fn parse_frame_rate(fraction: &str) -> Option<FrameRate> {
    let (numerator, denominator) = fraction.split_once('/')?;
    FrameRate::new(numerator.parse().ok()?, denominator.parse().ok()?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ffprobe_output::parse_ffprobe_output;

    fn stream_from(json: &str) -> FfprobeStream {
        serde_json::from_str(json).expect("parse")
    }

    fn mkv_sample_track(index: usize) -> TrackInfo {
        let json = include_str!("../tests/data/ffprobe-sample-mkv.json");
        let output = parse_ffprobe_output(json).expect("parse");
        to_track_info(&output.streams[index])
    }

    #[test]
    fn reads_the_video_profile() {
        assert_eq!(mkv_sample_track(0).profile.as_deref(), Some("High"));
    }

    #[test]
    fn reads_the_video_level() {
        assert_eq!(mkv_sample_track(0).level, Some(12));
    }

    #[test]
    fn treats_a_negative_level_as_unknown() {
        let stream = stream_from(r#"{"index":0,"codec_type":"video","level":-99}"#);
        assert_eq!(to_track_info(&stream).level, None);
    }

    #[test]
    fn reads_the_video_details() {
        let expected = VideoDetails {
            width: Some(320),
            height: Some(180),
            frame_rate: FrameRate::new(24, 1),
            pixel_format: Some("yuv420p".to_owned()),
        };
        assert_eq!(mkv_sample_track(0).video, Some(expected));
    }

    #[test]
    fn reads_the_audio_details() {
        let expected = AudioDetails {
            sample_rate: Some(44100),
            channels: Some(1),
        };
        assert_eq!(mkv_sample_track(1).audio, Some(expected));
    }

    #[test]
    fn gives_a_subtitle_neither_video_nor_audio_details() {
        let subtitle = mkv_sample_track(2);
        assert_eq!((subtitle.video, subtitle.audio), (None, None));
    }

    #[test]
    fn reads_an_unset_default_disposition() {
        assert!(!mkv_sample_track(1).is_default);
    }

    #[test]
    fn reads_the_title_tag() {
        let stream =
            stream_from(r#"{"index":1,"codec_type":"audio","tags":{"title":"Commentary"}}"#);
        assert_eq!(to_track_info(&stream).title.as_deref(), Some("Commentary"));
    }

    #[test]
    fn parses_the_bit_rate() {
        let stream = stream_from(r#"{"index":0,"codec_type":"audio","bit_rate":"192000"}"#);
        assert_eq!(to_track_info(&stream).bit_rate, Some(192000));
    }

    #[test]
    fn keeps_an_ntsc_frame_rate_exact() {
        assert_eq!(parse_frame_rate("24000/1001"), FrameRate::new(24000, 1001));
    }

    #[test]
    fn falls_back_to_the_real_frame_rate_when_the_average_is_unknown() {
        let stream = stream_from(
            r#"{"index":0,"codec_type":"video","avg_frame_rate":"0/0","r_frame_rate":"25/1"}"#,
        );
        assert_eq!(to_frame_rate(&stream), FrameRate::new(25, 1));
    }
}

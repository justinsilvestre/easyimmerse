use easyimmerse_media::{Rational, SourceTiming, plan_segments};
use easyimmerse_media_ffmpeg::{FfmpegPaths, list_keyframes};

use crate::support::{ffprobe_available, fixture_path};

fn keyframes(name: &str, stream_index: u32) -> SourceTiming {
    list_keyframes(&fixture_path(name), stream_index, &FfmpegPaths::default()).expect("keyframes")
}

#[test]
fn lists_a_keyframe_every_two_seconds_in_the_mp4_fixture() {
    if !ffprobe_available() {
        return;
    }
    let timing = keyframes("conversion-h264-aac.mp4", 0);
    let seconds: Vec<i64> = timing
        .keyframe_ticks
        .iter()
        .map(|&ticks| timing.timebase.ticks_to_micros(ticks) / 1_000_000)
        .collect();
    assert_eq!(seconds, [0, 2, 4, 6, 8]);
}

#[test]
fn reads_the_transport_stream_timebase_and_start_time() {
    if !ffprobe_available() {
        return;
    }
    let timing = keyframes("conversion-h264-aac.ts", 0);
    assert_eq!(
        (timing.timebase, timing.start_ticks),
        (Rational::new(1, 90_000), 131_280)
    );
}

#[test]
fn plans_five_segments_ending_at_the_duration_for_the_matroska_fixture() {
    if !ffprobe_available() {
        return;
    }
    let plan = plan_segments(&keyframes("conversion-h264-aac.mkv", 0));
    let ends: Vec<i64> = plan
        .segments
        .iter()
        .map(|segment| segment.end_ticks)
        .collect();
    assert_eq!(ends, [2000, 4000, 6000, 8000, 10_021]);
}

#[test]
fn lists_no_keyframes_for_an_audio_stream_asked_as_video_would_be() {
    if !ffprobe_available() {
        return;
    }
    let timing = keyframes("conversion-tone.flac", 0);
    assert_eq!(timing.duration_ticks, 16_000 * 8);
}

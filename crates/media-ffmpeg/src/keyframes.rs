//! Keyframe positions of one stream, read from ffprobe's packet listing.

use std::path::Path;

use easyimmerse_media::{Rational, SourceTiming};

use crate::error::FfmpegError;
use crate::ffprobe_command::run_ffprobe;
use crate::ffprobe_time::parse_seconds_to_micros;
use crate::ffprobe_timing_output::{FfprobeTimingOutput, parse_ffprobe_timing_output};
use crate::locate::FfmpegPaths;

/// Lists the keyframes of the given stream together with its timebase and the format's start
/// time and duration, all in the stream's ticks. For an audio-only source, pass the audio stream:
/// its keyframes are ignored by the segment planner, which cuts nominal segments instead.
pub fn list_keyframes(
    path: &Path,
    stream_index: u32,
    paths: &FfmpegPaths,
) -> Result<SourceTiming, FfmpegError> {
    let selector = stream_index.to_string();
    let args = [
        "-select_streams",
        &selector,
        "-show_entries",
        "packet=pts,dts,flags:stream=index,time_base,start_pts,start_time:format=duration,start_time",
    ];
    let json = run_ffprobe(&args, path, paths)?;
    to_source_timing(&parse_ffprobe_timing_output(&json)?, stream_index)
}

pub(crate) fn to_source_timing(
    output: &FfprobeTimingOutput,
    stream_index: u32,
) -> Result<SourceTiming, FfmpegError> {
    let stream = output
        .streams
        .iter()
        .find(|stream| stream.index == stream_index)
        .ok_or(FfmpegError::StreamNotFound(stream_index))?;
    let timebase = Rational::parse(&stream.time_base)
        .ok_or_else(|| FfmpegError::InvalidTimebase(stream.time_base.clone()))?;
    let mut keyframe_ticks: Vec<i64> = output
        .packets
        .iter()
        .filter(|packet| packet.is_keyframe())
        .filter_map(|packet| packet.presentation_time())
        .collect();
    keyframe_ticks.sort_unstable();
    keyframe_ticks.dedup();
    Ok(SourceTiming {
        timebase,
        start_ticks: format_micros(output.format.start_time.as_deref())
            .map_or(0, |micros| timebase.ticks_from_micros(micros)),
        duration_ticks: format_micros(output.format.duration.as_deref())
            .map_or(0, |micros| timebase.ticks_from_micros(micros)),
        keyframe_ticks,
    })
}

fn format_micros(text: Option<&str>) -> Option<i64> {
    text.and_then(parse_seconds_to_micros)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_timing() -> SourceTiming {
        let json = include_str!("../tests/data/ffprobe-packets-sample.json");
        to_source_timing(&parse_ffprobe_timing_output(json).expect("parse"), 0).expect("timing")
    }

    #[test]
    fn reads_the_timebase() {
        assert_eq!(sample_timing().timebase, Rational::new(1, 12288));
    }

    #[test]
    fn lists_the_keyframe_presentation_times_in_order() {
        assert_eq!(sample_timing().keyframe_ticks, [0, 2560]);
    }

    #[test]
    fn converts_the_format_duration_to_stream_ticks() {
        assert_eq!(sample_timing().duration_ticks, 12288 * 5);
    }

    #[test]
    fn reports_a_missing_stream() {
        let json = include_str!("../tests/data/ffprobe-packets-sample.json");
        let result = to_source_timing(&parse_ffprobe_timing_output(json).expect("parse"), 3);
        assert!(matches!(result, Err(FfmpegError::StreamNotFound(3))));
    }
}

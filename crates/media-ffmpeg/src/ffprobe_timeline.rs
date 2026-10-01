//! The JSON that ffprobe prints for one stream's time base and the format's start time and duration.

use easyimmerse_media::{MediaTimeline, Timebase};
use serde::Deserialize;

use crate::keyframe_index::KeyframeIndexError;

/// The most decimal places accepted in a time, so that the matching power of ten fits in a `u64`.
const MAX_DECIMAL_PLACES: u32 = 18;

#[derive(Deserialize)]
struct TimelineOutput {
    #[serde(default)]
    streams: Vec<TimelineStream>,
    format: TimelineFormat,
}

#[derive(Deserialize)]
struct TimelineStream {
    /// A fraction such as `1/1000`.
    time_base: String,
}

/// Times in seconds as decimal strings. ffprobe leaves out a value it does not know.
#[derive(Deserialize)]
struct TimelineFormat {
    start_time: Option<String>,
    duration: Option<String>,
}

/// Parses the output for the stream that `stream` selected. A missing start time counts as zero.
pub(crate) fn parse_timeline(
    json: &str,
    stream: &'static str,
) -> Result<MediaTimeline, KeyframeIndexError> {
    let output: TimelineOutput = serde_json::from_str(json)?;
    let selected = output
        .streams
        .first()
        .ok_or(KeyframeIndexError::MissingStream(stream))?;
    let timebase = parse_timebase(&selected.time_base)
        .ok_or_else(|| invalid("time base", &selected.time_base))?;
    let start_time = output.format.start_time.as_deref().unwrap_or("0");
    let duration = output.format.duration.as_deref().unwrap_or("");
    Ok(MediaTimeline {
        timebase,
        start_pts: seconds_to_ticks(start_time, timebase)
            .ok_or_else(|| invalid("start time", start_time))?,
        duration_ticks: seconds_to_ticks(duration, timebase)
            .and_then(|ticks| u64::try_from(ticks).ok())
            .ok_or_else(|| invalid("duration", duration))?,
    })
}

fn parse_timebase(text: &str) -> Option<Timebase> {
    let (numerator, denominator) = text.split_once('/')?;
    Timebase::new(numerator.parse().ok()?, denominator.parse().ok()?)
}

/// Converts decimal seconds such as `-0.021333` to ticks exactly, rounding only once at the end.
fn seconds_to_ticks(text: &str, timebase: Timebase) -> Option<i64> {
    let (sign, unsigned) = text.strip_prefix('-').map_or((1, text), |rest| (-1, rest));
    let (whole, fraction) = unsigned.split_once('.').unwrap_or((unsigned, ""));
    let places = u32::try_from(fraction.len())
        .ok()
        .filter(|&places| places <= MAX_DECIMAL_PLACES)?;
    let digits: i128 = format!("{whole}{fraction}").parse().ok()?;
    let ticks = timebase.units_to_ticks(sign * digits, 10_u64.pow(places));
    i64::try_from(ticks).ok()
}

fn invalid(field: &'static str, value: &str) -> KeyframeIndexError {
    KeyframeIndexError::InvalidValue {
        field,
        value: value.to_owned(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const MP3_OUTPUT: &str = r#"{
        "streams": [{ "time_base": "1/14112000" }],
        "format": { "start_time": "0.023021", "duration": "10.000000" }
    }"#;

    fn timebase(numerator: u64, denominator: u64) -> Timebase {
        Timebase::new(numerator, denominator).expect("nonzero timebase")
    }

    #[test]
    fn reads_the_time_base() {
        let timeline = parse_timeline(MP3_OUTPUT, "a:0").expect("parse");
        assert_eq!(timeline.timebase, timebase(1, 14_112_000));
    }

    #[test]
    fn converts_the_start_time_to_ticks() {
        let timeline = parse_timeline(MP3_OUTPUT, "a:0").expect("parse");
        assert_eq!(timeline.start_pts, 324_872);
    }

    #[test]
    fn converts_the_duration_to_ticks() {
        let timeline = parse_timeline(MP3_OUTPUT, "a:0").expect("parse");
        assert_eq!(timeline.duration_ticks, 141_120_000);
    }

    #[test]
    fn converts_a_negative_start_time() {
        assert_eq!(
            seconds_to_ticks("-0.021333", timebase(1, 48_000)),
            Some(-1024)
        );
    }

    #[test]
    fn reports_a_missing_stream() {
        let json = r#"{ "streams": [], "format": { "duration": "1.0" } }"#;
        assert!(matches!(
            parse_timeline(json, "v:0"),
            Err(KeyframeIndexError::MissingStream("v:0"))
        ));
    }

    #[test]
    fn rejects_a_missing_duration() {
        let json = r#"{ "streams": [{ "time_base": "1/1000" }], "format": {} }"#;
        assert!(matches!(
            parse_timeline(json, "v:0"),
            Err(KeyframeIndexError::InvalidValue { .. })
        ));
    }
}

//! Text segments with time ranges, parsed from subtitle files.

mod error;
mod srt;
mod timestamp;
mod track;
mod vtt;

pub use error::TimedTextError;
pub use srt::parse_srt;
pub use timestamp::parse_timestamp;
pub use track::{Cue, TimedTextTrack};
pub use vtt::parse_vtt;

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::text_source::TextSource;

/// Parses subtitle text, detecting the format from the text when none is given.
pub fn parse_timed_text(
    text: &str,
    format: Option<TimedTextFormat>,
) -> Result<TimedTextTrack, TimedTextError> {
    match format.unwrap_or_else(|| detect_format(text)) {
        TimedTextFormat::Srt => parse_srt(text),
        TimedTextFormat::Vtt => parse_vtt(text),
    }
}

/// Reports WebVTT when the text starts with a `WEBVTT` header, and SubRip otherwise.
pub fn detect_format(text: &str) -> TimedTextFormat {
    if crate::text_blocks::strip_bom(text).starts_with("WEBVTT") {
        TimedTextFormat::Vtt
    } else {
        TimedTextFormat::Srt
    }
}

/// The request body shared by the HTTP route and the WebAssembly facade.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ParseTimedTextRequest {
    pub source: TextSource,
    pub format: Option<TimedTextFormat>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "lowercase")]
#[ts(export)]
pub enum TimedTextFormat {
    Srt,
    Vtt,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::read_fixture_text;

    #[test]
    fn detects_vtt_from_the_header() {
        assert_eq!(detect_format("WEBVTT\n\n"), TimedTextFormat::Vtt);
    }

    #[test]
    fn detects_vtt_behind_a_byte_order_mark() {
        assert_eq!(detect_format("\u{feff}WEBVTT\n\n"), TimedTextFormat::Vtt);
    }

    #[test]
    fn detects_srt_when_there_is_no_header() {
        assert_eq!(
            detect_format("1\n00:00:00,000 --> 00:00:01,000\nHi"),
            TimedTextFormat::Srt
        );
    }

    #[test]
    fn uses_the_given_format_over_detection() {
        let result = parse_timed_text(
            "1\n00:00:00,000 --> 00:00:01,000\nHi",
            Some(TimedTextFormat::Vtt),
        );
        assert_eq!(result, Err(TimedTextError::MissingWebVttHeader));
    }

    #[test]
    fn parses_the_srt_and_vtt_fixtures_to_the_same_cues() {
        let srt = parse_timed_text(&read_fixture_text("sample.srt"), None).unwrap();
        let vtt = parse_timed_text(&read_fixture_text("sample.vtt"), None).unwrap();
        assert_eq!(srt.cues, vtt.cues);
    }

    #[test]
    fn deserializes_a_request_with_an_inline_source() {
        let request: ParseTimedTextRequest =
            serde_json::from_str(r#"{"source":{"kind":"inline","text":"WEBVTT"},"format":"vtt"}"#)
                .unwrap();
        assert_eq!(
            request,
            ParseTimedTextRequest {
                source: TextSource::Inline {
                    text: "WEBVTT".into()
                },
                format: Some(TimedTextFormat::Vtt)
            }
        );
    }
}

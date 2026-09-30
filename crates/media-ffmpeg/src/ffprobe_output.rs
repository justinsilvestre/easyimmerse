//! The JSON that `ffprobe -print_format json -show_format -show_streams` prints.
//! Only the fields this application reads are declared.

use serde::Deserialize;

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct FfprobeOutput {
    #[serde(default)]
    pub streams: Vec<FfprobeStream>,
    pub format: FfprobeFormat,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct FfprobeFormat {
    /// A comma-separated list of demuxer names, for example `mov,mp4,m4a,3gp,3g2,mj2`.
    pub format_name: String,
    /// The duration in seconds as a decimal string.
    pub duration: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct FfprobeStream {
    pub index: u32,
    pub codec_type: String,
    pub codec_name: Option<String>,
    #[serde(default)]
    pub tags: FfprobeStreamTags,
}

#[derive(Debug, Clone, PartialEq, Default, Deserialize)]
pub struct FfprobeStreamTags {
    pub language: Option<String>,
}

pub fn parse_ffprobe_output(json: &str) -> Result<FfprobeOutput, serde_json::Error> {
    serde_json::from_str(json)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse_sample() -> FfprobeOutput {
        let json = include_str!("../tests/data/ffprobe-sample.json");
        parse_ffprobe_output(json).expect("the committed sample should parse")
    }

    #[test]
    fn reads_the_format_name() {
        assert_eq!(parse_sample().format.format_name, "mov,mp4,m4a,3gp,3g2,mj2");
    }

    #[test]
    fn reads_the_duration_as_a_string() {
        assert_eq!(parse_sample().format.duration.as_deref(), Some("5.000000"));
    }

    #[test]
    fn reads_three_streams() {
        assert_eq!(parse_sample().streams.len(), 3);
    }

    #[test]
    fn reads_the_codec_types_in_order() {
        let types: Vec<String> = parse_sample()
            .streams
            .into_iter()
            .map(|stream| stream.codec_type)
            .collect();
        assert_eq!(types, ["video", "audio", "subtitle"]);
    }

    #[test]
    fn reads_the_subtitle_language() {
        let subtitle = parse_sample().streams.remove(2);
        assert_eq!(subtitle.tags.language.as_deref(), Some("eng"));
    }

    #[test]
    fn tolerates_a_stream_without_tags() {
        let json =
            r#"{"streams":[{"index":0,"codec_type":"video"}],"format":{"format_name":"mp3"}}"#;
        let output = parse_ffprobe_output(json).expect("parse");
        assert_eq!(output.streams[0].tags, FfprobeStreamTags::default());
    }
}

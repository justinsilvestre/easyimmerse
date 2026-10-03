//! The JSON that ffprobe prints for a packet listing of one stream, with the stream's timebase
//! and the format's duration and start time requested alongside.

use serde::Deserialize;

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct FfprobeTimingOutput {
    #[serde(default)]
    pub packets: Vec<FfprobePacket>,
    #[serde(default)]
    pub streams: Vec<FfprobeStreamTiming>,
    pub format: FfprobeFormatTiming,
}

/// A packet's times are in the stream's timebase. Either may be absent.
#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct FfprobePacket {
    pub pts: Option<i64>,
    pub dts: Option<i64>,
    /// Flag letters; `K` in the first position marks a keyframe.
    #[serde(default)]
    pub flags: String,
}

impl FfprobePacket {
    pub fn is_keyframe(&self) -> bool {
        self.flags.starts_with('K')
    }

    /// The presentation time, or the decode time for packets that lack one.
    pub fn presentation_time(&self) -> Option<i64> {
        self.pts.or(self.dts)
    }
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct FfprobeStreamTiming {
    pub index: u32,
    pub time_base: String,
    pub start_pts: Option<i64>,
    pub start_time: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct FfprobeFormatTiming {
    pub duration: Option<String>,
    pub start_time: Option<String>,
}

pub fn parse_ffprobe_timing_output(json: &str) -> Result<FfprobeTimingOutput, serde_json::Error> {
    serde_json::from_str(json)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse_sample() -> FfprobeTimingOutput {
        let json = include_str!("../tests/data/ffprobe-packets-sample.json");
        parse_ffprobe_timing_output(json).expect("the committed sample should parse")
    }

    #[test]
    fn reads_the_packets() {
        assert_eq!(parse_sample().packets.len(), 8);
    }

    #[test]
    fn marks_the_keyframe_packet() {
        let keyframes: Vec<bool> = parse_sample()
            .packets
            .iter()
            .map(FfprobePacket::is_keyframe)
            .collect();
        assert_eq!(
            keyframes,
            [true, false, false, false, false, false, false, true]
        );
    }

    #[test]
    fn falls_back_to_the_decode_time_without_a_presentation_time() {
        let packet = FfprobePacket {
            pts: None,
            dts: Some(42),
            flags: "___".to_owned(),
        };
        assert_eq!(packet.presentation_time(), Some(42));
    }

    #[test]
    fn reads_the_stream_timebase() {
        assert_eq!(parse_sample().streams[0].time_base, "1/12288");
    }

    #[test]
    fn reads_the_format_duration() {
        assert_eq!(parse_sample().format.duration.as_deref(), Some("5.000000"));
    }
}

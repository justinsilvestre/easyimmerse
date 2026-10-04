//! The ffmpeg argument list that decodes one window of an audio track to raw 32-bit floats on
//! standard output, for waveform peaks.

use std::ffi::OsString;
use std::path::Path;

use crate::ffmpeg_time::format_micros_as_seconds;

#[derive(Debug, Clone, PartialEq)]
pub struct WaveformDecode<'a> {
    pub source: &'a Path,
    /// The audio track's stream index counted over all stream kinds.
    pub stream_index: u32,
    /// The window start in player time, which ffmpeg measures from the file's start time.
    pub start_micros: i64,
    pub duration_micros: i64,
    /// The output layout. Passing the track's own values avoids resampling.
    pub sample_rate: u32,
    pub channels: u32,
}

/// Builds the complete argument list for `ffmpeg`, without the program name. The output is
/// interleaved little-endian 32-bit floats in the range -1 to 1 on standard output.
pub fn waveform_decode_args(decode: &WaveformDecode) -> Vec<OsString> {
    let text = [
        "-hide_banner".to_owned(),
        "-nostdin".to_owned(),
        "-loglevel".to_owned(),
        "error".to_owned(),
        "-ss".to_owned(),
        format_micros_as_seconds(decode.start_micros),
        "-t".to_owned(),
        format_micros_as_seconds(decode.duration_micros),
    ];
    let mut args: Vec<OsString> = text.into_iter().map(OsString::from).collect();
    args.push("-i".into());
    args.push(decode.source.as_os_str().to_owned());
    let rest = [
        "-map".to_owned(),
        format!("0:{}", decode.stream_index),
        "-vn".to_owned(),
        "-ac".to_owned(),
        decode.channels.to_string(),
        "-ar".to_owned(),
        decode.sample_rate.to_string(),
        "-f".to_owned(),
        "f32le".to_owned(),
        "-".to_owned(),
    ];
    args.extend(rest.into_iter().map(OsString::from));
    args
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_the_decode_command_exactly() {
        let decode = WaveformDecode {
            source: Path::new("/videos/a.mkv"),
            stream_index: 2,
            start_micros: 30_000_000,
            duration_micros: 30_000_000,
            sample_rate: 48_000,
            channels: 2,
        };
        let args: Vec<String> = waveform_decode_args(&decode)
            .into_iter()
            .map(|arg| arg.to_string_lossy().into_owned())
            .collect();
        assert_eq!(
            args,
            [
                "-hide_banner",
                "-nostdin",
                "-loglevel",
                "error",
                "-ss",
                "30.000000",
                "-t",
                "30.000000",
                "-i",
                "/videos/a.mkv",
                "-map",
                "0:2",
                "-vn",
                "-ac",
                "2",
                "-ar",
                "48000",
                "-f",
                "f32le",
                "-",
            ]
        );
    }
}

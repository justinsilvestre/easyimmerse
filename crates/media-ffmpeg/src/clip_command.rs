//! The ffmpeg argument list that encodes one window of an audio track as AAC in fragmented MP4
//! on standard output, for the sentence audio of flashcards.

use std::ffi::OsString;
use std::path::Path;

use crate::conversion_command::AAC_ENCODER;
use crate::ffmpeg_time::format_micros_as_seconds;

const CLIP_BIT_RATE: &str = "128k";

#[derive(Debug, Clone, PartialEq)]
pub struct AudioClipExtract<'a> {
    pub source: &'a Path,
    /// The audio track's stream index counted over all stream kinds.
    pub stream_index: u32,
    /// The clip start in player time, which ffmpeg measures from the file's start time.
    pub start_micros: i64,
    pub duration_micros: i64,
}

/// Builds the complete argument list for `ffmpeg`, without the program name.
/// The output is an MP4 file with one AAC track, fragmented so that it can be written to a pipe.
pub fn audio_clip_args(clip: &AudioClipExtract) -> Vec<OsString> {
    let text = [
        "-hide_banner".to_owned(),
        "-nostdin".to_owned(),
        "-loglevel".to_owned(),
        "error".to_owned(),
        "-ss".to_owned(),
        format_micros_as_seconds(clip.start_micros),
        "-t".to_owned(),
        format_micros_as_seconds(clip.duration_micros),
    ];
    let mut args: Vec<OsString> = text.into_iter().map(OsString::from).collect();
    args.push("-i".into());
    args.push(clip.source.as_os_str().to_owned());
    let rest = [
        "-map".to_owned(),
        format!("0:{}", clip.stream_index),
        "-vn".to_owned(),
        "-c:a".to_owned(),
        AAC_ENCODER.to_owned(),
        "-b:a".to_owned(),
        CLIP_BIT_RATE.to_owned(),
        "-f".to_owned(),
        "mp4".to_owned(),
        "-movflags".to_owned(),
        "frag_keyframe+empty_moov".to_owned(),
        "-".to_owned(),
    ];
    args.extend(rest.into_iter().map(OsString::from));
    args
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_the_clip_command_exactly() {
        let clip = AudioClipExtract {
            source: Path::new("/videos/a.mkv"),
            stream_index: 1,
            start_micros: 5_400_000,
            duration_micros: 2_800_000,
        };
        let args: Vec<String> = audio_clip_args(&clip)
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
                "5.400000",
                "-t",
                "2.800000",
                "-i",
                "/videos/a.mkv",
                "-map",
                "0:1",
                "-vn",
                "-c:a",
                AAC_ENCODER,
                "-b:a",
                "128k",
                "-f",
                "mp4",
                "-movflags",
                "frag_keyframe+empty_moov",
                "-",
            ]
        );
    }
}

//! The ffmpeg argument list that writes one frame of a video track as a JPEG image to
//! standard output, for flashcard screenshots.

use std::ffi::OsString;
use std::path::Path;

use crate::ffmpeg_time::format_micros_as_seconds;

/// JPEG quality on ffmpeg's 2 (best) to 31 scale.
const JPEG_QUALITY: &str = "3";

#[derive(Debug, Clone, PartialEq)]
pub struct FrameGrab<'a> {
    pub source: &'a Path,
    /// The video track's stream index counted over all stream kinds.
    pub stream_index: u32,
    /// The moment in player time, which ffmpeg measures from the file's start time.
    pub at_micros: i64,
    /// The widest the image may be; a narrower picture keeps its size.
    pub max_width: u32,
}

/// Builds the complete argument list for `ffmpeg`, without the program name. The output is
/// one JPEG image on standard output.
pub fn frame_grab_args(grab: &FrameGrab) -> Vec<OsString> {
    let text = [
        "-hide_banner".to_owned(),
        "-nostdin".to_owned(),
        "-loglevel".to_owned(),
        "error".to_owned(),
        "-ss".to_owned(),
        format_micros_as_seconds(grab.at_micros),
    ];
    let mut args: Vec<OsString> = text.into_iter().map(OsString::from).collect();
    args.push("-i".into());
    args.push(grab.source.as_os_str().to_owned());
    let rest = [
        "-map".to_owned(),
        format!("0:{}", grab.stream_index),
        "-frames:v".to_owned(),
        "1".to_owned(),
        "-vf".to_owned(),
        format!("scale='min({},iw)':-2", grab.max_width),
        "-c:v".to_owned(),
        "mjpeg".to_owned(),
        "-q:v".to_owned(),
        JPEG_QUALITY.to_owned(),
        "-f".to_owned(),
        "image2pipe".to_owned(),
        "-".to_owned(),
    ];
    args.extend(rest.into_iter().map(OsString::from));
    args
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_the_frame_command_exactly() {
        let grab = FrameGrab {
            source: Path::new("/videos/a.mkv"),
            stream_index: 0,
            at_micros: 6_800_000,
            max_width: 640,
        };
        let args: Vec<String> = frame_grab_args(&grab)
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
                "6.800000",
                "-i",
                "/videos/a.mkv",
                "-map",
                "0:0",
                "-frames:v",
                "1",
                "-vf",
                "scale='min(640,iw)':-2",
                "-c:v",
                "mjpeg",
                "-q:v",
                "3",
                "-f",
                "image2pipe",
                "-",
            ]
        );
    }
}

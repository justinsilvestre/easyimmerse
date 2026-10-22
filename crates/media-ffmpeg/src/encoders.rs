//! Discovery of a working H.264 encoder: the names ffmpeg lists, and a one-frame test encode
//! per candidate, since a listed hardware encoder still fails on machines without the hardware.

use std::ffi::OsString;
use std::process::Output;
use std::time::Duration;

use crate::background_command::background_command;
use crate::error::FfmpegError;
use crate::locate::{BinaryName, FfmpegPaths, locate_binary};
use crate::timed_output::output_within;

/// Hardware H.264 encoders in order of preference. Only VideoToolbox has been evaluated.
pub const H264_HARDWARE_ENCODERS: [&str; 6] = [
    "h264_videotoolbox",
    "h264_nvenc",
    "h264_qsv",
    "h264_amf",
    "h264_mf",
    "h264_vaapi",
];

/// Software H.264 encoders.
/// They are tried after every hardware encoder because they are slower.
pub const H264_SOFTWARE_ENCODERS: [&str; 2] = ["libx264", "libopenh264"];

/// A one-frame encode takes well under a second. A driver that hangs would otherwise stall
/// discovery and leave the process running after the app quits.
const TEST_ENCODE_LIMIT: Duration = Duration::from_secs(10);

/// Returns the first candidate encoder that ffmpeg lists and that encodes a test frame.
pub fn find_working_h264_encoder(paths: &FfmpegPaths) -> Result<Option<String>, FfmpegError> {
    let listed = list_encoders(paths)?;
    let working = h264_encoder_candidates()
        .filter(|candidate| listed.iter().any(|name| name == candidate))
        .find(|candidate| test_encode(candidate, paths).is_ok());
    Ok(working.map(str::to_owned))
}

/// Every H.264 encoder discovery tries, in order of preference: hardware first, then software.
pub fn h264_encoder_candidates() -> impl Iterator<Item = &'static str> {
    H264_HARDWARE_ENCODERS
        .into_iter()
        .chain(H264_SOFTWARE_ENCODERS)
}

/// Whether the encoder runs on the processor rather than on video hardware.
pub fn is_software_encoder(encoder: &str) -> bool {
    H264_SOFTWARE_ENCODERS.contains(&encoder)
}

/// The names of every encoder in the ffmpeg build.
pub fn list_encoders(paths: &FfmpegPaths) -> Result<Vec<String>, FfmpegError> {
    let output = run_ffmpeg(&["-hide_banner", "-encoders"], paths)?;
    Ok(parse_encoder_names(&output))
}

/// Encodes one black frame with the encoder and discards the output.
pub fn test_encode(encoder: &str, paths: &FfmpegPaths) -> Result<(), FfmpegError> {
    let mut command = background_command(&locate_binary(BinaryName::Ffmpeg, paths)?);
    command.args(test_encode_args(encoder));
    let output = output_within(&mut command, TEST_ENCODE_LIMIT).map_err(spawn_error)?;
    let output = output.ok_or(FfmpegError::TimedOut {
        binary: BinaryName::Ffmpeg,
        limit: TEST_ENCODE_LIMIT,
    })?;
    successful_stdout(output).map(|_| ())
}

/// The frame is 640x480 because the VideoToolbox encoder rejects smaller pictures. The software
/// encoders accept every one of these options.
pub fn test_encode_args(encoder: &str) -> Vec<OsString> {
    [
        "-hide_banner",
        "-nostdin",
        "-loglevel",
        "error",
        "-f",
        "lavfi",
        "-i",
        "color=c=black:s=640x480:r=25:d=0.04",
        "-frames:v",
        "1",
        "-c:v",
        encoder,
        "-profile:v",
        "high",
        "-pix_fmt",
        "yuv420p",
        "-b:v",
        "1000000",
        "-f",
        "null",
        "-",
    ]
    .into_iter()
    .map(OsString::from)
    .collect()
}

/// Every encoder line of `ffmpeg -encoders` follows the dashed header: six flag letters, the
/// name, then a description.
pub(crate) fn parse_encoder_names(output: &str) -> Vec<String> {
    output
        .lines()
        .skip_while(|line| !line.trim_start().starts_with("------"))
        .skip(1)
        .filter_map(|line| line.split_whitespace().nth(1))
        .map(str::to_owned)
        .collect()
}

pub(crate) fn run_ffmpeg<S: AsRef<std::ffi::OsStr>>(
    args: &[S],
    paths: &FfmpegPaths,
) -> Result<String, FfmpegError> {
    let ffmpeg = locate_binary(BinaryName::Ffmpeg, paths)?;
    let output = background_command(&ffmpeg)
        .args(args)
        .output()
        .map_err(spawn_error)?;
    successful_stdout(output)
}

fn successful_stdout(output: Output) -> Result<String, FfmpegError> {
    if !output.status.success() {
        return Err(FfmpegError::Failed {
            binary: BinaryName::Ffmpeg,
            status: output.status,
            stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        });
    }
    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

fn spawn_error(source: std::io::Error) -> FfmpegError {
    FfmpegError::Spawn {
        binary: BinaryName::Ffmpeg,
        source,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const LISTING: &str = "Encoders:\n V..... = Video\n A..... = Audio\n ------\n \
         V....D h264_videotoolbox    VideoToolbox H.264 Encoder (codec h264)\n \
         A....D aac                  AAC (Advanced Audio Coding)\n \
         A..... aac_at               aac (AudioToolbox) (codec aac)\n";

    #[test]
    fn reads_the_encoder_names_after_the_header() {
        assert_eq!(
            parse_encoder_names(LISTING),
            ["h264_videotoolbox", "aac", "aac_at"]
        );
    }

    const SOFTWARE_LISTING: &str = "Encoders:\n ------\n \
         V....D libx264              libx264 H.264 / AVC / MPEG-4 AVC (codec h264)\n \
         V....D libopenh264          OpenH264 H.264 / AVC / MPEG-4 AVC (codec h264)\n";

    #[test]
    fn reads_software_encoder_names() {
        assert_eq!(
            parse_encoder_names(SOFTWARE_LISTING),
            ["libx264", "libopenh264"]
        );
    }

    #[test]
    fn tries_the_software_encoders_after_every_hardware_encoder() {
        let candidates: Vec<&str> = h264_encoder_candidates().collect();
        assert_eq!(
            candidates[H264_HARDWARE_ENCODERS.len()..],
            ["libx264", "libopenh264"]
        );
    }

    #[test]
    fn tries_videotoolbox_first() {
        assert_eq!(h264_encoder_candidates().next(), Some("h264_videotoolbox"));
    }

    #[test]
    fn counts_libx264_as_a_software_encoder() {
        assert!(is_software_encoder("libx264"));
    }

    #[test]
    fn counts_nvenc_as_a_hardware_encoder() {
        assert!(!is_software_encoder("h264_nvenc"));
    }

    #[test]
    fn reads_nothing_from_an_empty_listing() {
        assert_eq!(parse_encoder_names(""), Vec::<String>::new());
    }

    #[test]
    fn test_encodes_one_frame_with_the_named_encoder() {
        let args: Vec<String> = test_encode_args("h264_nvenc")
            .into_iter()
            .map(|arg| arg.to_string_lossy().into_owned())
            .collect();
        assert!(
            args.join(" ")
                .contains("-frames:v 1 -c:v h264_nvenc -profile:v high -pix_fmt yuv420p")
        );
    }
}

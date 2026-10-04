//! Discovery of a working hardware H.264 encoder: the names ffmpeg lists, and a one-frame test
//! encode per candidate, since a listed encoder still fails on machines without the hardware.

use std::ffi::OsString;

use crate::background_command::background_command;
use crate::error::FfmpegError;
use crate::locate::{BinaryName, FfmpegPaths, locate_binary};

/// Hardware H.264 encoders in order of preference. Only VideoToolbox has been evaluated.
pub const H264_HARDWARE_ENCODERS: [&str; 6] = [
    "h264_videotoolbox",
    "h264_nvenc",
    "h264_qsv",
    "h264_amf",
    "h264_mf",
    "h264_vaapi",
];

/// Returns the first candidate encoder that ffmpeg lists and that encodes a test frame.
pub fn find_working_h264_encoder(paths: &FfmpegPaths) -> Result<Option<String>, FfmpegError> {
    let listed = list_encoders(paths)?;
    let working = H264_HARDWARE_ENCODERS
        .into_iter()
        .filter(|candidate| listed.iter().any(|name| name == candidate))
        .find(|candidate| test_encode(candidate, paths).is_ok());
    Ok(working.map(str::to_owned))
}

/// The names of every encoder in the ffmpeg build.
pub fn list_encoders(paths: &FfmpegPaths) -> Result<Vec<String>, FfmpegError> {
    let output = run_ffmpeg(&["-hide_banner", "-encoders"], paths)?;
    Ok(parse_encoder_names(&output))
}

/// Encodes one black frame with the encoder and discards the output.
pub fn test_encode(encoder: &str, paths: &FfmpegPaths) -> Result<(), FfmpegError> {
    run_ffmpeg(&test_encode_args(encoder), paths).map(|_| ())
}

/// The frame is 640x480 because the VideoToolbox encoder rejects smaller pictures.
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

fn run_ffmpeg<S: AsRef<std::ffi::OsStr>>(
    args: &[S],
    paths: &FfmpegPaths,
) -> Result<String, FfmpegError> {
    let ffmpeg = locate_binary(BinaryName::Ffmpeg, paths)?;
    let output = background_command(&ffmpeg)
        .args(args)
        .output()
        .map_err(|source| FfmpegError::Spawn {
            binary: BinaryName::Ffmpeg,
            source,
        })?;
    if !output.status.success() {
        return Err(FfmpegError::Failed {
            binary: BinaryName::Ffmpeg,
            status: output.status,
            stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        });
    }
    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
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

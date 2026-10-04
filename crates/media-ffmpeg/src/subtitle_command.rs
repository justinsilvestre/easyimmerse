//! The ffmpeg argument list that converts one embedded text subtitle stream to WebVTT on
//! standard output.

use std::ffi::OsString;
use std::path::Path;

/// Builds the complete argument list for `ffmpeg`, without the program name.
/// `stream_index` counts over all stream kinds, as in ffmpeg's `0:N`.
pub fn subtitle_extract_args(source: &Path, stream_index: u32) -> Vec<OsString> {
    let mut args: Vec<OsString> = ["-hide_banner", "-nostdin", "-loglevel", "error", "-i"]
        .into_iter()
        .map(OsString::from)
        .collect();
    args.push(source.as_os_str().to_owned());
    let rest = [
        "-map".to_owned(),
        format!("0:{stream_index}"),
        "-f".to_owned(),
        "webvtt".to_owned(),
        "-".to_owned(),
    ];
    args.extend(rest.into_iter().map(OsString::from));
    args
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_the_extract_command_exactly() {
        let args: Vec<String> = subtitle_extract_args(Path::new("/videos/a.mkv"), 3)
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
                "-i",
                "/videos/a.mkv",
                "-map",
                "0:3",
                "-f",
                "webvtt",
                "-",
            ]
        );
    }
}

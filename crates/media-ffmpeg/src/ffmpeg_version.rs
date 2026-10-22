//! The version of the ffmpeg build in use, as `ffmpeg -version` reports it.

use crate::encoders::run_ffmpeg;
use crate::error::FfmpegError;
use crate::locate::FfmpegPaths;

/// The version token of `ffmpeg -version`, such as `8.1.2` or `n7.1-gyan`.
pub fn read_ffmpeg_version(paths: &FfmpegPaths) -> Result<String, FfmpegError> {
    let output = run_ffmpeg(&["-hide_banner", "-version"], paths)?;
    Ok(parse_ffmpeg_version(&output))
}

/// The first line reads `ffmpeg version <version> Copyright ...`. A first line of another form
/// is returned whole, so that an unusual build still shows something recognisable.
pub(crate) fn parse_ffmpeg_version(output: &str) -> String {
    let first_line = output.lines().next().unwrap_or_default().trim();
    let mut words = first_line.split_whitespace();
    let token = words.by_ref().skip_while(|word| *word != "version").nth(1);
    token.unwrap_or(first_line).to_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_the_token_after_version() {
        let output = "ffmpeg version 8.1.2 Copyright (c) 2000-2026 the FFmpeg developers\n\
                      built with Apple clang\n";
        assert_eq!(parse_ffmpeg_version(output), "8.1.2");
    }

    #[test]
    fn reads_a_build_suffixed_version() {
        let output = "ffmpeg version 7.1-full_build-www.gyan.dev Copyright (c) 2000-2024\n";
        assert_eq!(parse_ffmpeg_version(output), "7.1-full_build-www.gyan.dev");
    }

    #[test]
    fn keeps_an_unusual_first_line_whole() {
        assert_eq!(parse_ffmpeg_version("stand-in ffmpeg\n"), "stand-in ffmpeg");
    }
}

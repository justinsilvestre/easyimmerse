//! Reading the encoder list that `ffmpeg -encoders` prints.

use std::collections::HashSet;

/// The line that separates the legend from the encoder entries.
const LEGEND_END: &str = "------";

/// Returns the names of the encoders listed in the output of `ffmpeg -encoders`.
pub(crate) fn parse_encoder_names(output: &str) -> HashSet<String> {
    output
        .lines()
        .skip_while(|line| line.trim() != LEGEND_END)
        .skip(1)
        .filter_map(|line| line.split_whitespace().nth(1))
        .map(str::to_owned)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_names() -> HashSet<String> {
        parse_encoder_names(include_str!("../tests/data/ffmpeg-encoders-sample.txt"))
    }

    #[test]
    fn finds_a_listed_video_encoder() {
        assert!(sample_names().contains("h264_videotoolbox"));
    }

    #[test]
    fn finds_every_listed_encoder() {
        assert_eq!(sample_names().len(), 8);
    }

    #[test]
    fn ignores_the_legend() {
        assert!(!sample_names().contains("="));
    }

    #[test]
    fn finds_nothing_without_the_legend_separator() {
        assert!(parse_encoder_names(" V....D h264_videotoolbox    H.264").is_empty());
    }
}

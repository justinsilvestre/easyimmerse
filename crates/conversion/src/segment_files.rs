//! The file names inside a cache entry.

pub use easyimmerse_media_ffmpeg::INIT_SEGMENT_FILE_NAME;

const SEGMENT_PREFIX: &str = "s";
const SEGMENT_EXTENSION: &str = ".m4s";

/// The file name of a planned segment, such as `s00042.m4s`.
pub fn segment_file_name(index: usize) -> String {
    format!("{SEGMENT_PREFIX}{index:05}{SEGMENT_EXTENSION}")
}

/// The segment index a file name such as `s00042.m4s` stands for.
pub fn parse_segment_file_name(name: &str) -> Option<usize> {
    let digits = name
        .strip_prefix(SEGMENT_PREFIX)?
        .strip_suffix(SEGMENT_EXTENSION)?;
    (digits.len() >= 5 && digits.bytes().all(|byte| byte.is_ascii_digit()))
        .then(|| digits.parse().ok())
        .flatten()
}

/// True for a finished segment file written by a run; in-progress files end in `.tmp`.
pub fn is_finished_segment_file(name: &str) -> bool {
    name.ends_with(SEGMENT_EXTENSION)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pads_the_index_to_five_digits() {
        assert_eq!(segment_file_name(42), "s00042.m4s");
    }

    #[test]
    fn parses_its_own_names() {
        assert_eq!(parse_segment_file_name("s00042.m4s"), Some(42));
    }

    #[test]
    fn rejects_other_names() {
        let parsed = ["init.mp4", "s42.m4s", "s00042.m4s.tmp", "../x"].map(parse_segment_file_name);
        assert_eq!(parsed, [None; 4]);
    }

    #[test]
    fn treats_a_temporary_file_as_unfinished() {
        assert!(!is_finished_segment_file("s00001.m4s.tmp"));
    }
}

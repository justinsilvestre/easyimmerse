use super::TimedTextFormat;
use super::error::TimedTextError;
use super::timestamp::parse_timing_line;
use super::track::{Cue, TimedTextTrack};
use crate::text_blocks::{join_text_lines, remove_byte_order_marks, split_blocks};

/// Parses SubRip text: blank-line separated blocks of an index line, a timing line, and text.
pub fn parse_srt(text: &str) -> Result<TimedTextTrack, TimedTextError> {
    let cues = split_blocks(&remove_byte_order_marks(text))
        .iter()
        .enumerate()
        .map(|(position, block)| parse_cue_block(block, position + 1))
        .collect::<Result<_, _>>()?;
    Ok(TimedTextTrack {
        format: TimedTextFormat::Srt,
        cues,
    })
}

fn parse_cue_block(lines: &[&str], position: usize) -> Result<Cue, TimedTextError> {
    let [index_line, timing_line, text_lines @ ..] = lines else {
        return Err(TimedTextError::MissingTimingLine { position });
    };
    let index = parse_cue_index(index_line)?;
    let (start_ms, end_ms) = parse_timing_line(timing_line)?;
    Ok(Cue {
        index,
        start_ms,
        end_ms,
        text: join_text_lines(text_lines),
    })
}

fn parse_cue_index(line: &str) -> Result<u32, TimedTextError> {
    line.trim()
        .parse()
        .map_err(|_| TimedTextError::InvalidCueIndex(line.trim().to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::read_fixture_text;

    fn parse_fixture() -> TimedTextTrack {
        parse_srt(&read_fixture_text("sample.srt")).expect("fixture should parse")
    }

    #[test]
    fn parses_four_cues_from_the_srt_fixture() {
        assert_eq!(parse_fixture().cues.len(), 4);
    }

    #[test]
    fn reports_the_srt_format() {
        assert_eq!(parse_fixture().format, TimedTextFormat::Srt);
    }

    #[test]
    fn parses_the_first_cue_of_the_fixture() {
        assert_eq!(
            parse_fixture().cues[0],
            Cue {
                index: 1,
                start_ms: 500,
                end_ms: 1_500,
                text: "The cat is sleeping.".into()
            }
        );
    }

    #[test]
    fn joins_the_two_lines_of_cue_two_with_a_newline() {
        assert_eq!(
            parse_fixture().cues[1].text,
            "The dog wants to eat.\nIt is hungry."
        );
    }

    #[test]
    fn keeps_inline_markup_in_cue_three() {
        assert_eq!(parse_fixture().cues[2].text, "<i>Everything</i> is quiet.");
    }

    #[test]
    fn parses_a_file_with_a_byte_order_mark_and_no_final_newline() {
        let track = parse_srt("\u{feff}1\n00:00:00,000 --> 00:00:01,000\nHello").unwrap();
        assert_eq!(track.cues[0].text, "Hello");
    }

    #[test]
    fn parses_a_file_joined_after_another_with_its_byte_order_mark() {
        let joined = "1\n00:00:00,000 --> 00:00:01,000\nHello\n\n\u{feff}2\n00:00:01,000 --> 00:00:02,000\nBye";
        assert_eq!(parse_srt(joined).unwrap().cues[1].text, "Bye");
    }

    #[test]
    fn removes_a_byte_order_mark_inside_cue_text() {
        let track = parse_srt("1\n00:00:00,000 --> 00:00:01,000\nHel\u{feff}lo").unwrap();
        assert_eq!(track.cues[0].text, "Hello");
    }

    #[test]
    fn parses_empty_text_as_an_empty_track() {
        assert_eq!(parse_srt("").unwrap().cues, vec![]);
    }

    #[test]
    fn rejects_a_block_with_a_non_numeric_index() {
        assert_eq!(
            parse_srt("one\n00:00:00,000 --> 00:00:01,000\nHello"),
            Err(TimedTextError::InvalidCueIndex("one".into()))
        );
    }

    #[test]
    fn rejects_a_block_whose_second_line_is_not_a_timing_line() {
        assert_eq!(
            parse_srt("1\nHello"),
            Err(TimedTextError::InvalidTimingLine("Hello".into()))
        );
    }

    #[test]
    fn rejects_a_block_with_only_an_index_line() {
        assert_eq!(
            parse_srt("1\n\n2\n"),
            Err(TimedTextError::MissingTimingLine { position: 1 })
        );
    }
}

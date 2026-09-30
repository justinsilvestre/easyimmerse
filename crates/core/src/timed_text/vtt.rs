use super::TimedTextFormat;
use super::error::TimedTextError;
use super::timestamp::parse_timing_line;
use super::track::{Cue, TimedTextTrack};
use crate::text_blocks::{join_text_lines, split_blocks, strip_bom};

/// Parses WebVTT text. `NOTE`, `STYLE`, and `REGION` blocks are skipped, cue identifiers
/// are optional, and cue settings after the end timestamp are ignored.
pub fn parse_vtt(text: &str) -> Result<TimedTextTrack, TimedTextError> {
    let text = strip_bom(text);
    if !has_webvtt_header(text) {
        return Err(TimedTextError::MissingWebVttHeader);
    }
    let cues = split_blocks(text)
        .iter()
        .filter(|block| is_cue_block(block))
        .enumerate()
        .map(|(position, block)| parse_cue_block(block, position + 1))
        .collect::<Result<_, _>>()?;
    Ok(TimedTextTrack {
        format: TimedTextFormat::Vtt,
        cues,
    })
}

/// The header line is `WEBVTT`, optionally followed by a space or tab and free text.
fn has_webvtt_header(text: &str) -> bool {
    let Some(rest) = text.strip_prefix("WEBVTT") else {
        return false;
    };
    rest.is_empty() || rest.starts_with([' ', '\t', '\n', '\r'])
}

/// A block is a cue unless its first line is the file header
/// or starts a comment, style, or region block.
/// Those keywords count only when the rest of the line is empty or begins with a space or tab,
/// so a cue identifier such as `NOTES-1` is still a cue.
fn is_cue_block(block: &[&str]) -> bool {
    !block.first().is_some_and(|first| {
        ["WEBVTT", "NOTE", "STYLE", "REGION"]
            .iter()
            .any(|word| is_block_keyword(first, word))
    })
}

fn is_block_keyword(line: &str, word: &str) -> bool {
    line.strip_prefix(word)
        .is_some_and(|rest| rest.is_empty() || rest.starts_with([' ', '\t']))
}

/// `position` is the 1-based number of the cue among all cues, used as the index when the
/// cue has no numeric identifier.
fn parse_cue_block(lines: &[&str], position: usize) -> Result<Cue, TimedTextError> {
    let timing_position = lines
        .iter()
        .position(|line| line.contains("-->"))
        .ok_or(TimedTextError::MissingTimingLine { position })?;
    let (start_ms, end_ms) = parse_timing_line(lines[timing_position])?;
    let identifier = lines[..timing_position].last();
    Ok(Cue {
        index: numeric_identifier(identifier).unwrap_or(position as u32),
        start_ms,
        end_ms,
        text: join_text_lines(&lines[timing_position + 1..]),
    })
}

fn numeric_identifier(identifier: Option<&&str>) -> Option<u32> {
    identifier.and_then(|line| line.trim().parse().ok())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::read_fixture_text;

    fn parse_fixture() -> TimedTextTrack {
        parse_vtt(&read_fixture_text("sample.vtt")).expect("fixture should parse")
    }

    #[test]
    fn parses_four_cues_from_the_vtt_fixture() {
        assert_eq!(parse_fixture().cues.len(), 4);
    }

    #[test]
    fn reports_the_vtt_format() {
        assert_eq!(parse_fixture().format, TimedTextFormat::Vtt);
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
    fn ignores_the_cue_settings_of_cue_three() {
        assert_eq!(parse_fixture().cues[2].end_ms, 4_000);
    }

    #[test]
    fn keeps_inline_markup_in_cue_three() {
        assert_eq!(parse_fixture().cues[2].text, "<i>Everything</i> is quiet.");
    }

    #[test]
    fn rejects_text_without_a_webvtt_header() {
        assert_eq!(
            parse_vtt("1\n00:00.000 --> 00:01.000\nHello"),
            Err(TimedTextError::MissingWebVttHeader)
        );
    }

    #[test]
    fn numbers_cues_without_identifiers_by_position() {
        let track = parse_vtt("WEBVTT\n\n00:00.000 --> 00:01.000\nA\n\n00:01.000 --> 00:02.000\nB")
            .unwrap();
        assert_eq!(track.cues[1].index, 2);
    }

    #[test]
    fn numbers_cues_with_non_numeric_identifiers_by_position() {
        let track = parse_vtt("WEBVTT\n\nintro\n00:00.000 --> 00:01.000\nA").unwrap();
        assert_eq!(track.cues[0].index, 1);
    }

    #[test]
    fn skips_style_blocks() {
        let track =
            parse_vtt("WEBVTT\n\nSTYLE\n::cue { color: red }\n\n00:00.000 --> 00:01.000\nA")
                .unwrap();
        assert_eq!(track.cues.len(), 1);
    }

    #[test]
    fn keeps_a_cue_whose_identifier_starts_with_a_block_keyword() {
        let track = parse_vtt("WEBVTT\n\nNOTES-1\n00:00.000 --> 00:01.000\nA").unwrap();
        assert_eq!(track.cues.len(), 1);
    }

    #[test]
    fn skips_a_note_block_with_text_on_the_same_line() {
        let track = parse_vtt("WEBVTT\n\nNOTE a comment\n\n00:00.000 --> 00:01.000\nA").unwrap();
        assert_eq!(track.cues.len(), 1);
    }

    #[test]
    fn accepts_a_header_with_trailing_text() {
        assert!(parse_vtt("WEBVTT - subtitles\n\n00:00.000 --> 00:01.000\nA").is_ok());
    }

    #[test]
    fn rejects_a_cue_block_without_a_timing_line() {
        assert_eq!(
            parse_vtt("WEBVTT\n\nHello"),
            Err(TimedTextError::MissingTimingLine { position: 1 })
        );
    }
}

//! Reads the SubRip text that ffmpeg writes when it converts an embedded subtitle track,
//! and rewrites it as SubRip text that the SubRip parser accepts.

use super::ass_leftovers::{ConvertedFrom, remove_ass_leftovers};
use super::timestamp::parse_timing_line;
use super::track::Cue;

/// Cleans ffmpeg's SubRip output: removes ASS styling commands and vector drawings, drops
/// cues left without text, and numbers the rest from 1.
///
/// ffmpeg writes a blank line inside a cue for an empty line of the source text, so cues
/// are found by their index and timing lines rather than by the blank lines between them.
pub fn clean_converted_srt(text: &str, source: ConvertedFrom) -> String {
    let cues: Vec<Cue> = read_cues(text)
        .into_iter()
        .filter_map(|cue| {
            let text = remove_ass_leftovers(&cue.text, source);
            (!text.is_empty()).then_some(Cue { text, ..cue })
        })
        .enumerate()
        .map(|(position, cue)| Cue {
            index: position as u32 + 1,
            ..cue
        })
        .collect();
    write_srt(&cues)
}

fn read_cues(text: &str) -> Vec<Cue> {
    let lines: Vec<&str> = text.lines().collect();
    let starts: Vec<(usize, (u64, u64))> = (0..lines.len())
        .filter_map(|line_index| cue_timing_at(&lines, line_index).map(|t| (line_index, t)))
        .collect();
    starts
        .iter()
        .enumerate()
        .map(|(position, &(start, (start_ms, end_ms)))| {
            let end = starts.get(position + 1).map_or(lines.len(), |next| next.0);
            Cue {
                index: position as u32 + 1,
                start_ms,
                end_ms,
                text: lines[start + 2..end].join("\n"),
            }
        })
        .collect()
}

/// The timing of the cue that starts at `line_index` with an index line and a timing line.
fn cue_timing_at(lines: &[&str], line_index: usize) -> Option<(u64, u64)> {
    let index_line = lines[line_index].trim();
    let is_index = !index_line.is_empty() && index_line.bytes().all(|byte| byte.is_ascii_digit());
    let timing_line = lines.get(line_index + 1)?;
    is_index
        .then(|| parse_timing_line(timing_line).ok())
        .flatten()
}

/// Writes cues as SubRip text. Cue text must not contain blank lines.
fn write_srt(cues: &[Cue]) -> String {
    cues.iter()
        .map(|cue| {
            let timing = format!("{} --> {}", timestamp(cue.start_ms), timestamp(cue.end_ms));
            format!("{}\n{timing}\n{}\n", cue.index, cue.text)
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn timestamp(ms: u64) -> String {
    let (hours, minutes) = (ms / 3_600_000, ms / 60_000 % 60);
    format!(
        "{hours:02}:{minutes:02}:{:02},{:03}",
        ms / 1_000 % 60,
        ms % 1_000
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::timed_text::parse_srt;

    /// What ffmpeg writes for an ASS track with a positioned line, a line with an empty
    /// line inside it, a vector drawing, and an event with only styling commands.
    const FFMPEG_OUTPUT: &str = "1\r\n00:00:01,000 --> 00:00:02,000\r\n{\\an8}Top line\r\n\r\n\
        2\r\n00:00:02,000 --> 00:00:03,500\r\na\r\n\r\nb\r\n\r\n\
        3\r\n00:00:03,500 --> 00:00:04,000\r\nm 0 0 l 10 0\r\n\r\n\
        4\r\n00:00:04,000 --> 00:00:05,000\r\n\r\n\r\n\
        5\r\n01:02:03,004 --> 01:02:04,000\r\n<i>Last</i> one\r\n";

    fn cleaned_cues() -> Vec<Cue> {
        parse_srt(&clean_converted_srt(FFMPEG_OUTPUT, ConvertedFrom::Ass))
            .expect("the cleaned text should parse")
            .cues
    }

    #[test]
    fn keeps_the_cues_that_have_text() {
        let texts: Vec<String> = cleaned_cues().into_iter().map(|cue| cue.text).collect();
        assert_eq!(texts, ["Top line", "a\nb", "<i>Last</i> one"]);
    }

    #[test]
    fn numbers_the_kept_cues_from_one() {
        let indexes: Vec<u32> = cleaned_cues().iter().map(|cue| cue.index).collect();
        assert_eq!(indexes, [1, 2, 3]);
    }

    #[test]
    fn keeps_the_timing_of_a_cue_past_an_hour() {
        let last = cleaned_cues().pop().expect("a cue");
        assert_eq!((last.start_ms, last.end_ms), (3_723_004, 3_724_000));
    }

    #[test]
    fn writes_nothing_for_empty_input() {
        assert_eq!(clean_converted_srt("", ConvertedFrom::Ass), "");
    }
}

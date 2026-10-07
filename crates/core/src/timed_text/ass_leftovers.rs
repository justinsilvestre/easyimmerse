//! Removes the Advanced SubStation Alpha (ASS) markup that ffmpeg leaves in cue text
//! when it converts an embedded subtitle track to SubRip.

/// The commands of an ASS vector drawing. ffmpeg keeps a drawing's commands and coordinates
/// as if they were words of dialogue.
const DRAWING_COMMANDS: [&str; 7] = ["m", "n", "l", "b", "s", "p", "c"];

/// The format a subtitle track had before ffmpeg converted it, which decides how braces
/// in its text are read.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConvertedFrom {
    /// ASS or its predecessor SubStation Alpha, which use every brace block for styling
    /// commands or comments that are never shown.
    Ass,
    /// Any other text format, in which only a brace block that starts with a backslash
    /// holds styling commands.
    OtherText,
}

/// Removes ASS styling commands and hard spaces from cue text, and drops lines that are
/// empty afterwards or that hold a vector drawing.
pub(crate) fn remove_ass_leftovers(text: &str, source: ConvertedFrom) -> String {
    text.lines()
        .map(|line| clean_line(line, source))
        .filter(|line| !line.is_empty() && !is_drawing(line))
        .collect::<Vec<_>>()
        .join("\n")
}

fn clean_line(line: &str, source: ConvertedFrom) -> String {
    remove_brace_blocks(line, source)
        .replace("\\h", " ")
        .trim()
        .to_owned()
}

fn remove_brace_blocks(line: &str, source: ConvertedFrom) -> String {
    let mut kept = String::with_capacity(line.len());
    let mut rest = line;
    while let Some(start) = rest.find('{') {
        let block = &rest[start..];
        match block.find('}') {
            Some(end) if is_styling_block(&block[..=end], source) => {
                kept.push_str(&rest[..start]);
                rest = &block[end + 1..];
            }
            _ => {
                kept.push_str(&rest[..=start]);
                rest = &rest[start + 1..];
            }
        }
    }
    kept.push_str(rest);
    kept
}

fn is_styling_block(block: &str, source: ConvertedFrom) -> bool {
    source == ConvertedFrom::Ass || block.starts_with("{\\")
}

/// A drawing starts with a move command, followed only by commands and coordinates.
fn is_drawing(line: &str) -> bool {
    let mut words = line.split_whitespace();
    words.next() == Some("m")
        && words.all(|word| DRAWING_COMMANDS.contains(&word) || word.parse::<f64>().is_ok())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn clean_ass(text: &str) -> String {
        remove_ass_leftovers(text, ConvertedFrom::Ass)
    }

    #[test]
    fn removes_a_positioning_tag() {
        assert_eq!(clean_ass("{\\an8}Top line"), "Top line");
    }

    #[test]
    fn removes_styling_tags_inside_a_line() {
        assert_eq!(
            clean_ass("{\\pos(10,20)\\fad(200,200)}Hello {\\c&H00FF00&}there"),
            "Hello there"
        );
    }

    #[test]
    fn removes_a_comment_block_from_ass_text() {
        assert_eq!(clean_ass("Hello{TL note: a greeting}"), "Hello");
    }

    #[test]
    fn keeps_a_brace_block_without_a_backslash_in_other_text() {
        assert_eq!(
            remove_ass_leftovers("{laughs} Hello", ConvertedFrom::OtherText),
            "{laughs} Hello"
        );
    }

    #[test]
    fn removes_a_positioning_tag_from_other_text() {
        assert_eq!(
            remove_ass_leftovers("{\\an8}Hello", ConvertedFrom::OtherText),
            "Hello"
        );
    }

    #[test]
    fn keeps_an_unclosed_brace() {
        assert_eq!(clean_ass("a { b"), "a { b");
    }

    #[test]
    fn turns_a_hard_space_into_a_space() {
        assert_eq!(clean_ass("Mr.\\hSmith"), "Mr. Smith");
    }

    #[test]
    fn keeps_html_style_tags_for_the_display_to_strip() {
        assert_eq!(clean_ass("<i>quietly</i>"), "<i>quietly</i>");
    }

    #[test]
    fn drops_a_line_left_empty() {
        assert_eq!(clean_ass("{\\an8}\nSecond line"), "Second line");
    }

    #[test]
    fn drops_blank_lines_between_lines() {
        assert_eq!(clean_ass("First\n\nSecond"), "First\nSecond");
    }

    #[test]
    fn drops_a_vector_drawing() {
        assert_eq!(clean_ass("m 0 0 l 100 0 100 100 0 100"), "");
    }

    #[test]
    fn keeps_dialogue_that_starts_with_the_letter_m() {
        assert_eq!(clean_ass("m and l are letters"), "m and l are letters");
    }
}

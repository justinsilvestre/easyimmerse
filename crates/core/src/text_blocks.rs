use std::borrow::Cow;

pub(crate) const BYTE_ORDER_MARK: char = '\u{feff}';

/// Splits text into groups of consecutive non-blank lines. Line endings may be LF or CRLF.
pub(crate) fn split_blocks(text: &str) -> Vec<Vec<&str>> {
    let mut blocks = Vec::new();
    let mut current = Vec::new();
    for line in text.lines() {
        if line.trim().is_empty() {
            flush_block(&mut blocks, &mut current);
        } else {
            current.push(line);
        }
    }
    flush_block(&mut blocks, &mut current);
    blocks
}

fn flush_block<'a>(blocks: &mut Vec<Vec<&'a str>>, current: &mut Vec<&'a str>) {
    if !current.is_empty() {
        blocks.push(std::mem::take(current));
    }
}

/// Removes every byte order mark (U+FEFF), wherever it lies.
/// Files joined together carry one at the start of each part, and its other use, as a zero-width no-break space, is deprecated.
pub(crate) fn remove_byte_order_marks(text: &str) -> Cow<'_, str> {
    if text.contains(BYTE_ORDER_MARK) {
        Cow::Owned(text.replace(BYTE_ORDER_MARK, ""))
    } else {
        Cow::Borrowed(text)
    }
}

/// Joins cue text lines with `\n`, dropping trailing whitespace on each line.
pub(crate) fn join_text_lines(lines: &[&str]) -> String {
    lines
        .iter()
        .map(|line| line.trim_end())
        .collect::<Vec<_>>()
        .join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn splits_blocks_on_blank_lines() {
        assert_eq!(split_blocks("a\nb\n\nc\n"), vec![vec!["a", "b"], vec!["c"]]);
    }

    #[test]
    fn treats_whitespace_only_lines_as_blank() {
        assert_eq!(split_blocks("a\n \t\nb"), vec![vec!["a"], vec!["b"]]);
    }

    #[test]
    fn strips_carriage_returns_from_crlf_line_endings() {
        assert_eq!(
            split_blocks("a\r\nb\r\n\r\nc"),
            vec![vec!["a", "b"], vec!["c"]]
        );
    }

    #[test]
    fn removes_a_leading_byte_order_mark() {
        assert_eq!(remove_byte_order_marks("\u{feff}WEBVTT"), "WEBVTT");
    }

    #[test]
    fn removes_byte_order_marks_inside_the_text() {
        assert_eq!(remove_byte_order_marks("a\u{feff}b\u{feff}"), "ab");
    }
}

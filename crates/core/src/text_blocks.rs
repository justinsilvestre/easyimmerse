/// Splits text into groups of consecutive non-blank lines. Line endings may be LF or CRLF.
pub(crate) fn split_blocks(text: &str) -> Vec<Vec<&str>> {
    split_blocks_at(text, |line| line.trim().is_empty())
}

/// Splits text into groups of lines, ending a group at each line `is_separator` accepts.
pub(crate) fn split_blocks_at(text: &str, is_separator: fn(&str) -> bool) -> Vec<Vec<&str>> {
    let mut blocks = Vec::new();
    let mut current = Vec::new();
    for line in text.lines() {
        if is_separator(line) {
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

pub(crate) fn strip_bom(text: &str) -> &str {
    text.trim_start_matches('\u{feff}')
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
    fn strips_a_leading_byte_order_mark() {
        assert_eq!(strip_bom("\u{feff}WEBVTT"), "WEBVTT");
    }
}

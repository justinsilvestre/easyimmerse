use csv::{Reader, ReaderBuilder, Trim};

use super::error::CsvError;

/// Reads the rows of a table, parsing quotes as RFC 4180 describes,
/// and in tab-delimited text also unescaping `\n`, `\t` and `\\` as Tabfile dictionaries write them.
pub fn read_rows(
    body: &str,
    delimiter: u8,
) -> impl Iterator<Item = Result<Vec<String>, CsvError>> + '_ {
    let unescapes = delimiter == b'\t';
    table_reader(body, delimiter)
        .into_records()
        .map(move |record| {
            let record = record?;
            Ok(record
                .iter()
                .map(|cell| clean_cell(cell, unescapes))
                .collect())
        })
}

/// Reads rows of any length, skipping lines that start with `#`, and trims the whitespace around each cell.
pub fn table_reader(body: &str, delimiter: u8) -> Reader<&[u8]> {
    ReaderBuilder::new()
        .delimiter(delimiter)
        .has_headers(false)
        .flexible(true)
        .comment(Some(b'#'))
        .trim(Trim::All)
        .from_reader(body.as_bytes())
}

/// Normalizes Windows line breaks inside a quoted cell, and unescapes Tabfile escapes when asked.
fn clean_cell(cell: &str, unescapes: bool) -> String {
    let cell = cell.replace("\r\n", "\n");
    if unescapes {
        unescape_tabfile(&cell)
    } else {
        cell
    }
}

/// Replaces `\n`, `\t` and `\\` with the characters they stand for, leaving other backslashes as they are.
pub fn unescape_tabfile(cell: &str) -> String {
    let mut unescaped = String::with_capacity(cell.len());
    let mut characters = cell.chars();
    while let Some(character) = characters.next() {
        if character != '\\' {
            unescaped.push(character);
            continue;
        }
        match characters.next() {
            Some('n') => unescaped.push('\n'),
            Some('t') => unescaped.push('\t'),
            Some('\\') => unescaped.push('\\'),
            Some(other) => unescaped.extend(['\\', other]),
            None => unescaped.push('\\'),
        }
    }
    unescaped
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rows(body: &str, delimiter: u8) -> Vec<Vec<String>> {
        read_rows(body, delimiter).map(Result::unwrap).collect()
    }

    #[test]
    fn unescapes_line_breaks_tabs_and_backslashes() {
        assert_eq!(unescape_tabfile(r"a\nb\tc\\d"), "a\nb\tc\\d");
    }

    #[test]
    fn keeps_an_unknown_escape_as_it_is() {
        assert_eq!(unescape_tabfile(r"a\|b"), r"a\|b");
    }

    #[test]
    fn keeps_a_line_break_inside_a_quoted_cell() {
        assert_eq!(
            rows("cat,\"a pet\nthat purrs\"\n", b','),
            vec![vec!["cat", "a pet\nthat purrs"]]
        );
    }

    #[test]
    fn turns_a_windows_line_break_inside_a_quoted_cell_into_a_line_feed() {
        assert_eq!(
            rows("cat,\"a pet\r\nthat purrs\"\r\n", b',')[0][1],
            "a pet\nthat purrs"
        );
    }

    #[test]
    fn reads_a_doubled_quote_as_one_quote() {
        assert_eq!(
            rows("say,\"to utter \"\"words\"\"\"\n", b','),
            vec![vec!["say", "to utter \"words\""]]
        );
    }

    #[test]
    fn unescapes_cells_of_tab_delimited_text() {
        assert_eq!(
            rows("cat\ta pet\\nthat purrs\n", b'\t')[0][1],
            "a pet\nthat purrs"
        );
    }

    #[test]
    fn leaves_backslashes_in_comma_delimited_text() {
        assert_eq!(rows("path,C:\\new\n", b',')[0][1], "C:\\new");
    }

    #[test]
    fn skips_comment_lines() {
        assert_eq!(rows("# a comment\ncat,neko\n", b',').len(), 1);
    }

    #[test]
    fn trims_whitespace_around_cells() {
        assert_eq!(rows("cat , a pet\n", b',')[0], vec!["cat", "a pet"]);
    }

    #[test]
    fn accepts_rows_of_different_lengths() {
        assert_eq!(rows("a,b\nc,d,e\n", b',')[1].len(), 3);
    }
}

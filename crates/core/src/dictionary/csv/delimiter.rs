use super::frequency::parse_number;
use super::records::table_reader;

/// Delimiters worth guessing, in order of preference when several fit.
/// Tab comes first and semicolon last because definitions often contain commas and semicolons.
const CANDIDATES: [u8; 3] = *b"\t,;";

/// The number of rows inspected when guessing.
pub const SAMPLE_SIZE: usize = 50;

/// Chooses the delimiter from the `separator` directive, then the file extension, then the rows themselves.
pub fn choose_delimiter(separator: Option<u8>, extension: &str, body: &str) -> u8 {
    separator
        .or_else(|| matches!(extension, "tsv" | "tab").then_some(b'\t'))
        .unwrap_or_else(|| guess_delimiter(body, extension))
}

fn guess_delimiter(body: &str, extension: &str) -> u8 {
    let fallback = if extension == "csv" { b',' } else { b'\t' };
    CANDIDATES
        .into_iter()
        .find(|&delimiter| has_consistent_width(&row_widths(body, delimiter)))
        .or_else(|| is_space_separated_frequency_list(body).then_some(b' '))
        .or_else(|| {
            CANDIDATES
                .into_iter()
                .find(|&delimiter| splits_every_row(body, delimiter))
        })
        .unwrap_or(fallback)
}

fn row_widths(body: &str, delimiter: u8) -> Vec<usize> {
    sample_rows(body, delimiter).iter().map(Vec::len).collect()
}

fn sample_rows(body: &str, delimiter: u8) -> Vec<Vec<String>> {
    let records = table_reader(body, delimiter).into_records();
    let rows = records.take(SAMPLE_SIZE).filter_map(Result::ok);
    rows.map(|record| record.iter().map(String::from).collect())
        .collect()
}

fn has_consistent_width(widths: &[usize]) -> bool {
    widths
        .first()
        .is_some_and(|&first| first >= 2 && widths.iter().all(|&width| width == first))
}

fn splits_every_row(body: &str, delimiter: u8) -> bool {
    let widths = row_widths(body, delimiter);
    !widths.is_empty() && widths.iter().all(|&width| width >= 2)
}

/// Recognises lists such as FrequencyWords, where each line is a word, a space, and a number.
fn is_space_separated_frequency_list(body: &str) -> bool {
    let rows = sample_rows(body, b' ');
    !rows.is_empty()
        && rows
            .iter()
            .all(|row| row.len() == 2 && parse_number(&row[1]).is_some())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prefers_the_separator_directive() {
        assert_eq!(choose_delimiter(Some(b'|'), "tsv", "a\tb\n"), b'|');
    }

    #[test]
    fn uses_tab_for_a_tsv_file() {
        assert_eq!(choose_delimiter(None, "tsv", "a,b\n"), b'\t');
    }

    #[test]
    fn guesses_a_semicolon_when_definitions_contain_commas() {
        let body = "chat;cat, kitten\nchien;dog\n";
        assert_eq!(choose_delimiter(None, "csv", body), b';');
    }

    #[test]
    fn guesses_a_tab_over_a_comma_when_both_fit() {
        let body = "cat\ta pet, often furry\ndog\ta pet, often loyal\n";
        assert_eq!(choose_delimiter(None, "txt", body), b'\t');
    }

    #[test]
    fn ignores_delimiters_inside_quotes() {
        let body = "cat,\"a pet; furry\"\ndog,loyal\n";
        assert_eq!(choose_delimiter(None, "csv", body), b',');
    }

    #[test]
    fn guesses_a_space_for_a_frequency_list() {
        assert_eq!(choose_delimiter(None, "txt", "the 2000\nof 1500\n"), b' ');
    }

    #[test]
    fn falls_back_to_a_delimiter_that_splits_every_row() {
        let body = "cat,a pet\ndog,a pet,loyal\n";
        assert_eq!(choose_delimiter(None, "txt", body), b',');
    }

    #[test]
    fn falls_back_to_a_comma_for_a_csv_file() {
        assert_eq!(choose_delimiter(None, "csv", "word\n"), b',');
    }
}

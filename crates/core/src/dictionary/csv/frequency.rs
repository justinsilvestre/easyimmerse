use super::super::metadata::FrequencyMode;
use super::super::term_entry::TermEntry;
use super::super::term_meta::{Frequency, TermMeta, TermMetaData};
use super::columns::Column;
use super::layout::Layout;

/// Reads a cell as a number, allowing spaces around it.
pub fn parse_number(cell: &str) -> Option<f64> {
    cell.trim()
        .parse()
        .ok()
        .filter(|number: &f64| number.is_finite())
}

/// Reads unlabelled frequency values as ranks when they never decrease down the file, and as counts otherwise.
pub fn guess_frequency_mode(values: impl IntoIterator<Item = f64>) -> FrequencyMode {
    let values: Vec<f64> = values.into_iter().collect();
    if values.windows(2).all(|pair| pair[0] <= pair[1]) {
        FrequencyMode::RankBased
    } else {
        FrequencyMode::OccurrenceBased
    }
}

/// Builds the frequency of the term on one row of a frequency list.
pub fn row_frequency(row: &[String], layout: &Layout) -> Option<TermMeta> {
    let term = cell_of(row, layout, |column| *column == Column::Term)?;
    Some(TermMeta {
        term: term.clone(),
        reading: cell_of(row, layout, |column| *column == Column::Reading).cloned(),
        data: frequency_data(frequency_cell(row, layout)?),
    })
}

/// Builds the frequency that one row of a table of definitions gives the term and reading of its entry.
pub fn entry_frequency(row: &[String], layout: &Layout, entry: &TermEntry) -> Option<TermMeta> {
    Some(TermMeta {
        term: entry.term.clone(),
        reading: entry.reading.clone(),
        data: frequency_data(frequency_cell(row, layout)?),
    })
}

fn frequency_cell<'a>(row: &'a [String], layout: &Layout) -> Option<&'a String> {
    cell_of(row, layout, |column| matches!(column, Column::Frequency(_)))
}

/// Returns the row's cell in the first column that satisfies `wanted`, unless it is empty.
fn cell_of<'a>(
    row: &'a [String],
    layout: &Layout,
    wanted: impl Fn(&Column) -> bool,
) -> Option<&'a String> {
    let index = layout.columns.iter().position(wanted)?;
    row.get(index).filter(|cell| !cell.is_empty())
}

/// Reads a frequency cell as a number, keeping a value that is not one for display.
fn frequency_data(value: &str) -> TermMetaData {
    TermMetaData::Frequency(Frequency {
        value: parse_number(value),
        display: parse_number(value).is_none().then(|| value.to_string()),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn layout(columns: Vec<Column>) -> Layout {
        Layout::new(columns, super::super::directives::TableKind::Frequency)
    }

    fn row(cells: &[&str]) -> Vec<String> {
        cells.iter().map(|cell| cell.to_string()).collect()
    }

    fn rank_layout() -> Layout {
        layout(vec![
            Column::Term,
            Column::Reading,
            Column::Frequency(FrequencyMode::RankBased),
        ])
    }

    #[test]
    fn parses_a_number_with_surrounding_spaces() {
        assert_eq!(parse_number(" 1532 "), Some(1532.0));
    }

    #[test]
    fn does_not_parse_a_word_as_a_number() {
        assert_eq!(parse_number("cat"), None);
    }

    #[test]
    fn reads_increasing_values_as_ranks() {
        assert_eq!(
            guess_frequency_mode([1.0, 2.0, 2.0, 4.0]),
            FrequencyMode::RankBased
        );
    }

    #[test]
    fn reads_decreasing_values_as_counts() {
        assert_eq!(
            guess_frequency_mode([900.0, 500.0, 20.0]),
            FrequencyMode::OccurrenceBased
        );
    }

    #[test]
    fn builds_a_frequency_with_its_reading() {
        let meta = row_frequency(&row(&["猫", "ねこ", "1532"]), &rank_layout()).unwrap();
        assert_eq!(
            meta,
            TermMeta {
                term: "猫".into(),
                reading: Some("ねこ".into()),
                data: TermMetaData::Frequency(Frequency {
                    value: Some(1532.0),
                    display: None,
                }),
            }
        );
    }

    #[test]
    fn keeps_a_value_that_is_not_a_number_for_display() {
        let meta = row_frequency(&row(&["猫", "", "very common"]), &rank_layout()).unwrap();
        assert_eq!(
            meta.data,
            TermMetaData::Frequency(Frequency {
                value: None,
                display: Some("very common".into()),
            })
        );
    }

    #[test]
    fn gives_the_frequency_to_the_term_and_reading_of_an_entry() {
        let mut entry = TermEntry::new("猫", Vec::new());
        entry.reading = Some("ねこ".into());
        let row = row(&["猫|ネコ", "ねこ", "1532"]);
        let meta = entry_frequency(&row, &rank_layout(), &entry).unwrap();
        assert_eq!(
            (meta.term, meta.reading),
            ("猫".to_string(), Some("ねこ".to_string()))
        );
    }

    #[test]
    fn skips_a_row_without_a_value() {
        assert_eq!(row_frequency(&row(&["猫", "ねこ"]), &rank_layout()), None);
    }
}

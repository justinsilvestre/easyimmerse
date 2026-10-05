use super::super::metadata::FrequencyMode;
use super::columns::{Column, name_column, recognise_column};
use super::directives::{Directives, TableKind};
use super::frequency::{guess_frequency_mode, parse_number};

/// What each column of a table holds, and whether the table lists entries or frequencies.
#[derive(Debug, Clone, PartialEq)]
pub struct Layout {
    pub columns: Vec<Column>,
    pub kind: TableKind,
}

/// The share of cells that must be numbers for an unnamed column to count as a frequency.
const NUMERIC_SHARE: f64 = 0.95;

impl Layout {
    pub fn new(columns: Vec<Column>, kind: TableKind) -> Self {
        Self { columns, kind }
    }

    /// Returns what the column holds; cells beyond the known columns are further definitions.
    pub fn column(&self, index: usize) -> &Column {
        self.columns.get(index).unwrap_or(&Column::Definition)
    }

    pub fn frequency_mode(&self) -> Option<FrequencyMode> {
        self.columns.iter().find_map(|column| match column {
            Column::Frequency(mode) => Some(*mode),
            _ => None,
        })
    }
}

/// Works out the layout from the directives, a header row, or the shape of the sampled rows,
/// and reports whether the first sampled row is a header.
/// The layout may lack a term column, which the caller checks.
pub fn detect_layout(
    directives: &Directives,
    delimiter: u8,
    sample: &[Vec<String>],
) -> (Layout, bool) {
    let (named, has_header) = named_columns(directives, delimiter, sample);
    let data = data_rows(sample, has_header);
    let mut columns = named.unwrap_or_else(|| default_columns(directives, data));
    for (index, column) in &directives.column_roles {
        if let Some(slot) = columns.get_mut(*index) {
            *slot = column.clone();
        }
    }
    (complete_layout(directives, columns, data), has_header)
}

/// Decides whether the table lists entries or frequencies, and gives a frequency list its frequency column.
pub fn complete_layout(
    directives: &Directives,
    mut columns: Vec<Column>,
    data: &[Vec<String>],
) -> Layout {
    let kind = directives.kind.unwrap_or_else(|| infer_kind(&columns));
    if kind == TableKind::Frequency {
        ensure_frequency_column(&mut columns, data);
    }
    Layout::new(columns, kind)
}

/// Returns the sampled rows after any header.
pub fn data_rows(sample: &[Vec<String>], has_header: bool) -> &[Vec<String>] {
    sample.get(usize::from(has_header)..).unwrap_or_default()
}

fn named_columns(
    directives: &Directives,
    delimiter: u8,
    sample: &[Vec<String>],
) -> (Option<Vec<Column>>, bool) {
    if let Some(names) = &directives.columns {
        let columns = names
            .split(char::from(delimiter))
            .map(name_column)
            .collect();
        return (Some(columns), false);
    }
    let header = sample.first().and_then(|row| header_columns(row));
    let has_header = header.is_some();
    (header, has_header)
}

/// Reads a row as a header only when every cell names a known column and one of them is the term,
/// so that an entry such as `word, a unit of language` is not mistaken for a header.
fn header_columns(row: &[String]) -> Option<Vec<Column>> {
    let columns: Vec<Column> = row
        .iter()
        .map(|cell| recognise_column(cell))
        .collect::<Option<_>>()?;
    columns.contains(&Column::Term).then_some(columns)
}

/// Assigns the term, reading and definition, in that order, to the columns that no directive assigns.
fn default_columns(directives: &Directives, data: &[Vec<String>]) -> Vec<Column> {
    let width = data.iter().map(Vec::len).max().unwrap_or(0);
    let is_assigned = |index: &usize| {
        directives
            .column_roles
            .iter()
            .any(|(assigned, _)| assigned == index)
    };
    let free: Vec<usize> = (0..width).filter(|index| !is_assigned(index)).collect();
    let mut columns = vec![Column::Definition; width];
    for (column, index) in default_roles(&free, data).into_iter().zip(&free) {
        columns[*index] = column;
    }
    columns
}

fn default_roles(free: &[usize], data: &[Vec<String>]) -> Vec<Column> {
    let mut roles = match free.len() {
        0 | 1 => vec![Column::Term],
        2 => vec![Column::Term, Column::Definition],
        _ => vec![Column::Term, Column::Reading, Column::Definition],
    };
    if let [_, .., last] = free
        && free.len() <= 3
        && is_numeric_column(data, *last)
        && let Some(role) = roles.last_mut()
    {
        *role = Column::Frequency(guess_frequency_mode(column_numbers(data, *last)));
    }
    roles
}

fn is_numeric_column(data: &[Vec<String>], index: usize) -> bool {
    let filled = data
        .iter()
        .filter_map(|row| row.get(index))
        .filter(|cell| !cell.is_empty())
        .count();
    filled > 0 && column_numbers(data, index).count() as f64 >= NUMERIC_SHARE * filled as f64
}

pub fn column_numbers(data: &[Vec<String>], index: usize) -> impl Iterator<Item = f64> + '_ {
    data.iter()
        .filter_map(move |row| parse_number(row.get(index)?))
}

fn infer_kind(columns: &[Column]) -> TableKind {
    let has_frequency = columns
        .iter()
        .any(|column| matches!(column, Column::Frequency(_)));
    let has_definition = columns
        .iter()
        .any(|column| matches!(column, Column::Definition | Column::Labelled(_)));
    if has_frequency && !has_definition {
        TableKind::Frequency
    } else {
        TableKind::Terms
    }
}

/// Treats the last column that is neither the term nor the reading as the frequency, when no column is named so.
fn ensure_frequency_column(columns: &mut [Column], data: &[Vec<String>]) {
    if columns
        .iter()
        .any(|column| matches!(column, Column::Frequency(_)))
    {
        return;
    }
    let value_index = columns
        .iter()
        .rposition(|column| !matches!(column, Column::Term | Column::Reading));
    if let Some(index) = value_index {
        columns[index] = Column::Frequency(guess_frequency_mode(column_numbers(data, index)));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rows(lines: &[&[&str]]) -> Vec<Vec<String>> {
        lines
            .iter()
            .map(|cells| cells.iter().map(|cell| cell.to_string()).collect())
            .collect()
    }

    fn detect(directives: &Directives, lines: &[&[&str]]) -> (Layout, bool) {
        detect_layout(directives, b',', &rows(lines))
    }

    fn columns_of(lines: &[&[&str]]) -> Vec<Column> {
        detect(&Directives::default(), lines).0.columns
    }

    #[test]
    fn reads_a_header_whose_cells_are_all_column_names() {
        let (layout, has_header) = detect(
            &Directives::default(),
            &[&["Word", "Meaning"], &["cat", "a pet"]],
        );
        assert_eq!(
            (layout.columns, has_header),
            (vec![Column::Term, Column::Definition], true)
        );
    }

    #[test]
    fn does_not_read_an_entry_as_a_header() {
        let (_, has_header) = detect(&Directives::default(), &[&["word", "a unit of language"]]);
        assert!(!has_header);
    }

    #[test]
    fn reads_two_unnamed_columns_as_term_and_definition() {
        assert_eq!(
            columns_of(&[&["cat", "a pet"]]),
            vec![Column::Term, Column::Definition]
        );
    }

    #[test]
    fn reads_three_unnamed_columns_as_term_reading_and_definition() {
        assert_eq!(
            columns_of(&[&["猫", "ねこ", "cat"]]),
            vec![Column::Term, Column::Reading, Column::Definition]
        );
    }

    #[test]
    fn reads_further_unnamed_columns_as_definitions() {
        assert_eq!(
            columns_of(&[&["猫", "ねこ", "cat", "a pet"]])[3],
            Column::Definition
        );
    }

    #[test]
    fn reads_a_numeric_second_column_as_a_count() {
        assert_eq!(
            columns_of(&[&["the", "900"], &["of", "500"]])[1],
            Column::Frequency(FrequencyMode::OccurrenceBased)
        );
    }

    #[test]
    fn reads_an_increasing_numeric_column_as_a_rank() {
        assert_eq!(
            columns_of(&[&["の", "の", "1"], &["に", "に", "2"]])[2],
            Column::Frequency(FrequencyMode::RankBased)
        );
    }

    #[test]
    fn infers_a_frequency_list_from_its_columns() {
        let (layout, _) = detect(&Directives::default(), &[&["the", "900"], &["of", "500"]]);
        assert_eq!(layout.kind, TableKind::Frequency);
    }

    #[test]
    fn names_columns_from_the_columns_directive() {
        let directives = Directives {
            columns: Some("Front,Back,Etymology".into()),
            ..Directives::default()
        };
        assert_eq!(
            detect(&directives, &[&["cat", "a pet", "Old English"]])
                .0
                .columns,
            vec![
                Column::Term,
                Column::Definition,
                Column::Labelled("Etymology".into())
            ]
        );
    }

    #[test]
    fn leaves_the_columns_assigned_by_directives_out_of_the_defaults() {
        let directives = Directives {
            column_roles: vec![(2, Column::Tags)],
            ..Directives::default()
        };
        assert_eq!(
            detect(&directives, &[&["猫", "cat", "noun"]]).0.columns,
            vec![Column::Term, Column::Definition, Column::Tags]
        );
    }

    #[test]
    fn takes_the_last_column_as_the_frequency_when_the_kind_says_so() {
        let directives = Directives {
            kind: Some(TableKind::Frequency),
            ..Directives::default()
        };
        let header: &[&str] = &["term", "meaning"];
        assert_eq!(
            detect(&directives, &[header, &["the", "1"], &["of", "2"]])
                .0
                .frequency_mode(),
            Some(FrequencyMode::RankBased)
        );
    }
}

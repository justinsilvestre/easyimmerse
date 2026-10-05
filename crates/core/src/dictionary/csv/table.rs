use super::super::metadata::{DictionaryFormatKind, DictionaryMetadata};
use super::columns::Column;
use super::delimiter::{SAMPLE_SIZE, choose_delimiter};
use super::directives::{Directives, read_directives};
use super::error::CsvError;
use super::layout::{Layout, complete_layout, data_rows, detect_layout};
use super::records::read_rows;
use super::table_file::{extension, stem};
use super::table_layout::{ColumnRole, TableLayout, TablePreview, chosen_columns};

/// The number of rows a preview shows.
const PREVIEW_ROWS: usize = 5;

/// A decoded table file, with its directives, delimiter and layout worked out from its first rows.
pub struct Table<'text> {
    pub directives: Directives,
    pub layout: Layout,
    body: &'text str,
    delimiter: u8,
    has_header: bool,
}

impl<'text> Table<'text> {
    /// Reads a table for import, with the layout chosen by the user or else the detected one.
    pub fn parse(
        name: &str,
        text: &'text str,
        chosen: Option<&TableLayout>,
    ) -> Result<Self, CsvError> {
        let table = Self::read(name, text, chosen)?;
        if !table.layout.columns.contains(&Column::Term) {
            return Err(CsvError::NoTermColumn);
        }
        Ok(table)
    }

    /// Reads a table without requiring a term column, so that a preview can show a layout lacking one.
    pub fn read(
        name: &str,
        text: &'text str,
        chosen: Option<&TableLayout>,
    ) -> Result<Self, CsvError> {
        let (directives, body) = read_directives(text);
        let extension = extension(name);
        let delimiter = choose_delimiter(directives.separator, &extension, body);
        let sample = read_rows(body, delimiter)
            .take(SAMPLE_SIZE)
            .collect::<Result<Vec<_>, _>>()?;
        if !is_tabular(&sample, extension == "txt") {
            return Err(CsvError::NotTabular(name.to_string()));
        }
        let (mut layout, mut has_header) = detect_layout(&directives, delimiter, &sample);
        if let Some(chosen) = chosen {
            let data = data_rows(&sample, chosen.has_header);
            let columns = chosen_columns(&chosen.columns, &layout.columns, data);
            layout = complete_layout(&directives, columns, data);
            has_header = chosen.has_header;
        }
        Ok(Self {
            directives,
            layout,
            body,
            delimiter,
            has_header,
        })
    }

    /// Returns the layout and the first rows, including any header row.
    /// Cells beyond the known columns are definitions, so the layout covers every cell shown.
    pub fn preview(&self) -> Result<TablePreview, CsvError> {
        let rows = read_rows(self.body, self.delimiter)
            .take(PREVIEW_ROWS)
            .collect::<Result<Vec<_>, _>>()?;
        let width = rows.iter().map(Vec::len).max().unwrap_or(0);
        let columns = (0..width.max(self.layout.columns.len()))
            .map(|index| ColumnRole::of(self.layout.column(index)))
            .collect();
        Ok(TablePreview {
            layout: TableLayout {
                columns,
                has_header: self.has_header,
            },
            rows,
        })
    }

    /// Reads the rows after any header.
    pub fn rows(&self) -> impl Iterator<Item = Result<Vec<String>, CsvError>> + 'text {
        read_rows(self.body, self.delimiter).skip(usize::from(self.has_header))
    }

    /// Describes the dictionary, taking the title from the file name when no directive gives one.
    pub fn metadata(&self, name: &str) -> DictionaryMetadata {
        let directives = &self.directives;
        let title = directives
            .title
            .clone()
            .unwrap_or_else(|| stem(name).to_string());
        let mut metadata = DictionaryMetadata::new(title, DictionaryFormatKind::Csv);
        metadata.revision = directives.revision.clone();
        metadata.description = directives.description.clone();
        metadata.author = directives.author.clone();
        metadata.source_language = directives.source_language.clone();
        metadata.target_language = directives.target_language.clone();
        metadata.frequency_mode = self.layout.frequency_mode();
        metadata
    }
}

/// Reports whether the rows form a table of at least two columns.
/// A `.txt` file may be prose, so there every row must have two cells; elsewhere one such row suffices.
fn is_tabular(sample: &[Vec<String>], is_strict: bool) -> bool {
    let is_split = |row: &Vec<String>| row.len() >= 2;
    match is_strict {
        true => !sample.is_empty() && sample.iter().all(is_split),
        false => sample.iter().any(is_split),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_prose_in_a_text_file() {
        let text = "Dear diary,\nToday I learned a word.\n";
        assert!(matches!(
            Table::parse("notes.txt", text, None),
            Err(CsvError::NotTabular(_))
        ));
    }

    #[test]
    fn rejects_a_single_column() {
        assert!(matches!(
            Table::parse("words.csv", "cat\ndog\n", None),
            Err(CsvError::NotTabular(_))
        ));
    }

    #[test]
    fn skips_the_header_row() {
        let table = Table::parse("words.csv", "word,meaning\ncat,a pet\n", None).unwrap();
        assert_eq!(table.rows().count(), 1);
    }

    #[test]
    fn takes_the_title_from_the_file_name() {
        let table = Table::parse("dicts/animals.csv", "cat,a pet\n", None).unwrap();
        assert_eq!(table.metadata("dicts/animals.csv").title, "animals");
    }

    #[test]
    fn rejects_named_columns_without_a_term() {
        assert!(matches!(
            Table::parse("notes.csv", "#columns:meaning,notes\na pet,furry\n", None),
            Err(CsvError::NoTermColumn)
        ));
    }

    #[test]
    fn rejects_a_chosen_layout_without_a_term() {
        let chosen = TableLayout {
            columns: vec![ColumnRole::Definition, ColumnRole::Definition],
            has_header: false,
        };
        assert!(matches!(
            Table::parse("words.csv", "cat,a pet\n", Some(&chosen)),
            Err(CsvError::NoTermColumn)
        ));
    }

    #[test]
    fn keeps_a_header_row_the_user_says_is_data() {
        let chosen = TableLayout {
            columns: vec![ColumnRole::Term, ColumnRole::Definition],
            has_header: false,
        };
        let table = Table::parse("words.csv", "word,meaning\ncat,a pet\n", Some(&chosen)).unwrap();
        assert_eq!(table.rows().count(), 2);
    }

    #[test]
    fn previews_the_rows_with_the_header() {
        let table = Table::read("words.csv", "word,meaning\ncat,a pet\n", None).unwrap();
        assert_eq!(table.preview().unwrap().rows[0], ["word", "meaning"]);
    }

    #[test]
    fn previews_at_most_five_rows() {
        let text = "a,1\nb,2\nc,3\nd,4\ne,5\nf,6\n";
        let table = Table::read("words.csv", text, None).unwrap();
        assert_eq!(table.preview().unwrap().rows.len(), 5);
    }

    #[test]
    fn previews_a_role_for_every_cell_shown() {
        let table = Table::read("words.csv", "word,meaning\ndog,a pet,loyal\n", None).unwrap();
        assert_eq!(
            table.preview().unwrap().layout.columns,
            [
                ColumnRole::Term,
                ColumnRole::Definition,
                ColumnRole::Definition
            ]
        );
    }

    #[test]
    fn takes_the_title_from_a_directive() {
        let table = Table::parse("animals.csv", "#title:Pets\ncat,a pet\n", None).unwrap();
        assert_eq!(table.metadata("animals.csv").title, "Pets");
    }
}

use super::super::metadata::{DictionaryFormatKind, DictionaryMetadata};
use super::delimiter::{SAMPLE_SIZE, choose_delimiter};
use super::directives::{Directives, read_directives};
use super::error::CsvError;
use super::layout::{Layout, detect_layout};
use super::records::read_rows;
use super::table_file::{extension, stem};

/// A decoded table file, with its directives, delimiter and layout worked out from its first rows.
pub struct Table<'text> {
    pub directives: Directives,
    pub layout: Layout,
    body: &'text str,
    delimiter: u8,
    has_header: bool,
}

impl<'text> Table<'text> {
    pub fn parse(name: &str, text: &'text str) -> Result<Self, CsvError> {
        let (directives, body) = read_directives(text);
        let extension = extension(name);
        let delimiter = choose_delimiter(directives.separator, &extension, body);
        let sample = read_rows(body, delimiter)
            .take(SAMPLE_SIZE)
            .collect::<Result<Vec<_>, _>>()?;
        if !is_tabular(&sample, extension == "txt") {
            return Err(CsvError::NotTabular(name.to_string()));
        }
        let (layout, has_header) = detect_layout(&directives, delimiter, &sample)?;
        Ok(Self {
            directives,
            layout,
            body,
            delimiter,
            has_header,
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
            Table::parse("notes.txt", text),
            Err(CsvError::NotTabular(_))
        ));
    }

    #[test]
    fn rejects_a_single_column() {
        assert!(matches!(
            Table::parse("words.csv", "cat\ndog\n"),
            Err(CsvError::NotTabular(_))
        ));
    }

    #[test]
    fn skips_the_header_row() {
        let table = Table::parse("words.csv", "word,meaning\ncat,a pet\n").unwrap();
        assert_eq!(table.rows().count(), 1);
    }

    #[test]
    fn takes_the_title_from_the_file_name() {
        let table = Table::parse("dicts/animals.csv", "cat,a pet\n").unwrap();
        assert_eq!(table.metadata("dicts/animals.csv").title, "animals");
    }

    #[test]
    fn takes_the_title_from_a_directive() {
        let table = Table::parse("animals.csv", "#title:Pets\ncat,a pet\n").unwrap();
        assert_eq!(table.metadata("animals.csv").title, "Pets");
    }
}

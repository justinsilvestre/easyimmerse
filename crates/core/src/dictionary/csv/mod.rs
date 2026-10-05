//! Tabular dictionaries: CSV, TSV and Tabfile text, one entry or frequency per row.

mod columns;
mod delimiter;
mod directives;
mod encoding;
mod entries;
mod entry_merger;
mod error;
mod frequency;
mod layout;
mod records;
mod table;
mod table_file;

#[cfg(test)]
mod fixture_tests;

pub use error::CsvError;

use std::collections::HashSet;

use super::error::DictionaryError;
use super::format::DictionaryFormat;
use super::metadata::DictionaryFormatKind;
use super::sink::DictionarySink;
use super::source::DictionarySource;
use directives::TableKind;
use encoding::decode_text;
use entries::row_entry;
use entry_merger::EntryMerger;
use frequency::{entry_frequency, row_frequency};
use table::Table;
use table_file::table_file_name;

/// A single table of terms and definitions, or of terms and frequencies,
/// in any of the common delimited text layouts: CSV, TSV, Tabfile, and Anki exports.
pub struct CsvFormat;

impl DictionaryFormat for CsvFormat {
    fn kind(&self) -> DictionaryFormatKind {
        DictionaryFormatKind::Csv
    }

    fn matches(&self, source: &DictionarySource) -> bool {
        table_file_name(source).is_some()
    }

    fn import(
        &self,
        source: &mut DictionarySource,
        sink: &mut dyn DictionarySink,
    ) -> Result<(), DictionaryError> {
        let name = table_file_name(source)
            .ok_or(CsvError::NoTableFile)?
            .to_string();
        let text = decode_text(source.read(&name)?);
        let table = Table::parse(&name, &text)?;
        sink.begin(table.metadata(&name))?;
        match table.layout.kind {
            TableKind::Terms => import_terms(&table, sink),
            TableKind::Frequency => import_frequencies(&table, sink),
        }
    }
}

/// Sends the entries once the whole table is read, because rows of one entry may lie apart.
/// A frequency column gives each entry's term and reading a frequency; the first row with one for them wins.
fn import_terms(table: &Table, sink: &mut dyn DictionarySink) -> Result<(), DictionaryError> {
    let mut merger = EntryMerger::default();
    let mut terms_with_frequency = HashSet::new();
    for row in table.rows() {
        let row = row?;
        let Some(entry) = row_entry(&row, &table.layout, table.directives.html) else {
            continue;
        };
        if let Some(meta) = entry_frequency(&row, &table.layout, &entry)
            && terms_with_frequency.insert((meta.term.clone(), meta.reading.clone()))
        {
            sink.term_meta(meta)?;
        }
        merger.add(entry);
    }
    for entry in merger.into_entries() {
        sink.term_entry(entry)?;
    }
    Ok(())
}

fn import_frequencies(table: &Table, sink: &mut dyn DictionarySink) -> Result<(), DictionaryError> {
    for row in table.rows() {
        if let Some(meta) = row_frequency(&row?, &table.layout) {
            sink.term_meta(meta)?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::super::term_meta::{Frequency, TermMeta, TermMetaData};
    use super::super::{Dictionary, DictionarySource, FrequencyMode, parse_dictionary};

    fn parse(text: &str) -> Dictionary {
        let mut source = DictionarySource::single("words.csv", text.as_bytes().to_vec()).unwrap();
        parse_dictionary(&mut source).unwrap()
    }

    const DEFINITIONS_WITH_COUNTS: &str =
        "word,reading,definition,count\n猫,ねこ,cat,1532\n猫,ねこ,pet,1532\n犬,いぬ,dog,987\n";

    fn count(term: &str, reading: &str, value: f64) -> TermMeta {
        TermMeta {
            term: term.to_string(),
            reading: Some(reading.to_string()),
            data: TermMetaData::Frequency(Frequency {
                value: Some(value),
                display: None,
            }),
        }
    }

    #[test]
    fn imports_a_frequency_column_of_a_definitions_table_once_for_each_term() {
        assert_eq!(
            parse(DEFINITIONS_WITH_COUNTS).term_meta,
            [count("猫", "ねこ", 1532.0), count("犬", "いぬ", 987.0)]
        );
    }

    #[test]
    fn still_imports_the_definitions_beside_a_frequency_column() {
        assert_eq!(parse(DEFINITIONS_WITH_COUNTS).entries.len(), 2);
    }

    #[test]
    fn records_the_mode_of_a_frequency_column_of_a_definitions_table() {
        assert_eq!(
            parse(DEFINITIONS_WITH_COUNTS).metadata.frequency_mode,
            Some(FrequencyMode::OccurrenceBased)
        );
    }
}

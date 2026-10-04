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

use super::error::DictionaryError;
use super::format::DictionaryFormat;
use super::metadata::DictionaryFormatKind;
use super::sink::DictionarySink;
use super::source::DictionarySource;
use directives::TableKind;
use encoding::decode_text;
use entries::row_entry;
use entry_merger::EntryMerger;
use frequency::row_frequency;
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
fn import_terms(table: &Table, sink: &mut dyn DictionarySink) -> Result<(), DictionaryError> {
    let mut merger = EntryMerger::default();
    for row in table.rows() {
        if let Some(entry) = row_entry(&row?, &table.layout, table.directives.html) {
            merger.add(entry);
        }
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

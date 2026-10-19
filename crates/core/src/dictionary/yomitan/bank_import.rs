//! Reading every bank of a dictionary into the sink.

use serde::de::DeserializeOwned;
use serde_json::Value;

use super::super::error::DictionaryError;
use super::super::sink::{DictionarySink, SinkResult};
use super::super::source::DictionarySource;
use super::bank::{bank_names, read_rows};
use super::error::YomitanError;
use super::kanji_bank::{kanji_entry, kanji_meta};
use super::row_layout::RowLayout;
use super::tag_bank::TagRow;
use super::term_bank::term_entry;
use super::term_meta_bank::term_meta;
use super::yomitan_import::YomitanImport;

/// How many rows of a bank pass between two reports of the import's progress.
const ROWS_PER_REPORT: usize = 1000;

const BANK_KINDS: [&str; 5] = [
    "tag_bank",
    "term_bank",
    "term_meta_bank",
    "kanji_bank",
    "kanji_meta_bank",
];

/// Lists the files of every bank, in the order they are imported.
pub fn all_bank_names(source: &DictionarySource) -> Vec<String> {
    BANK_KINDS
        .iter()
        .flat_map(|kind| bank_names(source, kind))
        .collect()
}

/// Sends the rows of every bank to the sink: tags first, then terms, term meta, kanji and kanji meta.
pub fn import_banks(import: &mut YomitanImport, layout: RowLayout) -> Result<(), DictionaryError> {
    import_bank(
        import,
        "tag_bank",
        |row: TagRow| Some(row.into()),
        |sink, tag| sink.tag(tag),
    )?;
    let term = |row: Vec<Value>| term_entry(&row, layout);
    import_bank(import, "term_bank", term, |sink, entry| {
        sink.term_entry(entry)
    })?;
    import_bank(import, "term_meta_bank", term_meta, |sink, meta| {
        sink.term_meta(meta)
    })?;
    let kanji = |row: Vec<Value>| kanji_entry(&row, layout);
    import_bank(import, "kanji_bank", kanji, |sink, entry| {
        sink.kanji_entry(entry)
    })?;
    import_bank(import, "kanji_meta_bank", kanji_meta, |sink, meta| {
        sink.kanji_meta(meta)
    })
}

/// Converts the rows of every bank of one kind and sends each result to the sink, reporting how far it has read as it goes.
/// A row that cannot be converted stops the import.
fn import_bank<Row: DeserializeOwned, Item>(
    import: &mut YomitanImport,
    kind: &str,
    convert: impl Fn(Row) -> Option<Item>,
    send: impl Fn(&mut dyn DictionarySink, Item) -> SinkResult,
) -> Result<(), DictionaryError> {
    for name in bank_names(import.source, kind) {
        read_rows(import.source, &name, |place, row| {
            let item = convert(row).ok_or_else(|| malformed_row(&name, place.index))?;
            send(&mut *import.sink, item)?;
            if place.index % ROWS_PER_REPORT == ROWS_PER_REPORT - 1 {
                import
                    .progress
                    .report_within_file(&mut *import.sink, place.bytes_read);
            }
            Ok(())
        })?;
        import.file_read(&name)?;
    }
    Ok(())
}

fn malformed_row(name: &str, row: usize) -> DictionaryError {
    YomitanError::MalformedRow {
        name: name.to_string(),
        row,
    }
    .into()
}

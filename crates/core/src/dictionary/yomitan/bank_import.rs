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

/// Sends the rows of every bank to the sink: tags first, then terms, term meta, kanji and kanji meta.
pub fn import_banks(
    source: &mut DictionarySource,
    sink: &mut dyn DictionarySink,
    layout: RowLayout,
) -> Result<(), DictionaryError> {
    import_bank(
        source,
        "tag_bank",
        |row: TagRow| Some(row.into()),
        |tag| sink.tag(tag),
    )?;
    let term = |row: Vec<Value>| term_entry(&row, layout);
    import_bank(source, "term_bank", term, |entry| sink.term_entry(entry))?;
    import_bank(source, "term_meta_bank", term_meta, |meta| {
        sink.term_meta(meta)
    })?;
    let kanji = |row: Vec<Value>| kanji_entry(&row, layout);
    import_bank(source, "kanji_bank", kanji, |entry| sink.kanji_entry(entry))?;
    import_bank(source, "kanji_meta_bank", kanji_meta, |meta| {
        sink.kanji_meta(meta)
    })
}

/// Converts the rows of every bank of one kind and sends each result to the sink.
/// A row that cannot be converted stops the import.
fn import_bank<Row: DeserializeOwned, Item>(
    source: &mut DictionarySource,
    kind: &str,
    convert: impl Fn(Row) -> Option<Item>,
    mut send: impl FnMut(Item) -> SinkResult,
) -> Result<(), DictionaryError> {
    for name in bank_names(source, kind) {
        read_rows(source, &name, |row_index, row| {
            let item = convert(row).ok_or_else(|| malformed_row(&name, row_index))?;
            Ok(send(item)?)
        })?;
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

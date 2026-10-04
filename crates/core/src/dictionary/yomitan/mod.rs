//! The Yomitan dictionary format: an `index.json` with the metadata, and banks of rows in JSON files
//! named `<kind>_N.json`, together with optional `styles.css` and media files.

mod bank;
mod bank_import;
mod error;
mod frequency;
mod glossary;
mod glossary_text;
mod index;
mod kanji_bank;
mod media;
mod row_fields;
mod row_layout;
mod tag_bank;
mod term_bank;
mod term_meta_bank;
#[cfg(test)]
mod test_source;

pub use error::YomitanError;

use super::error::DictionaryError;
use super::format::DictionaryFormat;
use super::metadata::DictionaryFormatKind;
use super::sink::DictionarySink;
use super::source::DictionarySource;
use bank::json_error;
use bank_import::import_banks;
use index::Index;
use media::import_media;
use row_layout::RowLayout;

pub struct YomitanFormat;

const INDEX: &str = "index.json";
const STYLESHEET: &str = "styles.css";

impl DictionaryFormat for YomitanFormat {
    fn kind(&self) -> DictionaryFormatKind {
        DictionaryFormatKind::Yomitan
    }

    fn matches(&self, source: &DictionarySource) -> bool {
        source.find(|name| name == INDEX).is_some()
    }

    fn import(
        &self,
        source: &mut DictionarySource,
        sink: &mut dyn DictionarySink,
    ) -> Result<(), DictionaryError> {
        let layout = import_index(source, sink)?;
        import_banks(source, sink, layout)?;
        import_media(source, sink)
    }
}

/// Sends the metadata to the sink, followed by any tag definitions in the index.
fn import_index(
    source: &mut DictionarySource,
    sink: &mut dyn DictionarySink,
) -> Result<RowLayout, DictionaryError> {
    let mut index = read_index(source)?;
    let layout = index.row_layout()?;
    let tags = index.take_tags();
    sink.begin(index.into_metadata(read_stylesheet(source)?))?;
    for tag in tags {
        sink.tag(tag)?;
    }
    Ok(layout)
}

fn read_index(source: &mut DictionarySource) -> Result<Index, DictionaryError> {
    let name = source
        .find(|name| name == INDEX)
        .ok_or_else(|| DictionaryError::MissingFile(INDEX.into()))?
        .to_string();
    serde_json::from_slice(&source.read(&name)?).map_err(|error| json_error(&name, error))
}

fn read_stylesheet(source: &mut DictionarySource) -> Result<Option<String>, DictionaryError> {
    let Some(name) = source.find(|name| name == STYLESHEET).map(String::from) else {
        return Ok(None);
    };
    Ok(Some(
        String::from_utf8_lossy(&source.read(&name)?).into_owned(),
    ))
}


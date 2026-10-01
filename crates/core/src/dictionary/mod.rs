//! Dictionary formats, import, and lookup.

mod dictionary_asset;
mod dictionary_entry;
mod error;
mod format;
mod glossary;
mod glossary_image;
mod structured_content;
mod structured_content_style;
mod yomitan;
mod yomitan_term_bank;

pub use dictionary_asset::DictionaryAsset;
pub use dictionary_entry::{DictionaryEntry, RawGlossary};
pub use error::DictionaryError;
pub use format::DictionaryFormat;
pub use glossary::{Deinflection, DetailedGlossary, Glossary, parse_glossary};
pub use glossary_image::{GlossaryImage, ImageAppearance, ImageRendering};
pub use structured_content::{
    ContainerElement, EmptyElement, ImageElement, LinkElement, SizeUnits, StructuredContent,
    StructuredContentData, StructuredContentElement, StyledElement, TableCellElement,
};
pub use structured_content_style::{
    CssLength, FontStyle, FontWeight, StructuredContentStyle, TextAlign, TextDecorationLine,
    TextDecorationLineKeyword, TextDecorationStyle, VerticalAlign, WordBreak,
};
pub use yomitan::YomitanFormat;

use std::io::Cursor;

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;
use zip::ZipArchive;

/// Parses a dictionary archive with the first registered format that recognizes it.
pub fn parse_dictionary(bytes: &[u8]) -> Result<Dictionary, DictionaryError> {
    let mut archive = ZipArchive::new(Cursor::new(bytes))?;
    registered_formats()
        .iter()
        .find(|format| format.matches(&mut archive))
        .ok_or(DictionaryError::UnrecognizedFormat)?
        .parse(&mut archive)
}

/// Returns the entries whose term or reading equals `term` exactly.
pub fn lookup(dictionary: &Dictionary, term: &str) -> Vec<TermEntry> {
    dictionary
        .entries
        .iter()
        .filter(|entry| entry.term == term || entry.reading.as_deref() == Some(term))
        .map(DictionaryEntry::to_term_entry)
        .collect()
}

fn registered_formats() -> Vec<Box<dyn DictionaryFormat>> {
    vec![Box::new(YomitanFormat)]
}

/// A parsed dictionary archive. It crosses only the WebAssembly boundary, not HTTP.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Dictionary {
    pub title: String,
    pub revision: Option<String>,
    /// The language of the headwords, as an ISO 639 code, when the dictionary states it.
    pub source_language: Option<String>,
    /// The language of the definitions, as an ISO 639 code, when the dictionary states it.
    pub target_language: Option<String>,
    pub entries: Vec<DictionaryEntry>,
    /// The archive's `styles.css`.
    /// It styles structured content through the `data-sc-*` attributes of its elements.
    pub stylesheet: Option<String>,
    /// The files that glossary items can refer to by path, such as images.
    pub assets: Vec<DictionaryAsset>,
}

/// A term entry as a lookup returns it.
/// Its glossary items are validated against the Yomitan schema.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct TermEntry {
    pub term: String,
    pub reading: Option<String>,
    pub definitions: Vec<Glossary>,
    pub tags: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::read_fixture_bytes;

    fn parse_fixture() -> Dictionary {
        parse_dictionary(&read_fixture_bytes("sample-yomitan.zip")).expect("fixture should parse")
    }

    #[test]
    fn parses_three_entries_from_the_yomitan_fixture() {
        assert_eq!(parse_fixture().entries.len(), 3);
    }

    #[test]
    fn finds_the_cat_entry_by_term() {
        let dictionary = parse_fixture();
        let definitions: Vec<Vec<Glossary>> = lookup(&dictionary, "猫")
            .into_iter()
            .map(|e| e.definitions)
            .collect();
        assert_eq!(definitions, vec![vec![Glossary::Text("cat".into())]]);
    }

    #[test]
    fn finds_the_cat_entry_by_reading() {
        let dictionary = parse_fixture();
        assert_eq!(lookup(&dictionary, "ねこ")[0].term, "猫");
    }

    #[test]
    fn finds_nothing_for_an_unknown_term() {
        assert!(lookup(&parse_fixture(), "鳥").is_empty());
    }

    #[test]
    fn rejects_bytes_that_are_not_a_zip_archive() {
        assert!(matches!(
            parse_dictionary(b"not a zip"),
            Err(DictionaryError::Archive(_))
        ));
    }

    #[test]
    fn rejects_an_archive_no_format_recognizes() {
        assert!(matches!(
            parse_dictionary(&read_fixture_bytes("sample.epub")),
            Err(DictionaryError::UnrecognizedFormat)
        ));
    }
}

//! Dictionary formats, import, and lookup.

mod error;
mod format;
mod yomitan;

pub use error::DictionaryError;
pub use format::DictionaryFormat;
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
pub fn lookup<'a>(dictionary: &'a Dictionary, term: &str) -> Vec<&'a TermEntry> {
    dictionary
        .entries
        .iter()
        .filter(|entry| entry.term == term || entry.reading.as_deref() == Some(term))
        .collect()
}

fn registered_formats() -> Vec<Box<dyn DictionaryFormat>> {
    vec![Box::new(YomitanFormat)]
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct Dictionary {
    pub title: String,
    pub revision: Option<String>,
    pub entries: Vec<TermEntry>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct TermEntry {
    pub term: String,
    pub reading: Option<String>,
    pub definitions: Vec<String>,
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
        let definitions: Vec<&Vec<String>> = lookup(&dictionary, "猫")
            .iter()
            .map(|e| &e.definitions)
            .collect();
        assert_eq!(definitions, vec![&vec!["cat".to_string()]]);
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

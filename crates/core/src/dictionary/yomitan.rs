use std::io::Cursor;

use serde::Deserialize;
use serde::de::DeserializeOwned;
use serde_json::Value;
use zip::ZipArchive;

use super::error::DictionaryError;
use super::format::DictionaryFormat;
use super::{Dictionary, TermEntry};

/// The Yomitan dictionary format, version 3: an `index.json` with the metadata and any
/// number of `term_bank_N.json` files holding term entries as JSON arrays.
pub struct YomitanFormat;

impl DictionaryFormat for YomitanFormat {
    fn name(&self) -> &'static str {
        "yomitan"
    }

    fn matches(&self, archive: &mut ZipArchive<Cursor<&[u8]>>) -> bool {
        archive.index_for_name("index.json").is_some()
    }

    fn parse(
        &self,
        archive: &mut ZipArchive<Cursor<&[u8]>>,
    ) -> Result<Dictionary, DictionaryError> {
        let index: Index = read_json(archive, "index.json")?;
        check_version(&index)?;
        let mut entries = Vec::new();
        for name in term_bank_names(archive) {
            entries.extend(read_term_bank(archive, &name)?);
        }
        Ok(Dictionary {
            title: index.title,
            revision: index.revision,
            source_language: index.source_language,
            target_language: index.target_language,
            entries,
        })
    }
}

#[derive(Deserialize)]
struct Index {
    title: String,
    revision: Option<String>,
    format: Option<u32>,
    /// Older dictionaries state the format version under this key instead of `format`.
    version: Option<u32>,
    #[serde(rename = "sourceLanguage")]
    source_language: Option<String>,
    #[serde(rename = "targetLanguage")]
    target_language: Option<String>,
}

const SUPPORTED_VERSION: u32 = 3;

fn check_version(index: &Index) -> Result<(), DictionaryError> {
    match index.format.or(index.version) {
        Some(SUPPORTED_VERSION) => Ok(()),
        other => Err(DictionaryError::UnsupportedVersion(other.unwrap_or(1))),
    }
}

/// Lists the term bank entries in numeric order, so `term_bank_2` comes before `term_bank_10`.
fn term_bank_names(archive: &ZipArchive<Cursor<&[u8]>>) -> Vec<String> {
    let mut names: Vec<String> = archive
        .file_names()
        .filter(|name| name.starts_with("term_bank_") && name.ends_with(".json"))
        .map(String::from)
        .collect();
    names.sort_by_key(|name| bank_number(name));
    names
}

fn bank_number(name: &str) -> u32 {
    name.trim_start_matches("term_bank_")
        .trim_end_matches(".json")
        .parse()
        .unwrap_or(0)
}

fn read_term_bank(
    archive: &mut ZipArchive<Cursor<&[u8]>>,
    name: &str,
) -> Result<Vec<TermEntry>, DictionaryError> {
    let rows: Vec<Vec<Value>> = read_json(archive, name)?;
    rows.iter()
        .map(|row| {
            parse_term_entry(row).ok_or_else(|| DictionaryError::MalformedTermEntry {
                name: name.to_string(),
            })
        })
        .collect()
}

fn read_json<T: DeserializeOwned>(
    archive: &mut ZipArchive<Cursor<&[u8]>>,
    name: &str,
) -> Result<T, DictionaryError> {
    let entry = archive.by_name(name)?;
    serde_json::from_reader(entry).map_err(|source| DictionaryError::Json {
        name: name.to_string(),
        source,
    })
}

/// Converts one term bank row of the form
/// `[expression, reading, definitionTags, rules, score, glossary, sequence, termTags]`.
/// Glossary entries that are not plain strings are skipped.
fn parse_term_entry(row: &[Value]) -> Option<TermEntry> {
    let term = row.first()?.as_str()?.to_string();
    let reading = row
        .get(1)
        .and_then(Value::as_str)
        .filter(|reading| !reading.is_empty());
    let glossary = row.get(5).and_then(Value::as_array);
    Some(TermEntry {
        term,
        reading: reading.map(String::from),
        definitions: glossary
            .map(|values| string_items(values))
            .unwrap_or_default(),
        tags: [split_tags(row.get(2)), split_tags(row.get(7))].concat(),
    })
}

fn string_items(values: &[Value]) -> Vec<String> {
    values
        .iter()
        .filter_map(Value::as_str)
        .map(String::from)
        .collect()
}

fn split_tags(value: Option<&Value>) -> Vec<String> {
    value
        .and_then(Value::as_str)
        .unwrap_or_default()
        .split_whitespace()
        .map(String::from)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::read_fixture_bytes;
    use serde_json::json;

    fn open_fixture() -> ZipArchive<Cursor<&'static [u8]>> {
        let bytes: &'static [u8] = read_fixture_bytes("sample-yomitan.zip").leak();
        ZipArchive::new(Cursor::new(bytes)).expect("fixture should be a zip archive")
    }

    fn parse_fixture(name: &str) -> Dictionary {
        let bytes = read_fixture_bytes(name);
        let mut archive = ZipArchive::new(Cursor::new(bytes.as_slice())).expect("a zip archive");
        YomitanFormat
            .parse(&mut archive)
            .expect("fixture should parse")
    }

    fn cat_row() -> Vec<Value> {
        json!(["猫", "ねこ", "n common", "", 1, ["cat", {"type": "image"}], 1, "P"])
            .as_array()
            .cloned()
            .unwrap()
    }

    #[test]
    fn matches_the_yomitan_fixture() {
        assert!(YomitanFormat.matches(&mut open_fixture()));
    }

    #[test]
    fn reads_the_title_of_the_yomitan_fixture() {
        assert_eq!(
            YomitanFormat.parse(&mut open_fixture()).unwrap().title,
            "Sample Dictionary"
        );
    }

    #[test]
    fn reads_the_revision_of_the_yomitan_fixture() {
        assert_eq!(
            YomitanFormat.parse(&mut open_fixture()).unwrap().revision,
            Some("2026-09-30".into())
        );
    }

    #[test]
    fn leaves_the_source_language_empty_when_the_index_omits_it() {
        assert_eq!(
            YomitanFormat
                .parse(&mut open_fixture())
                .unwrap()
                .source_language,
            None
        );
    }

    #[test]
    fn reads_the_source_language_from_the_index() {
        assert_eq!(
            parse_fixture("sample-yomitan-en.zip").source_language,
            Some("en".into())
        );
    }

    #[test]
    fn reads_the_target_language_from_the_index() {
        assert_eq!(
            parse_fixture("sample-yomitan-en.zip").target_language,
            Some("de".into())
        );
    }

    #[test]
    fn reads_the_first_entry_of_the_yomitan_fixture() {
        assert_eq!(
            YomitanFormat.parse(&mut open_fixture()).unwrap().entries[0],
            TermEntry {
                term: "猫".into(),
                reading: Some("ねこ".into()),
                definitions: vec!["cat".into()],
                tags: vec!["n".into()],
            }
        );
    }

    #[test]
    fn skips_glossary_entries_that_are_not_strings() {
        assert_eq!(
            parse_term_entry(&cat_row()).unwrap().definitions,
            vec!["cat"]
        );
    }

    #[test]
    fn combines_definition_tags_and_term_tags() {
        assert_eq!(
            parse_term_entry(&cat_row()).unwrap().tags,
            vec!["n", "common", "P"]
        );
    }

    #[test]
    fn treats_an_empty_reading_as_none() {
        let row = json!(["cat", "", "", "", 1, ["a cat"], 1, ""])
            .as_array()
            .cloned()
            .unwrap();
        assert_eq!(parse_term_entry(&row).unwrap().reading, None);
    }

    #[test]
    fn rejects_a_row_without_a_term() {
        assert_eq!(parse_term_entry(&[json!(1)]), None);
    }
}

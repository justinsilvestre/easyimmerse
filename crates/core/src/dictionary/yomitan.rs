use serde::Deserialize;
use serde::de::DeserializeOwned;
use serde_json::Value;
use thiserror::Error;

use super::error::DictionaryError;
use super::format::DictionaryFormat;
use super::metadata::{DictionaryFormatKind, DictionaryMetadata};
use super::sink::DictionarySink;
use super::source::{DictionarySource, file_name};
use super::term_entry::{Definition, TermEntry};

/// The Yomitan dictionary format, version 3: an `index.json` with the metadata and any
/// number of `term_bank_N.json` files holding term entries as JSON arrays.
pub struct YomitanFormat;

#[derive(Debug, Error)]
pub enum YomitanError {
    #[error("the file {name:?} is not valid JSON: {source}")]
    Json {
        name: String,
        source: serde_json::Error,
    },
    #[error("unsupported Yomitan dictionary format version {0}")]
    UnsupportedVersion(u32),
    #[error("the term bank {name:?} contains a malformed entry")]
    MalformedTermEntry { name: String },
}

impl DictionaryFormat for YomitanFormat {
    fn kind(&self) -> DictionaryFormatKind {
        DictionaryFormatKind::Yomitan
    }

    fn matches(&self, source: &DictionarySource) -> bool {
        source.find(|name| name == "index.json").is_some()
    }

    fn import(
        &self,
        source: &mut DictionarySource,
        sink: &mut dyn DictionarySink,
    ) -> Result<(), DictionaryError> {
        let index_name = source
            .find(|name| name == "index.json")
            .unwrap_or("index.json")
            .to_string();
        let index: Index = read_json(source, &index_name)?;
        check_version(&index)?;
        let mut metadata = DictionaryMetadata::new(index.title, DictionaryFormatKind::Yomitan);
        metadata.revision = index.revision;
        sink.begin(metadata)?;
        for name in term_bank_names(source) {
            for entry in read_term_bank(source, &name)? {
                sink.term_entry(entry)?;
            }
        }
        Ok(())
    }
}

#[derive(Deserialize)]
struct Index {
    title: String,
    revision: Option<String>,
    format: Option<u32>,
    /// Older dictionaries state the format version under this key instead of `format`.
    version: Option<u32>,
}

const SUPPORTED_VERSION: u32 = 3;

fn check_version(index: &Index) -> Result<(), YomitanError> {
    match index.format.or(index.version) {
        Some(SUPPORTED_VERSION) => Ok(()),
        other => Err(YomitanError::UnsupportedVersion(other.unwrap_or(1))),
    }
}

/// Lists the term bank entries in numeric order, so `term_bank_2` comes before `term_bank_10`.
fn term_bank_names(source: &DictionarySource) -> Vec<String> {
    let mut names: Vec<String> = source
        .names()
        .filter(|name| {
            let name = file_name(name);
            name.starts_with("term_bank_") && name.ends_with(".json")
        })
        .map(String::from)
        .collect();
    names.sort_by_key(|name| bank_number(name));
    names
}

fn bank_number(name: &str) -> u32 {
    file_name(name)
        .trim_start_matches("term_bank_")
        .trim_end_matches(".json")
        .parse()
        .unwrap_or(0)
}

fn read_term_bank(
    source: &mut DictionarySource,
    name: &str,
) -> Result<Vec<TermEntry>, DictionaryError> {
    let rows: Vec<Vec<Value>> = read_json(source, name)?;
    rows.iter()
        .map(|row| {
            parse_term_entry(row).ok_or_else(|| YomitanError::MalformedTermEntry {
                name: name.to_string(),
            })
        })
        .collect::<Result<_, _>>()
        .map_err(DictionaryError::from)
}

fn read_json<T: DeserializeOwned>(
    source: &mut DictionarySource,
    name: &str,
) -> Result<T, DictionaryError> {
    let bytes = source.read(name)?;
    serde_json::from_slice(&bytes).map_err(|error| {
        DictionaryError::from(YomitanError::Json {
            name: name.to_string(),
            source: error,
        })
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
    let mut entry = TermEntry::new(
        term,
        glossary
            .map(|values| string_items(values))
            .unwrap_or_default(),
    );
    entry.reading = reading.map(String::from);
    entry.definition_tags = split_tags(row.get(2));
    entry.term_tags = split_tags(row.get(7));
    Some(entry)
}

fn string_items(values: &[Value]) -> Vec<Definition> {
    values
        .iter()
        .filter_map(Value::as_str)
        .map(Definition::text)
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
    use crate::dictionary::parse_dictionary;
    use crate::test_support::read_fixture_bytes;
    use serde_json::json;

    fn fixture_source() -> DictionarySource {
        DictionarySource::single(
            "sample-yomitan.zip",
            read_fixture_bytes("sample-yomitan.zip"),
        )
        .unwrap()
    }

    fn cat_row() -> Vec<Value> {
        json!(["猫", "ねこ", "n common", "", 1, ["cat", {"type": "image"}], 1, "P"])
            .as_array()
            .cloned()
            .unwrap()
    }

    #[test]
    fn matches_the_yomitan_fixture() {
        assert!(YomitanFormat.matches(&fixture_source()));
    }

    #[test]
    fn reads_the_title_of_the_yomitan_fixture() {
        let dictionary = parse_dictionary(&mut fixture_source()).unwrap();
        assert_eq!(dictionary.metadata.title, "Sample Dictionary");
    }

    #[test]
    fn reads_three_entries_from_the_yomitan_fixture() {
        let dictionary = parse_dictionary(&mut fixture_source()).unwrap();
        assert_eq!(dictionary.entries.len(), 3);
    }

    #[test]
    fn skips_glossary_entries_that_are_not_strings() {
        assert_eq!(
            parse_term_entry(&cat_row()).unwrap().definitions,
            vec![Definition::text("cat")]
        );
    }

    #[test]
    fn reads_the_definition_tags() {
        assert_eq!(
            parse_term_entry(&cat_row()).unwrap().definition_tags,
            vec!["n", "common"]
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

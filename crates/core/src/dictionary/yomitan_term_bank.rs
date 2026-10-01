use serde::Deserialize;
use serde::de::IgnoredAny;

use super::error::DictionaryError;
use super::yomitan::{Archive, read_json};
use super::{DictionaryEntry, RawGlossary};

/// One row of a term bank:
/// `[term, reading, definitionTags, rules, score, glossary, sequence, termTags]`.
#[derive(Deserialize)]
struct TermRow(
    String,
    String,
    Option<String>,
    IgnoredAny,
    IgnoredAny,
    RawGlossary,
    IgnoredAny,
    Option<String>,
);

impl TermRow {
    fn into_entry(self) -> DictionaryEntry {
        let TermRow(term, reading, definition_tags, _, _, definitions, _, term_tags) = self;
        let mut tags = split_tags(definition_tags.as_deref());
        tags.extend(split_tags(term_tags.as_deref()));
        DictionaryEntry {
            term,
            reading: Some(reading).filter(|reading| !reading.is_empty()),
            definitions,
            tags,
        }
    }
}

fn split_tags(tags: Option<&str>) -> Vec<String> {
    tags.unwrap_or_default()
        .split_whitespace()
        .map(String::from)
        .collect()
}

/// Reads every term bank, in parallel where threads are available.
/// Returns the entries in bank order.
pub(super) fn read_term_banks(archive: &Archive) -> Result<Vec<DictionaryEntry>, DictionaryError> {
    let banks = map_in_parallel(&term_bank_names(archive), |name| {
        read_term_bank(&mut archive.clone(), name)
    })?;
    Ok(banks.into_iter().flatten().collect())
}

fn read_term_bank(
    archive: &mut Archive,
    name: &str,
) -> Result<Vec<DictionaryEntry>, DictionaryError> {
    let rows: Vec<TermRow> = read_json(archive, name)?;
    Ok(rows.into_iter().map(TermRow::into_entry).collect())
}

#[cfg(not(target_arch = "wasm32"))]
fn map_in_parallel<T, U, E>(
    items: &[T],
    operation: impl Fn(&T) -> Result<U, E> + Sync + Send,
) -> Result<Vec<U>, E>
where
    T: Sync,
    U: Send,
    E: Send,
{
    use rayon::prelude::*;
    items.par_iter().map(operation).collect()
}

#[cfg(target_arch = "wasm32")]
fn map_in_parallel<T, U, E>(
    items: &[T],
    operation: impl Fn(&T) -> Result<U, E>,
) -> Result<Vec<U>, E> {
    items.iter().map(operation).collect()
}

/// Lists the term bank entries in numeric order, so `term_bank_2` comes before `term_bank_10`.
fn term_bank_names(archive: &Archive) -> Vec<String> {
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

#[cfg(test)]
mod tests {
    use super::*;

    fn parse_row(json: &str) -> Result<DictionaryEntry, serde_json::Error> {
        serde_json::from_str::<TermRow>(json).map(TermRow::into_entry)
    }

    fn cat_row() -> DictionaryEntry {
        parse_row(r#"["猫","ねこ","n common","",1,["cat"],1,"P"]"#).unwrap()
    }

    #[test]
    fn keeps_the_glossary_json_as_the_dictionary_states_it() {
        assert_eq!(cat_row().definitions.get(), r#"["cat"]"#);
    }

    #[test]
    fn combines_definition_tags_and_term_tags() {
        assert_eq!(cat_row().tags, vec!["n", "common", "P"]);
    }

    #[test]
    fn accepts_null_definition_tags() {
        let entry = parse_row(r#"["猫","ねこ",null,"",1,["cat"],1,"P"]"#).unwrap();
        assert_eq!(entry.tags, vec!["P"]);
    }

    #[test]
    fn treats_an_empty_reading_as_none() {
        let entry = parse_row(r#"["cat","","","",1,["a cat"],1,""]"#).unwrap();
        assert_eq!(entry.reading, None);
    }

    #[test]
    fn rejects_a_row_with_too_few_columns() {
        assert!(parse_row(r#"["cat"]"#).is_err());
    }

    #[test]
    fn reads_the_number_of_a_term_bank_from_its_name() {
        assert_eq!(bank_number("term_bank_10.json"), 10);
    }
}

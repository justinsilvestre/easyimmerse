//! Proposing the words of a library item's segments from the manager's own dictionaries:
//! at each place of a segment's text, the longest text that a dictionary knows becomes a word,
//! and the first entry of the best result becomes its entry.

use std::collections::HashMap;

use easyimmerse_core::dictionary::Definition;
use easyimmerse_core::language_code::is_same_language;
use easyimmerse_core::library::{
    LibraryEntry, LibraryItemId, LibraryText, LibraryWord, validate_words,
};
use easyimmerse_core::lookup::LookupResult;
use easyimmerse_storage::{OwnerId, Storage, StorageError};
use serde_json::Value;

use crate::auth::error_body::ApiFailure;
use crate::auth::principal::Principal;
use crate::library_segments::strip_markup;
use crate::lookup::{BatchLookupResponse, TextLookups};
use crate::routes::dictionary_batch_lookup::{BatchLookupRequest, look_up_all};
use crate::state::AppState;

/// Which definition of a word's entry a dictionary's definitions go into.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum DefinitionField {
    /// In the language the learner knows.
    L1,
    /// In the language the learner is learning.
    L2,
}

/// Fills the segments of the item that have no words yet with the words the principal's dictionaries find,
/// and returns the item's text.
pub async fn propose_words(
    state: &AppState,
    principal: &Principal,
    item_id: LibraryItemId,
) -> Result<LibraryText, ApiFailure> {
    let owner = principal.owner_id();
    state
        .with_storage(move |storage| propose_stored_words(storage, &owner, &item_id))
        .await
}

fn propose_stored_words(
    storage: &Storage,
    owner: &OwnerId,
    item_id: &LibraryItemId,
) -> Result<LibraryText, StorageError> {
    let language =
        (storage.get_library_settings()?.language).ok_or(StorageError::LibraryLanguageUnset)?;
    let text = storage.get_library_text(item_id)?;
    let unworded: Vec<_> = (text.segments.iter())
        .filter(|segment| segment.words.is_empty())
        .collect();
    if unworded.is_empty() {
        return Ok(text);
    }
    let request = BatchLookupRequest {
        language: language.clone(),
        texts: unworded
            .iter()
            .map(|segment| segment.text.clone())
            .collect(),
    };
    let response = look_up_all(storage, owner, &request)?;
    let languages = dictionary_languages(storage, owner)?;
    let field_of = |dictionary_id: &str| {
        field_of_language(languages.get(dictionary_id).cloned().flatten(), &language)
    };
    for (segment, lookups) in unworded.iter().zip(&response.texts) {
        let words = proposed_words(&segment.text, lookups, &response, field_of);
        if !words.is_empty() && validate_words(&segment.text, &words).is_ok() {
            storage.set_segment_words(item_id, segment.index, &words)?;
        }
    }
    storage.get_library_text(item_id)
}

/// The language each of the owner's dictionaries defines its terms in, by dictionary id.
fn dictionary_languages(
    storage: &Storage,
    owner: &OwnerId,
) -> Result<HashMap<String, Option<String>>, StorageError> {
    Ok((storage.list_dictionaries(owner)?.into_iter())
        .map(|dictionary| (dictionary.id.0, dictionary.metadata.target_language))
        .collect())
}

/// Definitions in the library's language go into L2; all others, and those of a dictionary that states no language, into L1.
fn field_of_language(language: Option<String>, library_language: &str) -> DefinitionField {
    match language {
        Some(language) if is_same_language(&language, library_language) => DefinitionField::L2,
        _ => DefinitionField::L1,
    }
}

/// Walks the positions of the text in order and makes a word of the best result's matched text at each position
/// that no earlier word covers. Offsets of the lookups count characters; those of the words count UTF-16 code units.
fn proposed_words(
    text: &str,
    lookups: &TextLookups,
    response: &BatchLookupResponse,
    field_of: impl Fn(&str) -> DefinitionField,
) -> Vec<LibraryWord> {
    let utf16_offsets = utf16_offsets_of_characters(text);
    let mut words = Vec::new();
    let mut covered_until = 0;
    for position in &lookups.positions {
        let start = position.offset as usize;
        let best =
            (position.results.first()).and_then(|&index| response.results.get(index as usize));
        let Some(result) = best.filter(|_| start >= covered_until) else {
            continue;
        };
        let end = start + result.matched_text.chars().count();
        if end == start || end >= utf16_offsets.len() {
            continue;
        }
        words.push(LibraryWord {
            start: utf16_offsets[start],
            end: utf16_offsets[end],
            entry: entry_of(result, &field_of),
        });
        covered_until = end;
    }
    words
}

/// The UTF-16 offset at which each character begins, followed by the length of the text.
fn utf16_offsets_of_characters(text: &str) -> Vec<u32> {
    let mut offsets = vec![0];
    for character in text.chars() {
        let last = offsets.last().copied().unwrap_or(0);
        offsets.push(last + character.len_utf16() as u32);
    }
    offsets
}

/// The entry of a word: the result's term and reading, and the definitions of its first dictionary's entry.
fn entry_of(result: &LookupResult, field_of: impl Fn(&str) -> DefinitionField) -> LibraryEntry {
    let first = result.definitions.first();
    let definitions = first.map(|section| definitions_text(&section.entry.definitions));
    let field = first.map(|section| field_of(&section.dictionary_id));
    let definition_in = |wanted| match field == Some(wanted) {
        true => definitions.clone().unwrap_or_default(),
        false => String::new(),
    };
    LibraryEntry {
        term: result.term.clone(),
        reading: result.reading.clone(),
        l1_definition: definition_in(DefinitionField::L1),
        l2_definition: definition_in(DefinitionField::L2),
    }
}

/// The plain text of each definition, one per line.
fn definitions_text(definitions: &[Definition]) -> String {
    let texts: Vec<String> = definitions.iter().filter_map(definition_text).collect();
    texts.join("\n")
}

fn definition_text(definition: &Definition) -> Option<String> {
    let text = match definition {
        Definition::Text { text } => text.clone(),
        Definition::Html { html } => strip_markup(html),
        Definition::Markup { markup, .. } => strip_markup(markup),
        Definition::Structured { content } => {
            let mut text = String::new();
            collect_text(&serde_json::to_value(content).ok()?, &mut text);
            text
        }
        Definition::FormOf { .. } => return None,
    };
    let text = text.trim();
    (!text.is_empty()).then(|| text.to_string())
}

/// Gathers the text of structured content, leaving out ruby annotations and making line breaks newlines.
fn collect_text(node: &Value, text: &mut String) {
    match node {
        Value::String(node_text) => text.push_str(node_text),
        Value::Array(nodes) => nodes.iter().for_each(|node| collect_text(node, text)),
        Value::Object(fields) => match fields.get("tag").and_then(Value::as_str) {
            Some("br") => text.push('\n'),
            Some("rt" | "rp") => {}
            _ => {
                (fields.get("content").into_iter()).for_each(|content| collect_text(content, text))
            }
        },
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::dictionary::TermEntry;
    use easyimmerse_core::lookup::DictionaryDefinitions;

    use super::*;
    use crate::lookup::PositionLookups;

    fn result(matched_text: &str, term: &str, definition: &str) -> LookupResult {
        LookupResult {
            matched_text: matched_text.to_string(),
            term: term.to_string(),
            reading: None,
            inflection_chains: Vec::new(),
            definitions: vec![DictionaryDefinitions {
                dictionary_id: "d".to_string(),
                dictionary_title: "Dictionary".to_string(),
                entry: TermEntry::new(term, vec![Definition::text(definition)]),
                tags: Vec::new(),
            }],
            frequencies: Vec::new(),
            pronunciations: Vec::new(),
            separated_verb: None,
        }
    }

    fn position(offset: u32, results: &[u32]) -> PositionLookups {
        PositionLookups {
            offset,
            results: results.to_vec(),
            kanji: Vec::new(),
        }
    }

    /// The lookups of "New York is big": "New York" and "New" at 0, "York" at 4, "is" at 9, "big" at 12.
    fn response() -> BatchLookupResponse {
        BatchLookupResponse {
            texts: vec![TextLookups {
                positions: vec![
                    position(0, &[0, 1]),
                    position(4, &[2]),
                    position(9, &[3]),
                    position(12, &[4]),
                ],
            }],
            results: vec![
                result("New York", "New York", "a city"),
                result("New", "new", "not old"),
                result("York", "York", "a town"),
                result("is", "be", "to exist"),
                result("big", "big", "large"),
            ],
            kanji: Vec::new(),
            stylesheets: Vec::new(),
        }
    }

    fn words_of(text: &str, response: &BatchLookupResponse) -> Vec<LibraryWord> {
        proposed_words(text, &response.texts[0], response, |_| DefinitionField::L1)
    }

    fn spans(words: &[LibraryWord]) -> Vec<(u32, u32)> {
        words.iter().map(|word| (word.start, word.end)).collect()
    }

    #[test]
    fn takes_the_longest_match_and_skips_the_positions_it_covers() {
        let words = words_of("New York is big", &response());
        assert_eq!(spans(&words), [(0, 8), (9, 11), (12, 15)]);
    }

    #[test]
    fn gives_each_word_the_entry_of_its_best_result() {
        let words = words_of("New York is big", &response());
        assert_eq!(
            words[1].entry,
            LibraryEntry {
                term: "be".to_string(),
                reading: None,
                l1_definition: "to exist".to_string(),
                l2_definition: String::new(),
            }
        );
    }

    #[test]
    fn puts_definitions_in_the_librarys_language_into_l2() {
        let response = response();
        let words = proposed_words("New York is big", &response.texts[0], &response, |_| {
            DefinitionField::L2
        });
        assert_eq!(words[0].entry.l2_definition, "a city");
    }

    #[test]
    fn counts_word_offsets_in_utf16_code_units() {
        let response = BatchLookupResponse {
            texts: vec![TextLookups {
                positions: vec![position(1, &[0])],
            }],
            results: vec![result("猫", "猫", "cat")],
            kanji: Vec::new(),
            stylesheets: Vec::new(),
        };
        assert_eq!(spans(&words_of("𝄞猫", &response)), [(2, 3)]);
    }

    #[test]
    fn reads_a_dictionary_in_the_librarys_language_as_l2() {
        assert_eq!(
            field_of_language(Some("de-DE".to_string()), "de"),
            DefinitionField::L2
        );
    }

    #[test]
    fn reads_a_dictionary_without_a_language_as_l1() {
        assert_eq!(field_of_language(None, "de"), DefinitionField::L1);
    }

    #[test]
    fn leaves_ruby_annotations_out_of_structured_definitions() {
        let mut text = String::new();
        let content = serde_json::json!([
            { "tag": "ruby", "content": ["猫", { "tag": "rt", "content": "ねこ" }] },
            "cat"
        ]);
        collect_text(&content, &mut text);
        assert_eq!(text, "猫cat");
    }
}

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::dictionary::{Frequency, KanjiEntry, TagDefinition, TermEntry, TermMetaData};

/// The entries of every dictionary for one term and reading that the looked-up text may stand for.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct LookupResult {
    /// The beginning of the looked-up text that this result covers.
    pub matched_text: String,
    pub term: String,
    pub reading: Option<String>,
    /// The equally good chains of inflections that lead from the term to the matched text, the most plausible first.
    /// Each chain names its inflections outermost first. The list is empty when no inflection was undone.
    pub inflection_chains: Vec<Vec<String>>,
    pub definitions: Vec<DictionaryDefinitions>,
    pub frequencies: Vec<DictionaryFrequency>,
    pub pronunciations: Vec<DictionaryPronunciation>,
}

/// One dictionary's entry for a result, with the meaning of each tag it uses.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DictionaryDefinitions {
    pub dictionary_id: String,
    pub dictionary_title: String,
    pub entry: TermEntry,
    pub tags: Vec<TagDefinition>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DictionaryFrequency {
    pub dictionary_id: String,
    pub dictionary_title: String,
    pub reading: Option<String>,
    pub frequency: Frequency,
}

/// A pitch accent or IPA transcription from one dictionary.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DictionaryPronunciation {
    pub dictionary_id: String,
    pub dictionary_title: String,
    pub reading: Option<String>,
    pub data: TermMetaData,
}

/// One dictionary's entry for a single kanji character.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct KanjiResult {
    pub dictionary_id: String,
    pub dictionary_title: String,
    pub entry: KanjiEntry,
    pub tags: Vec<TagDefinition>,
    pub frequencies: Vec<DictionaryFrequency>,
}

/// The CSS that a dictionary ships for its own entries, unsanitized.
/// Displays must sanitize it and confine it to that dictionary's entries before applying it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DictionaryStylesheet {
    pub dictionary_id: String,
    pub css: String,
}

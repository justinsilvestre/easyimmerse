//! Undoing inflection, to find the dictionary forms that an inflected word may have come from.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

/// A dictionary form that some text may be an inflection of.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Deinflection {
    /// The candidate dictionary form.
    pub term: String,
    /// The word classes, such as `v1` or `adj-i`, of which the dictionary form must have one.
    /// Empty when no inflection was undone.
    pub word_classes: Vec<String>,
    /// The names of the inflections undone, outermost first, such as `past` then `negative`.
    pub inflections: Vec<String>,
}

impl Deinflection {
    /// The text itself, taken as a dictionary form with no inflection undone.
    pub fn unchanged(text: &str) -> Self {
        Self {
            term: text.to_string(),
            word_classes: Vec::new(),
            inflections: Vec::new(),
        }
    }
}

/// Lists the dictionary forms that `text` may be an inflection of in the language with the given BCP 47 tag.
/// The first item is always the text itself, unchanged.
pub fn deinflect(_language: &str, text: &str) -> Vec<Deinflection> {
    vec![Deinflection::unchanged(text)]
}

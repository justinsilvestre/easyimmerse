//! Undoing inflection, to find the dictionary forms that an inflected word may have come from.

pub mod german;
mod japanese;

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
pub fn deinflect(language: &str, text: &str) -> Vec<Deinflection> {
    match primary_subtag(language).as_str() {
        "ja" => japanese::deinflect(text),
        "de" => german::deinflect(text),
        _ => vec![Deinflection::unchanged(text)],
    }
}

/// Whether lookup should rank `deinflection` below other readings that match as much text through as many inflections,
/// because the rule behind it fits almost any word. Only German produces such readings: the imperative singular.
pub fn is_fallback(deinflection: &Deinflection) -> bool {
    german::is_fallback(deinflection)
}

/// Whether dictionaries leave entries of `word_class` without any word class, as German Yomitan dictionaries do
/// for adverbs and determiners. A deinflected candidate of such a class may then match an entry without classes.
pub fn is_unmarked_word_class(word_class: &str) -> bool {
    matches!(word_class, "adv" | "det")
}

fn primary_subtag(language: &str) -> String {
    let primary = language.split(['-', '_']).next().unwrap_or_default();
    primary.to_ascii_lowercase()
}

#[cfg(test)]
mod tests {
    use super::{Deinflection, deinflect};

    #[test]
    fn deinflect_returns_only_the_unchanged_text_for_other_languages() {
        assert_eq!(
            deinflect("en", "walked"),
            [Deinflection::unchanged("walked")]
        );
    }

    #[test]
    fn deinflect_puts_the_unchanged_text_first_for_japanese() {
        assert_eq!(
            deinflect("ja", "食べた")[0],
            Deinflection::unchanged("食べた")
        );
    }

    #[test]
    fn deinflect_puts_the_unchanged_text_first_for_german() {
        assert_eq!(
            deinflect("de", "Häusern")[0],
            Deinflection::unchanged("Häusern")
        );
    }

    #[test]
    fn deinflect_uses_the_german_rules_for_a_regional_tag() {
        assert!(
            deinflect("de-CH", "ging")
                .iter()
                .any(|candidate| candidate.term == "gehen")
        );
    }

    #[test]
    fn deinflect_uses_the_japanese_rules_for_a_regional_tag() {
        assert!(deinflect("ja-JP", "食べた").len() > 1);
    }
}

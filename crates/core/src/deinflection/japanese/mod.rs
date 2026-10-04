//! A rule-based deinflector for Japanese verbs and i-adjectives.
//!
//! Each rule replaces an inflected kana ending with a base ending. Rules chain, so that
//! 食べさせられなかった is traced back through 食べさせられない, 食べさせられる and 食べさせる to 食べる.
//! The rule groups and the sources they are drawn from are listed in `docs/japanese-deinflection-sources.md`.

mod rule;
mod rules;
mod search;
mod word_class;

use super::Deinflection;

/// Lists the dictionary forms that the Japanese `text` may be an inflection of,
/// starting with the text itself, unchanged.
pub fn deinflect(text: &str) -> Vec<Deinflection> {
    search::search(text, rules::ALL)
}

#[cfg(test)]
pub(super) mod test_support {
    /// Whether deinflecting `text` yields `term` in `word_class` through exactly `inflections`.
    pub fn yields(text: &str, term: &str, word_class: &str, inflections: &[&str]) -> bool {
        super::deinflect(text).iter().any(|candidate| {
            candidate.term == term
                && candidate
                    .word_classes
                    .iter()
                    .any(|class| class == word_class)
                && candidate.inflections == inflections
        })
    }
}

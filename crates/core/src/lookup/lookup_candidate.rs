use std::cmp::Ordering;

use super::word_boundary::is_word_boundary;
use crate::deinflection::{Deinflection, deinflect, is_fallback};

/// The most characters of the looked-up text that lookup considers.
const MAX_MATCHED_CHARACTERS: usize = 20;

/// The names that the Japanese deinflector gives a bare stem taken as a word: a verb's continuative and an adjective's stem.
const BARE_STEM_INFLECTIONS: [&str; 2] = ["continuative", "stem"];

/// A dictionary form that the beginning of the looked-up text may stand for.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LookupCandidate {
    /// The beginning of the looked-up text that the candidate covers.
    pub matched_text: String,
    pub deinflection: Deinflection,
}

impl LookupCandidate {
    pub fn is_inflected(&self) -> bool {
        !self.deinflection.inflections.is_empty()
    }

    pub fn matched_length(&self) -> usize {
        self.matched_text.chars().count()
    }

    pub fn inflection_count(&self) -> usize {
        self.deinflection.inflections.len()
    }

    /// Whether the only inflection undone is the step from a bare stem to its dictionary form,
    /// as from the continuative 書き to 書く or the adjective stem 高 to 高い.
    pub fn undoes_only_a_bare_stem(&self) -> bool {
        matches!(
            self.deinflection.inflections.as_slice(),
            [only] if BARE_STEM_INFLECTIONS.contains(&only.as_str())
        )
    }

    /// Whether the candidate comes from a rule that fits almost any word, and so ranks below its equals.
    pub fn is_fallback(&self) -> bool {
        is_fallback(&self.deinflection)
    }

    /// Orders candidates from the most to the least preferred:
    /// longer matched text first, then fewer inflections, then candidates that are not fallbacks.
    pub fn preference(&self, other: &Self) -> Ordering {
        other
            .matched_length()
            .cmp(&self.matched_length())
            .then_with(|| self.inflection_count().cmp(&other.inflection_count()))
            .then_with(|| self.is_fallback().cmp(&other.is_fallback()))
    }
}

/// Lists the dictionary forms that the beginning of `text` may stand for, longest match first.
///
/// Each prefix of `text` is deinflected for the language with the given BCP 47 tag.
/// Lookup considers at most 20 characters, and stops at the first space or punctuation mark.
pub fn lookup_candidates(text: &str, language: &str) -> Vec<LookupCandidate> {
    let mut candidates: Vec<LookupCandidate> = Vec::new();
    for prefix in prefixes(text) {
        for deinflection in deinflect(language, prefix) {
            if !candidates
                .iter()
                .any(|known| known.deinflection == deinflection)
            {
                candidates.push(LookupCandidate {
                    matched_text: prefix.to_string(),
                    deinflection,
                });
            }
        }
    }
    candidates
}

/// Lists the distinct headwords that storage must search for to find every candidate.
pub fn candidate_headwords(candidates: &[LookupCandidate]) -> Vec<String> {
    let mut headwords: Vec<String> = Vec::new();
    for candidate in candidates {
        if !headwords.contains(&candidate.deinflection.term) {
            headwords.push(candidate.deinflection.term.clone());
        }
    }
    headwords
}

fn prefixes(text: &str) -> Vec<&str> {
    let ends: Vec<usize> = text
        .char_indices()
        .take_while(|(_, character)| !is_word_boundary(*character))
        .take(MAX_MATCHED_CHARACTERS)
        .map(|(start, character)| start + character.len_utf8())
        .collect();
    ends.into_iter().rev().map(|end| &text[..end]).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The distinct matched texts of the candidates, in order.
    fn matched_texts(text: &str) -> Vec<String> {
        let mut texts: Vec<String> = lookup_candidates(text, "ja")
            .into_iter()
            .map(|candidate| candidate.matched_text)
            .collect();
        texts.dedup();
        texts
    }

    fn candidate(matched_text: &str, inflections: &[&str]) -> LookupCandidate {
        LookupCandidate {
            matched_text: matched_text.to_string(),
            deinflection: Deinflection {
                term: matched_text.to_string(),
                word_classes: Vec::new(),
                inflections: inflections.iter().map(|name| name.to_string()).collect(),
            },
        }
    }

    #[test]
    fn lists_every_prefix_longest_first() {
        assert_eq!(matched_texts("猫が"), vec!["猫が", "猫"]);
    }

    #[test]
    fn stops_at_whitespace() {
        assert_eq!(matched_texts("ab cd"), vec!["ab", "a"]);
    }

    #[test]
    fn stops_at_punctuation() {
        assert_eq!(matched_texts("猫。犬"), vec!["猫"]);
    }

    #[test]
    fn considers_at_most_twenty_characters() {
        assert_eq!(matched_texts(&"あ".repeat(30)).len(), 20);
    }

    #[test]
    fn finds_nothing_in_text_that_starts_with_punctuation() {
        assert!(lookup_candidates("。猫", "ja").is_empty());
    }

    #[test]
    fn passes_each_prefix_through_deinflection() {
        let candidates = lookup_candidates("猫", "ja");
        assert_eq!(candidates[0].deinflection, Deinflection::unchanged("猫"));
    }

    #[test]
    fn lists_each_headword_once() {
        let candidates = vec![candidate("ab", &[]), candidate("ab", &["past"])];
        assert_eq!(candidate_headwords(&candidates), vec!["ab"]);
    }

    #[test]
    fn counts_a_bare_continuative_as_a_bare_stem() {
        assert!(candidate("書き", &["continuative"]).undoes_only_a_bare_stem());
    }

    #[test]
    fn does_not_count_a_stem_under_other_inflections_as_a_bare_stem() {
        assert!(!candidate("書かせ", &["continuative", "causative"]).undoes_only_a_bare_stem());
    }

    #[test]
    fn does_not_count_an_unchanged_word_as_a_bare_stem() {
        assert!(!candidate("書き", &[]).undoes_only_a_bare_stem());
    }

    #[test]
    fn prefers_a_longer_match() {
        let ordering = candidate("abc", &["past"]).preference(&candidate("ab", &[]));
        assert_eq!(ordering, Ordering::Less);
    }

    #[test]
    fn prefers_a_reading_that_is_not_a_fallback() {
        let ordering =
            candidate("ab", &["imperative sg"]).preference(&candidate("ab", &["plural"]));
        assert_eq!(ordering, Ordering::Greater);
    }

    #[test]
    fn prefers_fewer_inflections_for_matches_of_equal_length() {
        let ordering = candidate("ab", &["past"]).preference(&candidate("ab", &[]));
        assert_eq!(ordering, Ordering::Greater);
    }
}

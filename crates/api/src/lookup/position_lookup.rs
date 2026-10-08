use easyimmerse_core::lookup::{
    LookupCandidate, candidate_headwords, fold_case, is_kanji, lookup_candidates, lookup_positions,
    separated_verb_candidates,
};

use super::distinct::distinct;

/// A lookup of the beginning of a text: what the text may begin with, and its first character when that is a kanji.
pub struct PositionLookup {
    pub(super) candidates: Vec<LookupCandidate>,
    pub(super) folded_headwords: Vec<String>,
    pub(super) kanji: Option<String>,
}

impl PositionLookup {
    /// Prepares a lookup of the beginning of `text`.
    /// The text around it, with the position of the looked-up character in that text,
    /// lets lookup find a particle verb whose parts stand apart.
    pub fn new(text: &str, language: &str, context: Option<(&str, usize)>) -> Self {
        let mut candidates = lookup_candidates(text, language);
        if let Some((context, offset)) = context {
            candidates.extend(separated_verb_candidates(context, offset, language));
        }
        let headwords = candidate_headwords(&candidates);
        Self {
            folded_headwords: distinct(headwords.iter().map(|headword| fold_case(headword))),
            kanji: (text.chars().next())
                .filter(|first| is_kanji(*first))
                .map(String::from),
            candidates,
        }
    }

    /// Prepares a lookup at every position of the text where a word may start, paired with that position.
    pub fn at_every_position(text: &str, language: &str) -> Vec<(usize, Self)> {
        let starts: Vec<usize> = text.char_indices().map(|(start, _)| start).collect();
        (lookup_positions(text).into_iter())
            .map(|offset| {
                let rest = &text[starts[offset]..];
                (offset, Self::new(rest, language, Some((text, offset))))
            })
            .collect()
    }
}

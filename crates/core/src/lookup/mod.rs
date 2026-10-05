//! Finding dictionary entries for the text under the pointer.
//!
//! Lookup runs in three steps. `lookup_candidates` lists the dictionary forms that the text may begin with.
//! Storage finds the entries stored under those forms, and the frequencies and pronunciations of their terms.
//! `build_lookup_results` then keeps the entries that fit a candidate, groups them by term and reading, and ranks the groups.

mod build_lookup_results;
mod entry_matching;
mod fold_case;
mod found_rows;
#[cfg(test)]
mod japanese_splits;
mod kanji_results;
mod lookup_candidate;
mod lookup_result;
mod result_group;
mod result_sort_key;
mod separated_verb;
mod term_meta_matching;
mod word_boundary;

pub use build_lookup_results::build_lookup_results;
pub use fold_case::fold_case;
pub use found_rows::{DictionaryOrigin, FoundEntry, FoundKanji, FoundKanjiMeta, FoundTermMeta};
pub use kanji_results::{build_kanji_results, is_kanji};
pub use lookup_candidate::{LookupCandidate, candidate_headwords, lookup_candidates};
pub use lookup_result::{
    DictionaryDefinitions, DictionaryFrequency, DictionaryPronunciation, DictionaryStylesheet,
    KanjiResult, LookupResult,
};
pub use separated_verb::{ContextWord, SeparatedVerb};
#[cfg(test)]
mod german_lookup_tests;

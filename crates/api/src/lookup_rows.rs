//! Dictionary lookups at one or many positions, sharing one set of storage queries.
//!
//! The single and the batch lookup routes both build their results here, so that they always agree.

use std::collections::{HashMap, HashSet};
use std::hash::Hash;

use easyimmerse_core::lookup::{
    FoundEntry, FoundKanji, FoundKanjiMeta, FoundTermMeta, KanjiResult, LookupCandidate,
    LookupResult, build_kanji_results, build_lookup_results, candidate_headwords, fold_case,
    is_kanji, lookup_candidates, separated_verb_candidates,
};
use easyimmerse_storage::{Storage, StorageError};

/// A lookup of the beginning of a text: what the text may begin with, and its first character when that is a kanji.
pub struct PositionLookup {
    candidates: Vec<LookupCandidate>,
    folded_headwords: Vec<String>,
    kanji: Option<String>,
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
            kanji: text
                .chars()
                .next()
                .filter(|first| is_kanji(*first))
                .map(String::from),
            candidates,
        }
    }
}

/// What storage holds for a set of lookups, indexed so that each lookup finds its own rows quickly.
pub struct LookupRows {
    entries: Vec<FoundEntry>,
    entry_indices_by_headword: HashMap<String, Vec<usize>>,
    term_meta_by_term: HashMap<String, Vec<FoundTermMeta>>,
    kanji_by_character: HashMap<String, Vec<FoundKanji>>,
    kanji_meta_by_character: HashMap<String, Vec<FoundKanjiMeta>>,
}

impl LookupRows {
    /// Finds the rows for every lookup at once, running each kind of query once.
    pub fn find(storage: &Storage, lookups: &[&PositionLookup]) -> Result<Self, StorageError> {
        let headwords = distinct(
            lookups
                .iter()
                .flat_map(|lookup| lookup.folded_headwords.clone()),
        );
        let entries = storage.find_dictionary_entries(&headwords)?;
        let terms = distinct(entries.iter().map(|found| found.entry.term.clone()));
        let characters = distinct(lookups.iter().filter_map(|lookup| lookup.kanji.clone()));
        Ok(Self {
            entry_indices_by_headword: group_by(0..entries.len(), |&index| {
                entries[index].folded_headword.clone()
            }),
            entries,
            term_meta_by_term: group_by(storage.find_term_meta(&terms)?, |found| {
                found.meta.term.clone()
            }),
            kanji_by_character: group_by(storage.find_kanji(&characters)?, |found| {
                found.entry.character.clone()
            }),
            kanji_meta_by_character: group_by(storage.find_kanji_meta(&characters)?, |found| {
                found.meta.character.clone()
            }),
        })
    }

    /// Builds the term results of one lookup from its own rows, as if storage had been queried for it alone.
    pub fn results(&self, lookup: &PositionLookup) -> Vec<LookupResult> {
        let mut indices: Vec<usize> = (lookup.folded_headwords.iter())
            .filter_map(|headword| self.entry_indices_by_headword.get(headword))
            .flatten()
            .copied()
            .collect();
        indices.sort_unstable();
        let entries: Vec<FoundEntry> = indices
            .into_iter()
            .map(|index| self.entries[index].clone())
            .collect();
        let term_meta = self.term_meta_of(&entries);
        build_lookup_results(&lookup.candidates, entries, &term_meta)
    }

    /// Builds the kanji results of one lookup.
    pub fn kanji(&self, lookup: &PositionLookup) -> Vec<KanjiResult> {
        let Some(character) = &lookup.kanji else {
            return Vec::new();
        };
        let found_kanji = self
            .kanji_by_character
            .get(character)
            .cloned()
            .unwrap_or_default();
        let kanji_meta = self
            .kanji_meta_by_character
            .get(character)
            .map(Vec::as_slice);
        build_kanji_results(found_kanji, kanji_meta.unwrap_or_default())
    }

    fn term_meta_of(&self, entries: &[FoundEntry]) -> Vec<FoundTermMeta> {
        distinct(entries.iter().map(|found| found.entry.term.clone()))
            .iter()
            .filter_map(|term| self.term_meta_by_term.get(term))
            .flatten()
            .cloned()
            .collect()
    }
}

/// Lists the dictionaries whose definitions appear in the results, each once, in sorted order.
pub fn defining_dictionary_ids<'a>(
    results: impl IntoIterator<Item = &'a LookupResult>,
) -> Vec<String> {
    let mut ids: Vec<String> = results
        .into_iter()
        .flat_map(|result| &result.definitions)
        .map(|definitions| definitions.dictionary_id.clone())
        .collect();
    ids.sort();
    ids.dedup();
    ids
}

/// Keeps the first of each equal value, in order.
fn distinct<T: Clone + Eq + Hash>(values: impl IntoIterator<Item = T>) -> Vec<T> {
    let mut seen = HashSet::new();
    values
        .into_iter()
        .filter(|value| seen.insert(value.clone()))
        .collect()
}

/// Groups the values by key, keeping their order within each group.
fn group_by<T, K: Eq + Hash>(
    values: impl IntoIterator<Item = T>,
    key: impl Fn(&T) -> K,
) -> HashMap<K, Vec<T>> {
    let mut groups: HashMap<K, Vec<T>> = HashMap::new();
    for value in values {
        groups.entry(key(&value)).or_default().push(value);
    }
    groups
}

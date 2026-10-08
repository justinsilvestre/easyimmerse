use std::collections::HashMap;

use easyimmerse_core::lookup::{FoundEntry, FoundTermMeta, LookupResult, build_lookup_results};
use easyimmerse_storage::{Storage, StorageError};

use super::distinct::distinct;
use super::group_by::group_by;
use super::position_lookup::PositionLookup;

/// The term entries, frequencies, and pronunciations that storage holds for a set of lookups.
pub struct TermRows {
    entries: Vec<FoundEntry>,
    entry_indices_by_headword: HashMap<String, Vec<usize>>,
    term_meta_by_term: HashMap<String, Vec<FoundTermMeta>>,
}

impl TermRows {
    pub fn find(storage: &Storage, lookups: &[&PositionLookup]) -> Result<Self, StorageError> {
        let headwords = distinct(
            lookups
                .iter()
                .copied()
                .flat_map(|lookup| &lookup.folded_headwords),
        );
        let headwords: Vec<String> = headwords.into_iter().cloned().collect();
        let entries = storage.find_dictionary_entries(&headwords)?;
        let terms = distinct(entries.iter().map(|found| found.entry.term.clone()));
        let term_meta = storage.find_term_meta(&terms)?;
        Ok(Self {
            entry_indices_by_headword: group_by(0..entries.len(), |&index| {
                entries[index].folded_headword.clone()
            }),
            entries,
            term_meta_by_term: group_by(term_meta, |found| found.meta.term.clone()),
        })
    }

    /// Builds the term results of one lookup from its own rows, as if storage had been queried for it alone.
    pub fn results(&self, lookup: &PositionLookup) -> Vec<LookupResult> {
        let entries = self.entries_of(lookup);
        let term_meta = self.term_meta_of(&entries);
        build_lookup_results(&lookup.candidates, entries, &term_meta)
    }

    /// Lists the entries stored under the lookup's headwords, in the order storage found them.
    fn entries_of(&self, lookup: &PositionLookup) -> Vec<FoundEntry> {
        let mut indices: Vec<usize> = (lookup.folded_headwords.iter())
            .filter_map(|headword| self.entry_indices_by_headword.get(headword))
            .flatten()
            .copied()
            .collect();
        indices.sort_unstable();
        (indices.into_iter())
            .map(|index| self.entries[index].clone())
            .collect()
    }

    fn term_meta_of(&self, entries: &[FoundEntry]) -> Vec<FoundTermMeta> {
        distinct(entries.iter().map(|found| &found.entry.term))
            .into_iter()
            .filter_map(|term| self.term_meta_by_term.get(term))
            .flatten()
            .cloned()
            .collect()
    }
}

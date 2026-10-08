use easyimmerse_core::lookup::{KanjiResult, LookupResult};
use easyimmerse_storage::{Storage, StorageError};

use super::kanji_rows::KanjiRows;
use super::position_lookup::PositionLookup;
use super::term_rows::TermRows;

/// What storage holds for a set of lookups, indexed so that each lookup finds its own rows quickly.
pub struct LookupRows {
    terms: TermRows,
    kanji: KanjiRows,
}

impl LookupRows {
    /// Finds the rows for every lookup at once, running each kind of query once.
    pub fn find(storage: &Storage, lookups: &[&PositionLookup]) -> Result<Self, StorageError> {
        Ok(Self {
            terms: TermRows::find(storage, lookups)?,
            kanji: KanjiRows::find(storage, lookups)?,
        })
    }

    /// Builds the term results of one lookup, as if storage had been queried for it alone.
    pub fn results(&self, lookup: &PositionLookup) -> Vec<LookupResult> {
        self.terms.results(lookup)
    }

    /// Builds the kanji results of one lookup.
    pub fn kanji(&self, lookup: &PositionLookup) -> Vec<KanjiResult> {
        self.kanji.results(lookup)
    }
}

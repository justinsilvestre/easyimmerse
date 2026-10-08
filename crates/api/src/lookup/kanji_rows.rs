use std::collections::HashMap;

use easyimmerse_core::lookup::{FoundKanji, FoundKanjiMeta, KanjiResult, build_kanji_results};
use easyimmerse_storage::{Storage, StorageError};

use super::distinct::distinct;
use super::group_by::group_by;
use super::position_lookup::PositionLookup;

/// The kanji entries and frequencies that storage holds for a set of lookups, by character.
pub struct KanjiRows {
    kanji_by_character: HashMap<String, Vec<FoundKanji>>,
    kanji_meta_by_character: HashMap<String, Vec<FoundKanjiMeta>>,
}

impl KanjiRows {
    pub fn find(storage: &Storage, lookups: &[&PositionLookup]) -> Result<Self, StorageError> {
        let characters = distinct(lookups.iter().filter_map(|lookup| lookup.kanji.clone()));
        Ok(Self {
            kanji_by_character: group_by(storage.find_kanji(&characters)?, |found| {
                found.entry.character.clone()
            }),
            kanji_meta_by_character: group_by(storage.find_kanji_meta(&characters)?, |found| {
                found.meta.character.clone()
            }),
        })
    }

    /// Builds the kanji results of one lookup.
    pub fn results(&self, lookup: &PositionLookup) -> Vec<KanjiResult> {
        let Some(character) = &lookup.kanji else {
            return Vec::new();
        };
        let found_kanji = (self.kanji_by_character.get(character).cloned()).unwrap_or_default();
        let kanji_meta = self.kanji_meta_by_character.get(character);
        build_kanji_results(
            found_kanji,
            kanji_meta.map(Vec::as_slice).unwrap_or_default(),
        )
    }
}

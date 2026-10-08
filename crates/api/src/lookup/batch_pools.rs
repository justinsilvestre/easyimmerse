use easyimmerse_core::lookup::{DictionaryStylesheet, KanjiResult, LookupResult};

use super::batch_response::{BatchLookupResponse, PositionLookups, TextLookups};
use super::defining_dictionary_ids::defining_dictionary_ids;
use super::lookup_pool::LookupPool;
use super::lookup_rows::LookupRows;
use super::position_lookup::PositionLookup;

type ResultKey = (String, Option<String>, String);
type KanjiKey = (String, String);

/// The distinct results and kanji of a batch lookup, which its positions refer to by index.
pub struct BatchPools {
    results: LookupPool<LookupResult, ResultKey>,
    kanji: LookupPool<KanjiResult, KanjiKey>,
}

impl Default for BatchPools {
    fn default() -> Self {
        Self {
            results: LookupPool::new(|result| {
                let LookupResult {
                    matched_text,
                    term,
                    reading,
                    ..
                } = result;
                (matched_text.clone(), reading.clone(), term.clone())
            }),
            kanji: LookupPool::new(|kanji| {
                (kanji.dictionary_id.clone(), kanji.entry.character.clone())
            }),
        }
    }
}

impl BatchPools {
    /// Adds the results of each lookup in one text to the pools,
    /// and lists the positions where lookup found something.
    pub fn text_lookups(
        &mut self,
        rows: &LookupRows,
        lookups: &[(usize, PositionLookup)],
    ) -> TextLookups {
        let positions = (lookups.iter())
            .map(|(offset, lookup)| PositionLookups {
                // The batch route's limits keep offsets far below `u32::MAX`.
                offset: *offset as u32,
                results: (rows.results(lookup).into_iter())
                    .map(|result| self.results.index_of(result))
                    .collect(),
                kanji: (rows.kanji(lookup).into_iter())
                    .map(|kanji| self.kanji.index_of(kanji))
                    .collect(),
            })
            .filter(|position| !position.results.is_empty() || !position.kanji.is_empty())
            .collect();
        TextLookups { positions }
    }

    pub fn defining_dictionary_ids(&self) -> Vec<String> {
        defining_dictionary_ids(self.results.items())
    }

    pub fn into_response(
        self,
        texts: Vec<TextLookups>,
        stylesheets: Vec<DictionaryStylesheet>,
    ) -> BatchLookupResponse {
        BatchLookupResponse {
            texts,
            results: self.results.into_items(),
            kanji: self.kanji.into_items(),
            stylesheets,
        }
    }
}

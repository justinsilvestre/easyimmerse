//! Dictionaries imported into SQLite, and the queries that lookup runs against them.

#[cfg(test)]
mod added_alternates_tests;
mod columns;
#[cfg(test)]
mod concurrent_import_tests;
#[cfg(test)]
mod import_timing_tests;
mod importer;
mod kanji_lookup;
mod listing;
mod media;
mod origin;
mod stylesheets;
mod term_lookup;

#[cfg(test)]
mod tests;

pub use importer::{import_dictionary, import_with};
pub use kanji_lookup::{find_kanji, find_kanji_meta};
pub use listing::{delete_dictionary, get_dictionary, list_dictionaries};
pub use media::get_media;
pub use stylesheets::find_stylesheets;
pub use term_lookup::{find_entries, find_term_meta};

use easyimmerse_core::dictionary::DictionaryMetadata;

/// The identifier of a stored dictionary: 16 random bytes, hex encoded.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct DictionaryId(pub String);

impl DictionaryId {
    pub fn generate() -> Self {
        Self(crate::new_row::generate_id())
    }
}

/// A dictionary as listed, without its content.
#[derive(Debug, Clone, PartialEq)]
pub struct StoredDictionary {
    pub id: DictionaryId,
    pub metadata: DictionaryMetadata,
    /// Milliseconds since the Unix epoch.
    pub imported_at: u64,
    pub counts: DictionaryCounts,
}

/// How many rows of each kind a dictionary stored.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct DictionaryCounts {
    pub entries: u64,
    pub term_meta: u64,
    pub tags: u64,
    pub kanji: u64,
    pub kanji_meta: u64,
    pub media: u64,
}

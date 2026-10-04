//! What storage finds for a lookup, before core matches and ranks it.

use crate::dictionary::{
    DictionaryFormatKind, FrequencyMode, KanjiEntry, KanjiMeta, TagDefinition, TermEntry, TermMeta,
};

/// The dictionary that a found row comes from.
#[derive(Debug, Clone, PartialEq)]
pub struct DictionaryOrigin {
    pub id: String,
    pub title: String,
    pub format: DictionaryFormatKind,
    /// The position of the dictionary in import order; lower was imported earlier and ranks first.
    pub rank: i64,
    pub frequency_mode: Option<FrequencyMode>,
}

/// A stored entry that has one of the headwords lookup searched for.
#[derive(Debug, Clone, PartialEq)]
pub struct FoundEntry {
    pub dictionary: DictionaryOrigin,
    /// Identifies the entry among all stored entries, so that an entry found under several headwords is shown once.
    pub entry_id: i64,
    /// The stored headword that matched, which may differ from the searched one in ASCII case.
    pub headword: String,
    pub entry: TermEntry,
    /// The definitions of the tags that the entry uses.
    pub tags: Vec<TagDefinition>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct FoundTermMeta {
    pub dictionary: DictionaryOrigin,
    pub meta: TermMeta,
}

#[derive(Debug, Clone, PartialEq)]
pub struct FoundKanji {
    pub dictionary: DictionaryOrigin,
    pub entry: KanjiEntry,
    /// The definitions of the tags that the entry uses, including those that name its stats.
    pub tags: Vec<TagDefinition>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct FoundKanjiMeta {
    pub dictionary: DictionaryOrigin,
    pub meta: KanjiMeta,
}

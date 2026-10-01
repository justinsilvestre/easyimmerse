use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use ts_rs::TS;

use super::TermEntry;
use super::glossary::parse_glossary;

/// A term entry as imported.
/// Its glossary stays in the dictionary's own JSON,
/// so that importing does not have to build every structured-content tree.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct DictionaryEntry {
    pub term: String,
    pub reading: Option<String>,
    /// The glossary array exactly as the dictionary states it.
    /// `TermEntry` holds the validated form.
    #[ts(type = "Array<unknown>")]
    pub definitions: RawGlossary,
    pub tags: Vec<String>,
}

impl DictionaryEntry {
    /// Converts the entry into its lookup form.
    /// Glossary items that do not follow the schema are dropped.
    pub fn to_term_entry(&self) -> TermEntry {
        TermEntry {
            term: self.term.clone(),
            reading: self.reading.clone(),
            definitions: parse_glossary(self.definitions.get()),
            tags: self.tags.clone(),
        }
    }
}

/// The unparsed JSON of a glossary array.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(transparent)]
pub struct RawGlossary(Box<RawValue>);

impl RawGlossary {
    pub fn get(&self) -> &str {
        self.0.get()
    }
}

impl PartialEq for RawGlossary {
    fn eq(&self, other: &Self) -> bool {
        self.get() == other.get()
    }
}

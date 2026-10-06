use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use super::structured_content::StructuredContent;

/// One headword of a dictionary with its definitions.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct TermEntry {
    pub term: String,
    /// How the term is read, for scripts such as kanji where the spelling does not show it.
    pub reading: Option<String>,
    /// Other spellings under which the entry is found, such as StarDict synonyms or MDict redirects.
    pub alternates: Vec<String>,
    /// The inflection classes of the term, such as `v1` or `adj-i`, which deinflection matches against.
    pub word_classes: Vec<String>,
    /// The dictionary's own ranking among entries with the same headword; higher comes first.
    pub score: i64,
    /// An identifier shared by entries that the dictionary treats as one word.
    pub sequence: Option<i64>,
    pub term_tags: Vec<String>,
    pub definition_tags: Vec<String>,
    pub definitions: Vec<Definition>,
}

impl TermEntry {
    /// Creates an entry with only a term and its definitions.
    pub fn new(term: impl Into<String>, definitions: Vec<Definition>) -> Self {
        Self {
            term: term.into(),
            reading: None,
            alternates: Vec::new(),
            word_classes: Vec::new(),
            score: 0,
            sequence: None,
            term_tags: Vec::new(),
            definition_tags: Vec::new(),
            definitions,
        }
    }

    /// Adds the alternates that the entry lacks, leaving out its term.
    pub fn add_alternates(&mut self, alternates: impl IntoIterator<Item = String>) {
        for alternate in alternates {
            if alternate != self.term && !self.alternates.contains(&alternate) {
                self.alternates.push(alternate);
            }
        }
    }

    /// Lists every string under which the entry is found: the term, the reading, and the alternates.
    pub fn headwords(&self) -> Vec<&str> {
        let mut headwords = vec![self.term.as_str()];
        let others = self.reading.iter().chain(&self.alternates);
        for headword in others.map(String::as_str) {
            if !headwords.contains(&headword) {
                headwords.push(headword);
            }
        }
        headwords
    }
}

/// One definition of an entry, kept in the form its dictionary supplies so that display can stay faithful to it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(tag = "kind", rename_all = "camelCase")]
#[ts(export)]
pub enum Definition {
    /// Plain text, in which line breaks are significant.
    Text { text: String },
    /// A tree of elements from an allowlisted set, as Yomitan dictionaries supply.
    Structured {
        #[schema(value_type = Value)]
        content: StructuredContent,
    },
    /// HTML as MDict and StarDict dictionaries supply it. It is unsanitized and must be sanitized for display.
    Html { html: String },
    /// Markup in another XML dialect. It is unsanitized and must be sanitized for display.
    Markup {
        dialect: MarkupDialect,
        markup: String,
    },
    /// A pointer from an inflected form to the term it is inflected from.
    FormOf {
        base: String,
        inflections: Vec<String>,
    },
}

impl Definition {
    pub fn text(text: impl Into<String>) -> Self {
        Self::Text { text: text.into() }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "lowercase")]
#[ts(export)]
pub enum MarkupDialect {
    /// The Pango text markup of GTK.
    Pango,
    /// The XML Dictionary Exchange Format.
    Xdxf,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry_with_alternates(alternates: &[&str]) -> TermEntry {
        let mut entry = TermEntry::new("cat", Vec::new());
        entry.add_alternates(alternates.iter().map(|alternate| alternate.to_string()));
        entry
    }

    #[test]
    fn adds_new_alternates_once_each() {
        assert_eq!(
            entry_with_alternates(&["kitty", "puss", "kitty"]).alternates,
            ["kitty", "puss"]
        );
    }

    #[test]
    fn leaves_the_term_out_of_its_alternates() {
        assert!(entry_with_alternates(&["cat"]).alternates.is_empty());
    }
}

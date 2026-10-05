use crate::dictionary::{Definition, TermEntry};

use super::header::Header;
use super::key_comparison::KeyComparison;
use super::mdict_file::RecordGroup;
use super::record_text::record_text;
use super::stylesheet::StyleSheet;
use super::text_encoding::TextEncoding;

/// Turns the records of an `.mdx` file into term entries.
pub struct EntryConversion {
    encoding: TextEncoding,
    is_html: bool,
    stylesheet: StyleSheet,
    comparison: KeyComparison,
}

impl EntryConversion {
    pub fn new(header: &Header, encoding: TextEncoding) -> Self {
        let format = header.attributes.get("Format").unwrap_or("").trim();
        Self {
            encoding,
            is_html: format.eq_ignore_ascii_case("html"),
            stylesheet: StyleSheet::parse(header.attributes.get("StyleSheet").unwrap_or("")),
            comparison: KeyComparison::from_header(header),
        }
    }

    /// Converts a record that is not a redirect, and the keys that share it, into an entry.
    pub fn convert(&self, group: &RecordGroup, record: &[u8]) -> Option<TermEntry> {
        let text = record_text(self.encoding, record);
        let term = group.keys.first()?;
        let mut entry = TermEntry::new(term.clone(), vec![self.definition(&text)]);
        entry.add_alternates(self.spellings(&group.keys));
        Some(entry)
    }

    /// Lists the keys with, when the dictionary ignores punctuation in keys, their spellings without it,
    /// so that lookup finds them under either.
    pub fn spellings(&self, keys: &[String]) -> Vec<String> {
        keys.iter()
            .flat_map(|key| [Some(key.clone()), self.comparison.stripped_spelling(key)])
            .flatten()
            .collect()
    }

    fn definition(&self, text: &str) -> Definition {
        let text = self.stylesheet.apply(text);
        if self.is_html {
            Definition::Html { html: text }
        } else {
            Definition::text(text)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dictionary::mdict::header::FormatVersion;
    use crate::dictionary::mdict::header_attributes::HeaderAttributes;

    fn header(attributes: &str) -> Header {
        Header {
            version: FormatVersion::V2,
            attributes: HeaderAttributes::parse(&format!("<Dictionary {attributes}/>")),
            key_info_encrypted: false,
        }
    }

    fn group(keys: &[&str]) -> RecordGroup {
        RecordGroup {
            offset: 0,
            keys: keys.iter().map(|key| key.to_string()).collect(),
        }
    }

    fn convert(attributes: &str, keys: &[&str], record: &str) -> Option<TermEntry> {
        let encoding = TextEncoding::from_label("UTF-8").unwrap();
        EntryConversion::new(&header(attributes), encoding).convert(&group(keys), record.as_bytes())
    }

    #[test]
    fn makes_an_html_definition_for_the_html_format() {
        let entry = convert(r#"Format="Html""#, &["cat"], "<b>cat</b>\0").unwrap();
        assert_eq!(
            entry.definitions,
            [Definition::Html {
                html: "<b>cat</b>".into()
            }]
        );
    }

    #[test]
    fn makes_a_text_definition_for_the_text_format() {
        let entry = convert(r#"Format="Text""#, &["cat"], "a feline").unwrap();
        assert_eq!(entry.definitions, [Definition::text("a feline")]);
    }

    #[test]
    fn applies_the_stylesheet() {
        let entry = convert("Format=\"Text\" StyleSheet=\"1\n[\n]\"", &["cat"], "`1`cat").unwrap();
        assert_eq!(entry.definitions, [Definition::text("[cat]")]);
    }

    #[test]
    fn lists_the_other_keys_of_the_record_as_alternates() {
        let entry = convert("", &["cat", "Cat"], "a feline").unwrap();
        assert_eq!(entry.alternates, ["Cat"]);
    }

    #[test]
    fn adds_the_spelling_of_a_key_without_punctuation_when_keys_are_stripped() {
        let entry = convert("", &["o'clock"], "of the clock").unwrap();
        assert_eq!(entry.alternates, ["oclock"]);
    }

    #[test]
    fn adds_no_spelling_without_punctuation_when_keys_are_not_stripped() {
        let entry = convert(r#"StripKey="No""#, &["o'clock"], "of the clock").unwrap();
        assert!(entry.alternates.is_empty());
    }
}

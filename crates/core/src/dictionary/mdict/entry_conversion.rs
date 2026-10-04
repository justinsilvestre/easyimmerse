use crate::dictionary::{Definition, TermEntry};

use super::header::Header;
use super::mdict_file::RecordGroup;
use super::record_text::record_text;
use super::redirects::{Redirects, link_target};
use super::stylesheet::StyleSheet;
use super::text_encoding::TextEncoding;

/// Turns the records of an `.mdx` file into term entries.
pub struct EntryConversion<'a> {
    encoding: TextEncoding,
    is_html: bool,
    stylesheet: StyleSheet,
    redirects: &'a Redirects,
}

impl<'a> EntryConversion<'a> {
    pub fn new(header: &Header, encoding: TextEncoding, redirects: &'a Redirects) -> Self {
        let format = header.attributes.get("Format").unwrap_or("").trim();
        Self {
            encoding,
            is_html: format.eq_ignore_ascii_case("html"),
            stylesheet: StyleSheet::parse(header.attributes.get("StyleSheet").unwrap_or("")),
            redirects,
        }
    }

    /// Converts one record and the keys that share it into an entry.
    /// Returns nothing for a redirect, whose keys become alternates of the target entry instead.
    pub fn convert(&self, group: &RecordGroup, record: &[u8]) -> Option<TermEntry> {
        let text = record_text(self.encoding, record);
        if link_target(&text).is_some() {
            return None;
        }
        let (term, other_keys) = group.keys.split_first()?;
        let mut entry = TermEntry::new(term.clone(), vec![self.definition(&text)]);
        entry.alternates = self.alternates(term, other_keys, &group.keys);
        Some(entry)
    }

    fn definition(&self, text: &str) -> Definition {
        let text = self.stylesheet.apply(text);
        if self.is_html {
            Definition::Html { html: text }
        } else {
            Definition::text(text)
        }
    }

    /// Lists the other keys of the record and every key that redirects to one of its keys, once each.
    fn alternates(&self, term: &str, other_keys: &[String], keys: &[String]) -> Vec<String> {
        let redirect_sources = keys.iter().flat_map(|key| self.redirects.sources_of(key));
        let mut alternates: Vec<String> = Vec::new();
        for key in other_keys.iter().chain(redirect_sources) {
            if key != term && !alternates.contains(key) {
                alternates.push(key.clone());
            }
        }
        alternates
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dictionary::mdict::header::FormatVersion;
    use crate::dictionary::mdict::header_attributes::HeaderAttributes;
    use crate::dictionary::mdict::redirects::RedirectCollector;

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

    fn redirects_to_cat() -> Redirects {
        let mut collector = RedirectCollector::new(TextEncoding::UTF_16LE);
        collector.visit(
            &group(&["kitty"]),
            &TextEncoding::UTF_16LE.encode_ascii("@@@LINK=cat"),
        );
        collector.finish()
    }

    fn convert(attributes: &str, keys: &[&str], record: &str) -> Option<TermEntry> {
        let redirects = redirects_to_cat();
        let encoding = TextEncoding::from_label("UTF-8").unwrap();
        EntryConversion::new(&header(attributes), encoding, &redirects)
            .convert(&group(keys), record.as_bytes())
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
    fn skips_a_redirect_record() {
        assert_eq!(convert("", &["kitty"], "@@@LINK=cat\r\n"), None);
    }

    #[test]
    fn lists_redirect_sources_and_shared_keys_as_alternates() {
        let entry = convert("", &["cat", "Cat"], "a feline").unwrap();
        assert_eq!(entry.alternates, ["Cat", "kitty"]);
    }
}

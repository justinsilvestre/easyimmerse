use std::collections::{BTreeMap, HashMap};

use super::key_comparison::KeyComparison;
use super::mdict_file::RecordGroup;
use super::record_text::record_text;
use super::text_encoding::TextEncoding;

const LINK_MARKER: &str = "@@@LINK=";
/// Bounds how many redirects in a row are followed, so that a cycle ends.
const MAX_HOPS: usize = 5;

/// Returns the target of a record that redirects to another key, as in `@@@LINK=target`.
pub fn link_target(text: &str) -> Option<&str> {
    let target = text.strip_prefix(LINK_MARKER)?.lines().next()?.trim();
    (!target.is_empty()).then_some(target)
}

/// Gathers the redirects and entry keys of a file as its records are read,
/// then resolves each redirect to the entries it leads to.
///
/// Keys match as the dictionary's key comparison defines, so a redirect may name its target in another case or without punctuation.
pub struct RedirectCollector {
    encoding: TextEncoding,
    comparison: KeyComparison,
    marker: Vec<u8>,
    /// The normalized target of each redirect, by its normalized source key.
    links: HashMap<String, String>,
    /// The source keys of the redirects, as the dictionary spells them, by normalized source key.
    sources: HashMap<String, Vec<String>>,
    /// The terms of the entries under each normalized key.
    entry_terms: HashMap<String, Vec<String>>,
}

impl RedirectCollector {
    pub fn new(encoding: TextEncoding, comparison: KeyComparison) -> Self {
        Self {
            encoding,
            comparison,
            marker: encoding.encode_ascii(LINK_MARKER),
            links: HashMap::new(),
            sources: HashMap::new(),
            entry_terms: HashMap::new(),
        }
    }

    /// Records a redirect, decoding only records that start with the marker, and reports whether the record was one.
    pub fn visit_record(&mut self, group: &RecordGroup, record: &[u8]) -> bool {
        if !record.starts_with(&self.marker) {
            return false;
        }
        let text = record_text(self.encoding, record);
        let Some(target) = link_target(&text) else {
            return false;
        };
        let target = self.comparison.normalize(target);
        for key in &group.keys {
            let source = self.comparison.normalize(key);
            self.links.insert(source.clone(), target.clone());
            self.sources.entry(source).or_default().push(key.clone());
        }
        true
    }

    /// Records the keys of an entry, whose term is its first key.
    pub fn visit_entry(&mut self, group: &RecordGroup) {
        let Some(term) = group.keys.first() else {
            return;
        };
        for key in &group.keys {
            let terms = self
                .entry_terms
                .entry(self.comparison.normalize(key))
                .or_default();
            if !terms.contains(term) {
                terms.push(term.clone());
            }
        }
    }

    /// Lists, for each entry term that redirects lead to, the keys that redirect to it, in order.
    pub fn finish(self) -> BTreeMap<String, Vec<String>> {
        let mut sources_by_term: BTreeMap<String, Vec<String>> = BTreeMap::new();
        for (source, spellings) in &self.sources {
            for term in self.final_terms(source) {
                sources_by_term
                    .entry(term.clone())
                    .or_default()
                    .extend(spellings.iter().cloned());
            }
        }
        for sources in sources_by_term.values_mut() {
            sources.sort();
            sources.dedup();
        }
        sources_by_term
    }

    /// Follows a chain of redirects from a normalized source key to the terms of the entries it ends at.
    /// An entry under a key wins over a redirect from the same key,
    /// so that a redirect between two spellings that compare as equal ends at the entry.
    fn final_terms(&self, source: &str) -> &[String] {
        let mut key = source;
        for _ in 0..=MAX_HOPS {
            key = match self.links.get(key) {
                Some(target) => target,
                None => return &[],
            };
            if let Some(terms) = self.entry_terms.get(key) {
                return terms;
            }
        }
        &[]
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dictionary::mdict::header::{FormatVersion, Header};
    use crate::dictionary::mdict::header_attributes::HeaderAttributes;

    fn comparison(attributes: &str) -> KeyComparison {
        KeyComparison::from_header(&Header {
            version: FormatVersion::V2,
            attributes: HeaderAttributes::parse(&format!("<Dictionary {attributes}/>")),
            key_info_encrypted: false,
        })
    }

    fn group(keys: &[&str]) -> RecordGroup {
        RecordGroup {
            offset: 0,
            keys: keys.iter().map(|key| key.to_string()).collect(),
        }
    }

    fn collector(attributes: &str) -> RedirectCollector {
        let encoding = TextEncoding::from_label("").unwrap();
        RedirectCollector::new(encoding, comparison(attributes))
    }

    /// Collects redirects, given as a source and its record, beside entries under the given keys,
    /// and returns the sources that lead to `term`.
    fn sources_of(
        attributes: &str,
        entries: &[&str],
        links: &[(&str, &str)],
        term: &str,
    ) -> Vec<String> {
        let mut collector = collector(attributes);
        for key in entries {
            collector.visit_entry(&group(&[key]));
        }
        for (source, record) in links {
            collector.visit_record(&group(&[source]), record.as_bytes());
        }
        collector.finish().remove(term).unwrap_or_default()
    }

    #[test]
    fn reads_a_link_target() {
        assert_eq!(link_target("@@@LINK=cat\r\n"), Some("cat"));
    }

    #[test]
    fn finds_no_target_in_an_ordinary_record() {
        assert_eq!(link_target("<b>cat</b>"), None);
    }

    #[test]
    fn reports_that_a_record_is_a_redirect() {
        assert!(collector("").visit_record(&group(&["kitty"]), b"@@@LINK=cat"));
    }

    #[test]
    fn reports_that_an_ordinary_record_is_no_redirect() {
        assert!(!collector("").visit_record(&group(&["cat"]), b"a feline"));
    }

    #[test]
    fn lists_the_sources_of_a_target() {
        let links = [("kitty", "@@@LINK=cat\r\n\0"), ("puss", "@@@LINK=cat")];
        assert_eq!(sources_of("", &["cat"], &links, "cat"), ["kitty", "puss"]);
    }

    #[test]
    fn follows_a_chain_of_redirects() {
        let links = [("kitty", "@@@LINK=kitten"), ("kitten", "@@@LINK=cat")];
        assert_eq!(sources_of("", &["cat"], &links, "cat"), ["kitten", "kitty"]);
    }

    #[test]
    fn drops_redirects_that_form_a_cycle() {
        let mut collector = collector("");
        collector.visit_record(&group(&["a"]), b"@@@LINK=b");
        collector.visit_record(&group(&["b"]), b"@@@LINK=a");
        assert!(collector.finish().is_empty());
    }

    #[test]
    fn drops_a_redirect_to_a_missing_key() {
        let mut collector = collector("");
        collector.visit_entry(&group(&["cat"]));
        collector.visit_record(&group(&["kitty"]), b"@@@LINK=kitten");
        assert!(collector.finish().is_empty());
    }

    #[test]
    fn leads_to_the_term_of_an_entry_from_any_of_its_keys() {
        let mut collector = collector("");
        collector.visit_entry(&group(&["cat", "feline"]));
        collector.visit_record(&group(&["kitty"]), b"@@@LINK=feline");
        assert_eq!(collector.finish().remove("cat").unwrap(), ["kitty"]);
    }

    mod when_keys_are_not_case_sensitive {
        use super::*;

        #[test]
        fn matches_a_target_in_another_case() {
            let links = [("kitty", "@@@LINK=Cat")];
            assert_eq!(sources_of("", &["cat"], &links, "cat"), ["kitty"]);
        }

        #[test]
        fn ends_a_redirect_between_two_cases_of_one_key_at_the_entry() {
            let links = [("Cat", "@@@LINK=cat")];
            assert_eq!(sources_of("", &["cat"], &links, "cat"), ["Cat"]);
        }
    }

    mod when_keys_are_case_sensitive {
        use super::*;

        const CASE_SENSITIVE: &str = r#"KeyCaseSensitive="Yes""#;

        #[test]
        fn does_not_match_a_target_in_another_case() {
            let links = [("kitty", "@@@LINK=Cat")];
            assert!(sources_of(CASE_SENSITIVE, &["cat"], &links, "cat").is_empty());
        }

        #[test]
        fn matches_a_target_in_the_same_case() {
            let links = [("kitty", "@@@LINK=Cat")];
            assert_eq!(
                sources_of(CASE_SENSITIVE, &["Cat"], &links, "Cat"),
                ["kitty"]
            );
        }
    }

    mod when_keys_are_stripped {
        use super::*;

        #[test]
        fn matches_a_target_written_without_punctuation() {
            let links = [("gelato", "@@@LINK=ice cream")];
            assert_eq!(
                sources_of("", &["ice-cream"], &links, "ice-cream"),
                ["gelato"]
            );
        }
    }

    mod when_keys_are_not_stripped {
        use super::*;

        #[test]
        fn does_not_match_a_target_written_without_punctuation() {
            let links = [("gelato", "@@@LINK=ice cream")];
            let sources = sources_of(r#"StripKey="No""#, &["ice-cream"], &links, "ice-cream");
            assert!(sources.is_empty());
        }
    }
}

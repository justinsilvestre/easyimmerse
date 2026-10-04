use std::collections::HashMap;

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

/// Gathers redirect records in a first pass over a file, decoding only the records that start with the marker.
pub struct RedirectCollector {
    encoding: TextEncoding,
    marker: Vec<u8>,
    links: HashMap<String, String>,
}

impl RedirectCollector {
    pub fn new(encoding: TextEncoding) -> Self {
        Self {
            encoding,
            marker: encoding.encode_ascii(LINK_MARKER),
            links: HashMap::new(),
        }
    }

    pub fn visit(&mut self, group: &RecordGroup, record: &[u8]) {
        if !record.starts_with(&self.marker) {
            return;
        }
        if let Some(target) = link_target(&record_text(self.encoding, record)) {
            for key in &group.keys {
                self.links.insert(key.clone(), target.to_string());
            }
        }
    }

    /// Follows chains of redirects to their final targets.
    pub fn finish(self) -> Redirects {
        let mut sources_by_target: HashMap<String, Vec<String>> = HashMap::new();
        for source in self.links.keys() {
            if let Some(target) = final_target(&self.links, source) {
                sources_by_target
                    .entry(target.to_string())
                    .or_default()
                    .push(source.clone());
            }
        }
        for sources in sources_by_target.values_mut() {
            sources.sort();
        }
        Redirects(sources_by_target)
    }
}

fn final_target<'a>(links: &'a HashMap<String, String>, source: &str) -> Option<&'a str> {
    let mut target = links.get(source)?;
    for _ in 0..MAX_HOPS {
        match links.get(target) {
            Some(next) => target = next,
            None => return Some(target),
        }
    }
    None
}

/// The keys that redirect to each key, which become alternates of the entries under that key.
#[derive(Debug, Default)]
pub struct Redirects(HashMap<String, Vec<String>>);

impl Redirects {
    pub fn sources_of(&self, key: &str) -> &[String] {
        self.0.get(key).map_or(&[], Vec::as_slice)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn redirects(links: &[(&str, &str)]) -> Redirects {
        let mut collector = RedirectCollector::new(TextEncoding::from_label("").unwrap());
        for (source, record) in links {
            let group = RecordGroup {
                offset: 0,
                keys: vec![source.to_string()],
            };
            collector.visit(&group, record.as_bytes());
        }
        collector.finish()
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
    fn lists_the_sources_of_a_target() {
        let redirects = redirects(&[("kitty", "@@@LINK=cat\r\n\0"), ("puss", "@@@LINK=cat")]);
        assert_eq!(redirects.sources_of("cat"), ["kitty", "puss"]);
    }

    #[test]
    fn follows_a_chain_of_redirects() {
        let redirects = redirects(&[("kitty", "@@@LINK=kitten"), ("kitten", "@@@LINK=cat")]);
        assert_eq!(redirects.sources_of("cat"), ["kitten", "kitty"]);
    }

    #[test]
    fn drops_redirects_that_form_a_cycle() {
        let redirects = redirects(&[("a", "@@@LINK=b"), ("b", "@@@LINK=a")]);
        assert!(redirects.sources_of("a").is_empty());
    }
}

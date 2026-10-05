use super::entry_matching::best_match;
use super::found_rows::FoundEntry;
use super::lookup_candidate::LookupCandidate;

/// The found entries for one term and reading, with the candidate that best explains them.
#[derive(Debug, Clone, PartialEq)]
pub struct ResultGroup<'a> {
    pub term: String,
    pub reading: Option<String>,
    pub candidate: &'a LookupCandidate,
    pub entries: Vec<FoundEntry>,
}

/// Groups the found entries that some candidate matches by term and reading, in the order first found.
/// Entries that no candidate matches are dropped.
pub fn group_matches(
    candidates: &[LookupCandidate],
    found_entries: Vec<FoundEntry>,
) -> Vec<ResultGroup<'_>> {
    let mut groups: Vec<ResultGroup> = Vec::new();
    for found in found_entries {
        if let Some(candidate) = best_match(candidates, &found) {
            add_to_groups(&mut groups, candidate, found);
        }
    }
    groups
}

fn add_to_groups<'a>(
    groups: &mut Vec<ResultGroup<'a>>,
    candidate: &'a LookupCandidate,
    found: FoundEntry,
) {
    match groups.iter_mut().find(|group| group.holds(&found)) {
        Some(group) => group.add(candidate, found),
        None => groups.push(ResultGroup::new(candidate, found)),
    }
}

impl<'a> ResultGroup<'a> {
    fn new(candidate: &'a LookupCandidate, found: FoundEntry) -> Self {
        Self {
            term: found.entry.term.clone(),
            reading: found.entry.reading.clone(),
            candidate,
            entries: vec![found],
        }
    }

    fn holds(&self, found: &FoundEntry) -> bool {
        self.term == found.entry.term && self.reading == found.entry.reading
    }

    fn add(&mut self, candidate: &'a LookupCandidate, found: FoundEntry) {
        if candidate.preference(self.candidate).is_lt() {
            self.candidate = candidate;
        }
        if !self
            .entries
            .iter()
            .any(|known| is_same_entry(known, &found))
        {
            self.entries.push(found);
        }
    }
}

fn is_same_entry(left: &FoundEntry, right: &FoundEntry) -> bool {
    left.dictionary.id == right.dictionary.id && left.entry_id == right.entry_id
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::deinflection::Deinflection;
    use crate::dictionary::{DictionaryFormatKind, TermEntry};
    use crate::lookup::found_rows::DictionaryOrigin;

    fn found(entry_id: i64, headword: &str, term: &str, reading: Option<&str>) -> FoundEntry {
        let mut entry = TermEntry::new(term, Vec::new());
        entry.reading = reading.map(String::from);
        FoundEntry {
            dictionary: DictionaryOrigin {
                id: "d".to_string(),
                title: "D".to_string(),
                format: DictionaryFormatKind::Yomitan,
                rank: 1,
                frequency_mode: None,
            },
            entry_id,
            folded_headword: headword.to_string(),
            entry,
            tags: Vec::new(),
        }
    }

    fn unchanged(text: &str) -> LookupCandidate {
        LookupCandidate {
            matched_text: text.to_string(),
            deinflection: Deinflection::unchanged(text),
        }
    }

    #[test]
    fn groups_entries_with_the_same_term_and_reading() {
        let candidates = vec![unchanged("猫")];
        let entries = vec![
            found(1, "猫", "猫", Some("ねこ")),
            found(2, "猫", "猫", Some("ねこ")),
        ];
        assert_eq!(group_matches(&candidates, entries)[0].entries.len(), 2);
    }

    #[test]
    fn separates_entries_with_different_readings() {
        let candidates = vec![unchanged("角")];
        let entries = vec![
            found(1, "角", "角", Some("かど")),
            found(2, "角", "角", Some("つの")),
        ];
        assert_eq!(group_matches(&candidates, entries).len(), 2);
    }

    #[test]
    fn shows_an_entry_found_under_two_headwords_once() {
        let candidates = vec![unchanged("ねこ"), unchanged("猫")];
        let entries = vec![
            found(1, "ねこ", "猫", Some("ねこ")),
            found(1, "猫", "猫", Some("ねこ")),
        ];
        assert_eq!(group_matches(&candidates, entries)[0].entries.len(), 1);
    }

    #[test]
    fn drops_an_entry_that_no_candidate_matches() {
        let candidates = vec![unchanged("猫")];
        let entries = vec![found(1, "犬", "犬", Some("いぬ"))];
        assert!(group_matches(&candidates, entries).is_empty());
    }

    #[test]
    fn keeps_the_most_preferred_candidate_of_the_group() {
        let candidates = vec![unchanged("ねこ"), unchanged("ね")];
        let entries = vec![found(1, "ね", "ね", None), found(2, "ねこ", "ね", None)];
        assert_eq!(
            group_matches(&candidates, entries)[0].candidate,
            &candidates[0]
        );
    }
}

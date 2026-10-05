use super::entry_matching::is_match;
use super::found_rows::FoundEntry;
use super::lookup_candidate::LookupCandidate;

/// The found entries for one term and reading, with the candidates that best explain them.
#[derive(Debug, Clone, PartialEq)]
pub struct ResultGroup<'a> {
    pub term: String,
    pub reading: Option<String>,
    /// The most preferred candidate that matches an entry of the group, the first that lookup listed among equals.
    pub candidate: &'a LookupCandidate,
    /// The distinct inflection chains of every candidate that matches an entry of the group
    /// and is as preferred as `candidate`, in the order that lookup listed them, starting with that of `candidate`.
    /// Equally preferred candidates match the same text, so these are alternative analyses of one form.
    pub inflection_chains: Vec<Vec<String>>,
    pub entries: Vec<FoundEntry>,
}

/// Groups the found entries that some candidate matches by term and reading, in the order first found.
/// Entries that no candidate matches are dropped.
pub fn group_matches(
    candidates: &[LookupCandidate],
    found_entries: Vec<FoundEntry>,
) -> Vec<ResultGroup<'_>> {
    group_entries(candidates, found_entries)
        .into_iter()
        .filter_map(|entries| ResultGroup::new(candidates, entries))
        .collect()
}

/// Groups the matched entries by term and reading, in the order first found.
fn group_entries(
    candidates: &[LookupCandidate],
    found_entries: Vec<FoundEntry>,
) -> Vec<Vec<FoundEntry>> {
    let mut groups: Vec<Vec<FoundEntry>> = Vec::new();
    for found in found_entries {
        if candidates
            .iter()
            .any(|candidate| is_match(candidate, &found))
        {
            add_to_groups(&mut groups, found);
        }
    }
    groups
}

/// Adds the entry to the group of its term and reading, unless the group holds it already under another headword.
fn add_to_groups(groups: &mut Vec<Vec<FoundEntry>>, found: FoundEntry) {
    let holds_term = |group: &&mut Vec<FoundEntry>| {
        group
            .first()
            .is_some_and(|first| has_same_term(first, &found))
    };
    match groups.iter_mut().find(holds_term) {
        Some(group) => {
            if !group.iter().any(|known| is_same_entry(known, &found)) {
                group.push(found);
            }
        }
        None => groups.push(vec![found]),
    }
}

impl<'a> ResultGroup<'a> {
    fn new(candidates: &'a [LookupCandidate], entries: Vec<FoundEntry>) -> Option<Self> {
        let matching: Vec<&LookupCandidate> = candidates
            .iter()
            .filter(|candidate| entries.iter().any(|found| is_match(candidate, found)))
            .collect();
        let candidate = *matching
            .iter()
            .min_by(|left, right| left.preference(right))?;
        let first = entries.first()?;
        Some(Self {
            term: first.entry.term.clone(),
            reading: first.entry.reading.clone(),
            candidate,
            inflection_chains: equally_preferred_chains(candidate, &matching),
            entries,
        })
    }
}

fn equally_preferred_chains(
    best: &LookupCandidate,
    matching: &[&LookupCandidate],
) -> Vec<Vec<String>> {
    let mut chains: Vec<Vec<String>> = Vec::new();
    let equals = matching
        .iter()
        .filter(|candidate| candidate.is_inflected() && candidate.preference(best).is_eq());
    for candidate in equals {
        if !chains.contains(&candidate.deinflection.inflections) {
            chains.push(candidate.deinflection.inflections.clone());
        }
    }
    chains
}

fn has_same_term(left: &FoundEntry, right: &FoundEntry) -> bool {
    left.entry.term == right.entry.term && left.entry.reading == right.entry.reading
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
            is_bare_form: false,
            separated_verb: None,
        }
    }

    fn deinflected(matched_text: &str, word_class: &str, inflections: &[&str]) -> LookupCandidate {
        LookupCandidate {
            matched_text: matched_text.to_string(),
            deinflection: Deinflection {
                term: "食べる".to_string(),
                word_classes: vec![word_class.to_string()],
                inflections: inflections.iter().map(|name| name.to_string()).collect(),
            },
            is_bare_form: false,
            separated_verb: None,
        }
    }

    fn taberu(word_class: &str) -> FoundEntry {
        let mut found = found(1, "食べる", "食べる", Some("たべる"));
        found.entry.word_classes = vec![word_class.to_string()];
        found
    }

    fn chains(candidates: &[LookupCandidate], entries: Vec<FoundEntry>) -> Vec<Vec<String>> {
        group_matches(candidates, entries)[0]
            .inflection_chains
            .clone()
    }

    fn chain(inflections: &[&str]) -> Vec<String> {
        inflections.iter().map(|name| name.to_string()).collect()
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

    #[test]
    fn keeps_every_equally_preferred_chain_in_the_order_listed() {
        let candidates = vec![
            deinflected("食べられた", "v1", &["past", "potential"]),
            deinflected("食べられた", "v1", &["past", "passive"]),
        ];
        assert_eq!(
            chains(&candidates, vec![taberu("v1")]),
            vec![chain(&["past", "potential"]), chain(&["past", "passive"])]
        );
    }

    #[test]
    fn lists_a_chain_reached_through_two_headwords_once() {
        let mut kana = deinflected("たべた", "v1", &["past"]);
        kana.deinflection.term = "たべる".to_string();
        let candidates = vec![deinflected("たべた", "v1", &["past"]), kana];
        let entries = vec![taberu("v1"), found(1, "たべる", "食べる", Some("たべる"))];
        assert_eq!(chains(&candidates, entries), vec![chain(&["past"])]);
    }

    #[test]
    fn leaves_out_the_chain_of_a_less_preferred_candidate() {
        let candidates = vec![
            deinflected("食べられた", "v1", &["past", "passive"]),
            deinflected("食べられた", "v1", &["past", "potential", "potential"]),
        ];
        assert_eq!(
            chains(&candidates, vec![taberu("v1")]),
            vec![chain(&["past", "passive"])]
        );
    }

    #[test]
    fn leaves_out_a_chain_whose_word_class_fits_no_entry_of_the_group() {
        let candidates = vec![
            deinflected("食べた", "v5", &["past"]),
            deinflected("食べた", "v1", &["continuative"]),
        ];
        assert_eq!(
            chains(&candidates, vec![taberu("v1")]),
            vec![chain(&["continuative"])]
        );
    }

    #[test]
    fn gives_no_chain_for_an_unchanged_match() {
        let candidates = vec![unchanged("猫")];
        assert!(chains(&candidates, vec![found(1, "猫", "猫", Some("ねこ"))]).is_empty());
    }
}

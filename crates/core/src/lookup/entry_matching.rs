use super::found_rows::FoundEntry;
use super::lookup_candidate::LookupCandidate;

/// Reports whether a found entry is a dictionary form that the candidate stands for.
///
/// A candidate with inflections undone needs an entry of one of its word classes,
/// unless the entry's format carries no word classes at all.
pub fn is_match(candidate: &LookupCandidate, found: &FoundEntry) -> bool {
    found
        .headword
        .eq_ignore_ascii_case(&candidate.deinflection.term)
        && (!candidate.is_inflected()
            || !found.dictionary.format.has_word_classes()
            || has_required_word_class(candidate, found))
}

/// Returns the most preferred candidate that the found entry matches.
pub fn best_match<'a>(
    candidates: &'a [LookupCandidate],
    found: &FoundEntry,
) -> Option<&'a LookupCandidate> {
    candidates
        .iter()
        .filter(|candidate| is_match(candidate, found))
        .min_by(|left, right| left.preference(right))
}

fn has_required_word_class(candidate: &LookupCandidate, found: &FoundEntry) -> bool {
    found
        .entry
        .word_classes
        .iter()
        .any(|word_class| candidate.deinflection.word_classes.contains(word_class))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::deinflection::Deinflection;
    use crate::dictionary::{DictionaryFormatKind, TermEntry};
    use crate::lookup::found_rows::DictionaryOrigin;

    fn found(headword: &str, format: DictionaryFormatKind, word_classes: &[&str]) -> FoundEntry {
        let mut entry = TermEntry::new(headword, Vec::new());
        entry.word_classes = word_classes.iter().map(|name| name.to_string()).collect();
        FoundEntry {
            dictionary: DictionaryOrigin {
                id: "d".to_string(),
                title: "D".to_string(),
                format,
                rank: 1,
                frequency_mode: None,
            },
            entry_id: 1,
            headword: headword.to_string(),
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

    fn deinflected(matched_text: &str, term: &str, word_class: &str) -> LookupCandidate {
        LookupCandidate {
            matched_text: matched_text.to_string(),
            deinflection: Deinflection {
                term: term.to_string(),
                word_classes: vec![word_class.to_string()],
                inflections: vec!["past".to_string()],
            },
        }
    }

    #[test]
    fn matches_an_unchanged_candidate_to_any_entry_with_its_headword() {
        let entry = found("猫", DictionaryFormatKind::Yomitan, &["n"]);
        assert!(is_match(&unchanged("猫"), &entry));
    }

    #[test]
    fn does_not_match_a_different_headword() {
        let entry = found("犬", DictionaryFormatKind::Yomitan, &[]);
        assert!(!is_match(&unchanged("猫"), &entry));
    }

    #[test]
    fn ignores_ascii_case_in_the_headword() {
        let entry = found("Cat", DictionaryFormatKind::Stardict, &[]);
        assert!(is_match(&unchanged("cat"), &entry));
    }

    #[test]
    fn matches_a_deinflected_candidate_to_an_entry_of_its_word_class() {
        let entry = found("食べる", DictionaryFormatKind::Yomitan, &["v1"]);
        assert!(is_match(&deinflected("食べた", "食べる", "v1"), &entry));
    }

    #[test]
    fn rejects_a_deinflected_candidate_for_an_entry_of_another_word_class() {
        let entry = found("食べる", DictionaryFormatKind::Yomitan, &["v5"]);
        assert!(!is_match(&deinflected("食べた", "食べる", "v1"), &entry));
    }

    #[test]
    fn rejects_a_deinflected_candidate_for_a_yomitan_entry_without_word_classes() {
        let entry = found("食べる", DictionaryFormatKind::Yomitan, &[]);
        assert!(!is_match(&deinflected("食べた", "食べる", "v1"), &entry));
    }

    #[test]
    fn matches_a_deinflected_candidate_in_a_format_without_word_classes() {
        let entry = found("食べる", DictionaryFormatKind::Stardict, &[]);
        assert!(is_match(&deinflected("食べた", "食べる", "v1"), &entry));
    }

    #[test]
    fn picks_the_longest_matching_candidate() {
        let candidates = vec![deinflected("食べたい", "食べる", "v1"), unchanged("食べる")];
        let entry = found("食べる", DictionaryFormatKind::Yomitan, &["v1"]);
        assert_eq!(best_match(&candidates, &entry), Some(&candidates[0]));
    }
}

use super::fold_case::fold_case;
use super::found_rows::FoundEntry;
use super::lookup_candidate::LookupCandidate;
use crate::deinflection::is_unmarked_word_class;

/// Reports whether a found entry is a dictionary form that the candidate stands for, ignoring case.
///
/// A candidate with inflections undone needs an entry of one of its word classes,
/// unless the entry's format carries no word classes at all.
/// An entry without classes also fits a candidate of a class that dictionaries leave unmarked, such as adverbs.
/// A particle verb whose parts stand apart needs an entry with that verb, in lowercase, as a headword.
pub fn is_match(candidate: &LookupCandidate, found: &FoundEntry) -> bool {
    found.folded_headword == fold_case(&candidate.deinflection.term)
        && (candidate.separated_verb.is_none()
            || found
                .entry
                .headwords()
                .contains(&candidate.deinflection.term.as_str()))
        && (!candidate.is_inflected()
            || !found.dictionary.format.has_word_classes()
            || has_required_word_class(candidate, found))
}

fn has_required_word_class(candidate: &LookupCandidate, found: &FoundEntry) -> bool {
    let candidate_classes = &candidate.deinflection.word_classes;
    if found.entry.word_classes.is_empty() {
        return candidate_classes
            .iter()
            .any(|word_class| is_unmarked_word_class(word_class));
    }
    found
        .entry
        .word_classes
        .iter()
        .any(|word_class| candidate_classes.contains(word_class))
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
            folded_headword: fold_case(headword),
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

    fn deinflected(matched_text: &str, term: &str, word_class: &str) -> LookupCandidate {
        LookupCandidate {
            matched_text: matched_text.to_string(),
            deinflection: Deinflection {
                term: term.to_string(),
                word_classes: vec![word_class.to_string()],
                inflections: vec!["past".to_string()],
            },
            is_bare_form: false,
            separated_verb: None,
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
        let entry = found("cat", DictionaryFormatKind::Stardict, &[]);
        assert!(is_match(&unchanged("Cat"), &entry));
    }

    #[test]
    fn ignores_the_case_of_an_umlaut() {
        let entry = found("über", DictionaryFormatKind::Stardict, &[]);
        assert!(is_match(&unchanged("Über"), &entry));
    }

    #[test]
    fn ignores_the_case_of_a_capitalized_noun() {
        let entry = found("Ärger", DictionaryFormatKind::Stardict, &[]);
        assert!(is_match(&unchanged("ÄRGER"), &entry));
    }

    #[test]
    fn ignores_cyrillic_case() {
        let entry = found("москва", DictionaryFormatKind::Stardict, &[]);
        assert!(is_match(&unchanged("Москва"), &entry));
    }

    #[test]
    fn tells_apart_kana_that_differ_only_in_size() {
        let entry = found("つ", DictionaryFormatKind::Yomitan, &[]);
        assert!(!is_match(&unchanged("っ"), &entry));
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
    fn matches_an_adverb_candidate_to_a_yomitan_entry_without_word_classes() {
        let entry = found("gern", DictionaryFormatKind::Yomitan, &[]);
        assert!(is_match(&deinflected("lieber", "gern", "adv"), &entry));
    }

    #[test]
    fn rejects_an_adverb_candidate_for_a_yomitan_entry_of_another_word_class() {
        let entry = found("gern", DictionaryFormatKind::Yomitan, &["n"]);
        assert!(!is_match(&deinflected("lieber", "gern", "adv"), &entry));
    }

    #[test]
    fn matches_a_deinflected_candidate_in_a_format_without_word_classes() {
        let entry = found("食べる", DictionaryFormatKind::Stardict, &[]);
        assert!(is_match(&deinflected("食べた", "食べる", "v1"), &entry));
    }
}

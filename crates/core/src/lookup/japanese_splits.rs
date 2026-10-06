//! Checks how Japanese text that the deinflector leaves partly alone splits into words a dictionary has.
//!
//! Lookup tries every prefix of the text, longest first, so a subsidiary verb or a suffix after a word is left for the
//! next lookup: 食べやすい is found as 食べ, the continuative of 食べる, followed by やすい.
//! Each test looks up a text in a small dictionary and checks the best result.

use super::build_lookup_results::build_lookup_results;
use super::found_rows::{DictionaryOrigin, FoundEntry};
use super::lookup_candidate::{candidate_headwords, lookup_candidates};
use crate::dictionary::{DictionaryFormatKind, TermEntry};

/// The matched text, term and first inflection chain of the best result for `text`,
/// in a dictionary of the given terms and their word classes.
fn best_result(text: &str, dictionary: &[(&str, &str)]) -> (String, String, Vec<String>) {
    let candidates = lookup_candidates(text, "ja");
    let headwords = candidate_headwords(&candidates);
    let found = dictionary
        .iter()
        .enumerate()
        .filter(|(_, (term, _))| headwords.iter().any(|headword| headword == term))
        .map(|(index, (term, word_class))| found_entry(index, term, word_class))
        .collect();
    let result = build_lookup_results(&candidates, found, &[])
        .into_iter()
        .next()
        .expect("some entry matches");
    let inflections = result
        .inflection_chains
        .into_iter()
        .next()
        .unwrap_or_default();
    (result.matched_text, result.term, inflections)
}

fn found_entry(index: usize, term: &str, word_class: &str) -> FoundEntry {
    let mut entry = TermEntry::new(term, Vec::new());
    entry.word_classes = vec![word_class.to_string()];
    FoundEntry {
        dictionary: DictionaryOrigin {
            id: "jmdict".to_string(),
            title: "JMdict".to_string(),
            format: DictionaryFormatKind::Yomitan,
            rank: 1,
            frequency_mode: None,
        },
        entry_id: index as i64,
        folded_headword: term.to_string(),
        entry,
        tags: Vec::new(),
    }
}

fn result(matched_text: &str, term: &str, inflections: &[&str]) -> (String, String, Vec<String>) {
    (
        matched_text.to_string(),
        term.to_string(),
        inflections.iter().map(|name| name.to_string()).collect(),
    )
}

mod stems_before_suffixes {
    use super::*;

    #[test]
    fn finds_the_verb_before_yasui() {
        let dictionary = [("食べる", "v1"), ("やすい", "adj-i")];
        assert_eq!(
            best_result("食べやすい", &dictionary),
            result("食べ", "食べる", &["continuative"])
        );
    }

    #[test]
    fn finds_the_adjective_before_sugiru() {
        let dictionary = [("高い", "adj-i"), ("すぎる", "v1")];
        assert_eq!(
            best_result("高すぎる", &dictionary),
            result("高", "高い", &["stem"])
        );
    }

    #[test]
    fn finds_the_verb_before_sugiru() {
        let dictionary = [("飲む", "v5"), ("すぎる", "v1")];
        assert_eq!(
            best_result("飲みすぎる", &dictionary),
            result("飲み", "飲む", &["continuative"])
        );
    }

    #[test]
    fn finds_the_verb_before_sugiru_in_kanji() {
        let dictionary = [("寝る", "v1"), ("過ぎる", "v1")];
        assert_eq!(
            best_result("寝過ぎる", &dictionary),
            result("寝", "寝る", &["continuative"])
        );
    }

    #[test]
    fn finds_the_verb_before_nagara() {
        let dictionary = [("書く", "v5"), ("ながら", "prt")];
        assert_eq!(
            best_result("書きながら", &dictionary),
            result("書き", "書く", &["continuative"])
        );
    }

    #[test]
    fn finds_the_verb_before_nasai() {
        let dictionary = [("寝る", "v1"), ("なさる", "v5")];
        assert_eq!(
            best_result("寝なさい", &dictionary),
            result("寝", "寝る", &["continuative"])
        );
    }

    #[test]
    fn finds_the_verb_before_nasai_after_a_contracted_ru() {
        let dictionary = [("座る", "v5"), ("なさる", "v5")];
        assert_eq!(
            best_result("座んなさい", &dictionary),
            result("座ん", "座る", &["colloquial"])
        );
    }

    #[test]
    fn finds_the_adjective_before_the_nominal_sa() {
        let dictionary = [("高い", "adj-i")];
        assert_eq!(
            best_result("高さ", &dictionary),
            result("高", "高い", &["stem"])
        );
    }

    #[test]
    fn finds_the_adjective_before_ge() {
        let dictionary = [("寂しい", "adj-i")];
        assert_eq!(
            best_result("寂しげ", &dictionary),
            result("寂し", "寂しい", &["stem"])
        );
    }

    #[test]
    fn finds_the_adjective_before_garu() {
        let dictionary = [("寒い", "adj-i")];
        assert_eq!(
            best_result("寒がる", &dictionary),
            result("寒", "寒い", &["stem"])
        );
    }

    #[test]
    fn finds_the_adjective_before_a_causative_garu() {
        let dictionary = [("怖い", "adj-i")];
        assert_eq!(
            best_result("怖がらせる", &dictionary),
            result("怖", "怖い", &["stem"])
        );
    }
}

mod te_forms_before_subsidiary_verbs {
    use super::*;

    #[test]
    fn finds_the_te_form_before_iru() {
        let dictionary = [("食べる", "v1"), ("いる", "v1")];
        assert_eq!(
            best_result("食べている", &dictionary),
            result("食べて", "食べる", &["te-form"])
        );
    }

    #[test]
    fn finds_the_te_form_of_a_passive_before_iru() {
        let dictionary = [("書く", "v5"), ("いる", "v1")];
        assert_eq!(
            best_result("書かれていた", &dictionary),
            result("書かれて", "書く", &["te-form", "passive"])
        );
    }

    #[test]
    fn finds_the_te_form_before_oku() {
        let dictionary = [("書く", "v5"), ("おく", "v5")];
        assert_eq!(
            best_result("書いておく", &dictionary),
            result("書いて", "書く", &["te-form"])
        );
    }

    #[test]
    fn finds_the_te_form_before_shimau() {
        let dictionary = [("読む", "v5"), ("しまう", "v5")];
        assert_eq!(
            best_result("読んでしまう", &dictionary),
            result("読んで", "読む", &["te-form"])
        );
    }
}

mod contractions {
    use super::*;

    #[test]
    fn finds_the_verb_of_a_western_negative_progressive_as_one_word() {
        let dictionary = [("言う", "v5")];
        assert_eq!(
            best_result("言うてへん", &dictionary),
            result("言うてへん", "言う", &["negative", "progressive"])
        );
    }

    #[test]
    fn finds_the_verb_of_teru_as_one_word() {
        let dictionary = [("食べる", "v1"), ("いる", "v1")];
        assert_eq!(
            best_result("食べてる", &dictionary),
            result("食べてる", "食べる", &["progressive"])
        );
    }

    #[test]
    fn finds_the_verb_of_a_past_chau_as_one_word() {
        let dictionary = [("食べる", "v1"), ("しまう", "v5")];
        assert_eq!(
            best_result("食べちゃった", &dictionary),
            result("食べちゃった", "食べる", &["past", "completive"])
        );
    }
}

mod forms_before_particles {
    use super::*;

    #[test]
    fn finds_the_negative_before_de() {
        let dictionary = [("食べる", "v1")];
        assert_eq!(
            best_result("食べないで", &dictionary),
            result("食べない", "食べる", &["negative"])
        );
    }

    #[test]
    fn finds_the_negative_before_de_oku() {
        let dictionary = [("言う", "v5"), ("おく", "v5")];
        assert_eq!(
            best_result("言わないでおく", &dictionary),
            result("言わない", "言う", &["negative"])
        );
    }

    #[test]
    fn finds_the_volitional_before_ka() {
        let dictionary = [("行く", "v5")];
        assert_eq!(
            best_result("行こっか", &dictionary),
            result("行こっ", "行く", &["volitional"])
        );
    }

    #[test]
    fn finds_the_contracted_verb_before_the_prohibitive_na() {
        let dictionary = [("触る", "v5")];
        assert_eq!(
            best_result("触んな", &dictionary),
            result("触ん", "触る", &["colloquial"])
        );
    }

    #[test]
    fn finds_the_adverbial_before_arimasu() {
        let dictionary = [("高い", "adj-i"), ("ある", "v5")];
        assert_eq!(
            best_result("高くあります", &dictionary),
            result("高く", "高い", &["adverbial"])
        );
    }
}

mod separate_verbs {
    use super::*;

    #[test]
    fn finds_the_noun_before_dekiru() {
        let dictionary = [("勉強", "n"), ("できる", "v1"), ("する", "vs")];
        assert_eq!(
            best_result("勉強できる", &dictionary),
            result("勉強", "勉強", &[])
        );
    }

    #[test]
    fn finds_dekiru_as_a_verb_of_its_own() {
        let dictionary = [("できる", "v1"), ("する", "vs")];
        assert_eq!(
            best_result("できる", &dictionary),
            result("できる", "できる", &[])
        );
    }

    #[test]
    fn finds_a_short_causative_verb_as_a_verb_of_its_own() {
        let dictionary = [("待つ", "v5"), ("待たす", "v5")];
        assert_eq!(
            best_result("待たされる", &dictionary),
            result("待たされる", "待たす", &["passive"])
        );
    }

    #[test]
    fn finds_the_verb_of_a_short_causative_that_the_dictionary_does_not_list() {
        let dictionary = [("書く", "v5")];
        assert_eq!(
            best_result("書かされる", &dictionary),
            result("書かされる", "書く", &["passive", "causative"])
        );
    }
}

mod classical_n {
    use super::*;

    #[test]
    fn finds_the_verb_before_bakari() {
        let dictionary = [("泣く", "v5"), ("ばかり", "prt")];
        let (matched_text, term, _) = best_result("泣かんばかり", &dictionary);
        assert_eq!(
            (matched_text, term),
            ("泣かん".to_string(), "泣く".to_string())
        );
    }

    #[test]
    fn finds_the_verb_before_to_suru() {
        let dictionary = [("去る", "v5"), ("する", "vs")];
        let (matched_text, term, _) = best_result("去らんとする", &dictionary);
        assert_eq!(
            (matched_text, term),
            ("去らん".to_string(), "去る".to_string())
        );
    }
}

mod one_kana_stems {
    use super::*;

    #[test]
    fn rank_below_a_longer_word() {
        let dictionary = [("しかし", "conj"), ("する", "vs")];
        assert_eq!(
            best_result("しかし", &dictionary),
            result("しかし", "しかし", &[])
        );
    }

    #[test]
    fn rank_below_a_word_of_the_same_length() {
        let dictionary = [("し", "prt"), ("する", "vs")];
        assert_eq!(best_result("し", &dictionary), result("し", "し", &[]));
    }

    #[test]
    fn rank_below_a_longer_inflected_form() {
        let dictionary = [("くる", "vk"), ("きる", "v1")];
        assert_eq!(
            best_result("きた", &dictionary),
            result("きた", "くる", &["past"])
        );
    }

    #[test]
    fn are_found_when_nothing_longer_matches() {
        let dictionary = [("する", "vs"), ("ながら", "prt")];
        assert_eq!(
            best_result("しながら", &dictionary),
            result("し", "する", &["continuative"])
        );
    }
}

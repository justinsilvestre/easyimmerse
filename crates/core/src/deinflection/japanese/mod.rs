//! A rule-based deinflector for Japanese verbs and i-adjectives.
//!
//! Each rule replaces an inflected kana ending with a base ending. Rules chain, so that
//! 食べさせられなかった is traced back through 食べさせられない, 食べさせられる and 食べさせる to 食べる.
//! The rule groups and the sources they are drawn from are listed in `docs/japanese-deinflection-sources.md`.

#[cfg(test)]
mod oracle_tests;
mod rule;
mod rules;
mod search;
mod word_class;

use super::Deinflection;

/// Lists the dictionary forms that the Japanese `text` may be an inflection of,
/// starting with the text itself, unchanged.
pub fn deinflect(text: &str) -> Vec<Deinflection> {
    search::search(text, rules::ALL)
}

#[cfg(test)]
pub(super) mod test_support {
    /// Whether deinflecting `text` yields `term` in `word_class` through exactly `inflections`.
    pub fn yields(text: &str, term: &str, word_class: &str, inflections: &[&str]) -> bool {
        super::deinflect(text).iter().any(|candidate| {
            candidate.term == term
                && candidate
                    .word_classes
                    .iter()
                    .any(|class| class == word_class)
                && candidate.inflections == inflections
        })
    }
}

#[cfg(test)]
mod tests {
    use super::deinflect;
    use super::test_support::yields;

    #[test]
    fn undoes_a_stack_of_inflections_outermost_first() {
        assert!(yields(
            "食べさせられなかった",
            "食べる",
            "v1",
            &["past", "negative", "passive", "causative"]
        ));
    }

    #[test]
    fn undoes_a_polite_stack_of_inflections() {
        assert!(yields(
            "読ませられてませんでした",
            "読む",
            "v5",
            &[
                "past",
                "negative",
                "polite",
                "progressive",
                "passive",
                "causative"
            ]
        ));
    }

    #[test]
    fn does_not_read_a_noun_ending_in_ta_as_a_past() {
        let candidates = deinflect("かた");
        assert!(
            !candidates
                .iter()
                .any(|candidate| candidate.inflections == ["past"])
        );
    }

    #[test]
    fn reads_a_kanji_noun_only_as_a_possible_bare_stem() {
        let candidates = deinflect("学生");
        let inflections: Vec<_> = candidates[1..]
            .iter()
            .map(|candidate| candidate.inflections.clone())
            .collect();
        assert_eq!(inflections, [["stem"], ["continuative"]]);
    }

    #[test]
    fn lists_each_term_and_inflection_chain_once() {
        let candidates = deinflect("食べられる");
        let unique = candidates.iter().filter(|candidate| {
            candidates
                .iter()
                .filter(|other| {
                    other.term == candidate.term && other.inflections == candidate.inflections
                })
                .count()
                == 1
        });
        assert_eq!(unique.count(), candidates.len());
    }

    #[test]
    fn merges_the_classes_of_candidates_with_the_same_chain() {
        let candidates = deinflect("帰れる");
        let potential = candidates
            .iter()
            .find(|candidate| candidate.term == "帰る" && candidate.inflections == ["potential"]);
        assert_eq!(
            potential.map(|candidate| candidate.word_classes.clone()),
            Some(vec!["v1".to_string(), "v5".to_string()])
        );
    }

    #[test]
    fn keeps_the_candidates_for_a_long_text_few() {
        assert!(deinflect("食べさせられていなかったらしいです").len() < 100);
    }
}

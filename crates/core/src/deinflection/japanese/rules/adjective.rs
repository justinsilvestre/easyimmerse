//! I-adjective inflections, which also undo the auxiliaries that inflect like i-adjectives, such as ない and たい.

use crate::deinflection::japanese::rule::{Rule, Stem};
use crate::deinflection::japanese::word_class::WordClasses as C;

/// The endings that replace the final い of an i-adjective: adverbial く, negative くない, past かった,
/// te-form くて, provisional ければ, conditional かったら, volitional かろう and nominalized さ.
/// いい inflects from よい, so its forms such as よかった trace back to よい.
///
/// Sources: <https://en.wiktionary.org/w/index.php?title=Appendix:Japanese_adjectives&oldid=91406689#Inflection>,
/// <https://en.wikipedia.org/w/index.php?title=Japanese_adjectives&oldid=1305801284#i-adjective>
/// and, for さ, <https://en.wiktionary.org/w/index.php?title=%E3%81%95&oldid=92448343#Etymology_3>.
pub const ADJECTIVE: &[Rule] = &[
    adjective("く", &["adverbial"]),
    adjective("くない", &["negative"]).from(C::ADJ_I),
    adjective("かった", &["past"]),
    adjective("くて", &["te-form"]),
    adjective("ければ", &["provisional"]),
    adjective("かったら", &["conditional"]),
    adjective("かろう", &["volitional"]),
    adjective("さ", &["nominalized"]),
];

/// The stem of an i-adjective before suffixes such as そう and すぎる, from the same sources as [`ADJECTIVE`].
pub const ADJECTIVE_STEM: &[Rule] = &[Rule::replace("", "い")
    .from(C::ADJECTIVE_STEM)
    .to(C::ADJ_I)
    .stem(Stem::NonEmpty)];

const fn adjective(inflected: &'static str, inflections: &'static [&'static str]) -> Rule {
    Rule::replace(inflected, "い")
        .to(C::ADJ_I)
        .named(inflections)
        .stem(Stem::NonEmpty)
}

#[cfg(test)]
mod tests {
    use crate::deinflection::japanese::test_support::yields;

    #[test]
    fn undoes_the_adverbial() {
        assert!(yields("高く", "高い", "adj-i", &["adverbial"]));
    }

    #[test]
    fn undoes_the_negative() {
        assert!(yields("高くない", "高い", "adj-i", &["negative"]));
    }

    #[test]
    fn undoes_the_past() {
        assert!(yields("高かった", "高い", "adj-i", &["past"]));
    }

    #[test]
    fn undoes_the_negative_past() {
        assert!(yields(
            "高くなかった",
            "高い",
            "adj-i",
            &["past", "negative"]
        ));
    }

    #[test]
    fn undoes_the_te_form() {
        assert!(yields("高くて", "高い", "adj-i", &["te-form"]));
    }

    #[test]
    fn undoes_the_provisional() {
        assert!(yields("高ければ", "高い", "adj-i", &["provisional"]));
    }

    #[test]
    fn undoes_the_conditional() {
        assert!(yields("高かったら", "高い", "adj-i", &["conditional"]));
    }

    #[test]
    fn undoes_the_volitional() {
        assert!(yields("高かろう", "高い", "adj-i", &["volitional"]));
    }

    #[test]
    fn undoes_the_nominalized_form() {
        assert!(yields("悲しさ", "悲しい", "adj-i", &["nominalized"]));
    }

    #[test]
    fn traces_the_past_of_ii_to_yoi() {
        assert!(yields("よかった", "よい", "adj-i", &["past"]));
    }

    #[test]
    fn does_not_reduce_an_ending_to_a_bare_i() {
        assert!(!yields("かった", "い", "adj-i", &["past"]));
    }
}

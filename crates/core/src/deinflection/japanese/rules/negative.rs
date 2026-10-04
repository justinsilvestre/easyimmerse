//! Negative suffixes on the irrealis stem: ない, ぬ, ん, ず and ないで, and ない as the negative of ある.

use crate::deinflection::japanese::rule::{Rule, Stem};
use crate::deinflection::japanese::word_class::WordClasses as C;

/// ない inflects as an i-adjective, so its own forms are undone by the adjective rules first.
/// ぬ (with its provisional ねば) and its contraction ん are older or colloquial negatives,
/// ず is the negative continuative, and ないで is the negative te-form ("without doing").
/// The suppletive negative of ある is ない.
///
/// Sources: <https://en.wikipedia.org/w/index.php?title=Japanese_conjugation_(mizenkei_base)&oldid=1377950986#Negative:_Conjugation_table>
/// and <https://en.wiktionary.org/w/index.php?title=Appendix:Japanese_verbs&oldid=92311215#Other_forms>
/// (the paradigm of ない and ぬ, and the note on ある).
pub const NEGATIVE: &[Rule] = &[
    Rule::replace("ない", "")
        .from(C::ADJ_I)
        .to(C::IRREALIS)
        .named(&["negative"]),
    irrealis("ぬ", &["negative"]),
    irrealis("ん", &["negative"]),
    irrealis("ねば", &["provisional", "negative"]),
    irrealis("ず", &["negative continuative"]),
    irrealis("ないで", &["negative te-form"]),
    Rule::replace("なかったり", "ない")
        .to(C::ADJ_I)
        .named(&["representative"]),
    Rule::replace("ない", "ある")
        .from(C::ADJ_I)
        .to(C::V5)
        .named(&["negative"])
        .stem(Stem::Empty),
];

const fn irrealis(inflected: &'static str, inflections: &'static [&'static str]) -> Rule {
    Rule::replace(inflected, "")
        .to(C::IRREALIS)
        .named(inflections)
}

#[cfg(test)]
mod tests {
    use crate::deinflection::japanese::test_support::yields;

    mod nai {
        use super::yields;

        #[test]
        fn undoes_an_ichidan_negative() {
            assert!(yields("食べない", "食べる", "v1", &["negative"]));
        }

        #[test]
        fn undoes_a_godan_negative() {
            assert!(yields("書かない", "書く", "v5", &["negative"]));
        }

        #[test]
        fn undoes_a_godan_negative_in_wa() {
            assert!(yields("買わない", "買う", "v5", &["negative"]));
        }

        #[test]
        fn undoes_the_negative_of_kuru_in_kanji() {
            assert!(yields("来ない", "来る", "vk", &["negative"]));
        }

        #[test]
        fn undoes_the_negative_of_kuru_in_kana() {
            assert!(yields("こない", "くる", "vk", &["negative"]));
        }

        #[test]
        fn undoes_the_negative_of_suru() {
            assert!(yields("しない", "する", "vs", &["negative"]));
        }

        #[test]
        fn undoes_the_negative_of_a_zuru_verb() {
            assert!(yields("論じない", "論ずる", "vz", &["negative"]));
        }

        #[test]
        fn undoes_a_negative_past() {
            assert!(yields("書かなかった", "書く", "v5", &["past", "negative"]));
        }

        #[test]
        fn undoes_a_negative_te_form_in_nakute() {
            assert!(yields("書かなくて", "書く", "v5", &["te-form", "negative"]));
        }

        #[test]
        fn undoes_a_negative_representative() {
            assert!(yields(
                "書かなかったり",
                "書く",
                "v5",
                &["representative", "negative"]
            ));
        }

        #[test]
        fn traces_nai_back_to_aru() {
            assert!(yields("ない", "ある", "v5", &["negative"]));
        }

        #[test]
        fn does_not_trace_a_verb_negative_back_to_aru() {
            assert!(!yields("食べない", "食べある", "v5", &["negative"]));
        }
    }

    mod nu_and_n {
        use super::yields;

        #[test]
        fn undoes_nu() {
            assert!(yields("知らぬ", "知る", "v5", &["negative"]));
        }

        #[test]
        fn undoes_n() {
            assert!(yields("知らん", "知る", "v5", &["negative"]));
        }

        #[test]
        fn undoes_sen_as_the_negative_of_suru() {
            assert!(yields("せん", "する", "vs", &["negative"]));
        }

        #[test]
        fn undoes_the_provisional_of_nu() {
            assert!(yields(
                "書かねば",
                "書く",
                "v5",
                &["provisional", "negative"]
            ));
        }
    }

    mod zu {
        use super::yields;

        #[test]
        fn undoes_a_godan_zu() {
            assert!(yields("書かず", "書く", "v5", &["negative continuative"]));
        }

        #[test]
        fn undoes_sezu_as_the_zu_of_suru() {
            assert!(yields("せず", "する", "vs", &["negative continuative"]));
        }
    }

    mod naide {
        use super::yields;

        #[test]
        fn undoes_an_ichidan_naide() {
            assert!(yields("食べないで", "食べる", "v1", &["negative te-form"]));
        }
    }
}

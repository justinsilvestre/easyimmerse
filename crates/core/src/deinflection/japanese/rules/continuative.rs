//! Suffixes on the continuative stem of a verb, some of which also follow an adjective stem.

use crate::deinflection::japanese::rule::Rule;
use crate::deinflection::japanese::word_class::WordClasses as C;

/// Desiderative たい (which inflects as an i-adjective), ながら ("while"), なさい (a polite imperative),
/// and excessive すぎる (which inflects as an ichidan verb and also follows adjective stems).
///
/// Sources: <https://en.wikipedia.org/w/index.php?title=Japanese_conjugation_(ren%27y%C5%8Dkei_base)&oldid=1378034543#Infinitive:_Grammatical_compatibility>
/// and <https://en.wiktionary.org/w/index.php?title=Appendix:Japanese_verbs&oldid=92311215#Suffixes_to_the_continuative_(-i)_form>;
/// for すぎる after adjectives, <https://en.wiktionary.org/w/index.php?title=Appendix:Japanese_adjectives&oldid=91406689#Inflection>.
pub const CONTINUATIVE_SUFFIXES: &[Rule] = &[
    Rule::replace("たい", "")
        .from(C::ADJ_I)
        .to(C::CONTINUATIVE)
        .named(&["desiderative"]),
    Rule::replace("ながら", "")
        .to(C::CONTINUATIVE)
        .named(&["while"]),
    Rule::replace("なさい", "")
        .to(C::CONTINUATIVE)
        .named(&["polite imperative"]),
    Rule::replace("すぎる", "")
        .from(C::V1)
        .to(C::CONTINUATIVE.or(C::ADJECTIVE_STEM))
        .named(&["excessive"]),
];

/// そう ("looks like") after a verb's continuative stem or an adjective's stem.
/// いい and ない take さ before it: よさそう and なさそう.
///
/// Source: <https://en.wiktionary.org/w/index.php?title=%E3%81%9D%E3%81%86&oldid=92159732#Etymology_2>.
pub const APPEARANCE: &[Rule] = &[
    Rule::replace("そう", "")
        .to(C::CONTINUATIVE.or(C::ADJECTIVE_STEM))
        .named(&["appearance"]),
    Rule::replace("よさそう", "よい")
        .to(C::ADJ_I)
        .named(&["appearance"]),
    Rule::replace("なさそう", "ない")
        .to(C::ADJ_I)
        .named(&["appearance"]),
];

#[cfg(test)]
mod tests {
    use crate::deinflection::japanese::test_support::yields;

    mod desiderative {
        use super::yields;

        #[test]
        fn undoes_tai() {
            assert!(yields("食べたい", "食べる", "v1", &["desiderative"]));
        }

        #[test]
        fn undoes_a_negative_tai() {
            assert!(yields(
                "書きたくない",
                "書く",
                "v5",
                &["negative", "desiderative"]
            ));
        }

        #[test]
        fn undoes_a_past_tai() {
            assert!(yields(
                "来たかった",
                "来る",
                "vk",
                &["past", "desiderative"]
            ));
        }
    }

    mod nagara {
        use super::yields;

        #[test]
        fn undoes_nagara() {
            assert!(yields("書きながら", "書く", "v5", &["while"]));
        }
    }

    mod nasai {
        use super::yields;

        #[test]
        fn undoes_nasai() {
            assert!(yields("読みなさい", "読む", "v5", &["polite imperative"]));
        }
    }

    mod sugiru {
        use super::yields;

        #[test]
        fn undoes_sugiru_after_a_verb() {
            assert!(yields("食べすぎる", "食べる", "v1", &["excessive"]));
        }

        #[test]
        fn undoes_sugiru_after_an_adjective() {
            assert!(yields("高すぎる", "高い", "adj-i", &["excessive"]));
        }

        #[test]
        fn undoes_a_past_sugiru() {
            assert!(yields("飲みすぎた", "飲む", "v5", &["past", "excessive"]));
        }
    }

    mod appearance {
        use super::yields;

        #[test]
        fn undoes_sou_after_a_verb() {
            assert!(yields("降りそう", "降る", "v5", &["appearance"]));
        }

        #[test]
        fn undoes_sou_after_suru() {
            assert!(yields("しそう", "する", "vs", &["appearance"]));
        }

        #[test]
        fn undoes_sou_after_an_adjective() {
            assert!(yields("美味しそう", "美味しい", "adj-i", &["appearance"]));
        }

        #[test]
        fn traces_yosasou_to_yoi() {
            assert!(yields("よさそう", "よい", "adj-i", &["appearance"]));
        }

        #[test]
        fn undoes_sou_after_a_verb_negative() {
            assert!(yields(
                "食べなさそう",
                "食べる",
                "v1",
                &["appearance", "negative"]
            ));
        }

        #[test]
        fn undoes_sou_after_an_adjective_negative() {
            assert!(yields(
                "高くなさそう",
                "高い",
                "adj-i",
                &["appearance", "negative"]
            ));
        }
    }
}

//! Subsidiary verbs after the te-form, with their colloquial contractions.

use crate::deinflection::japanese::rule::Rule;
use crate::deinflection::japanese::word_class::WordClasses as C;

/// Progressive ている and its contraction てる, both inflecting as ichidan verbs.
///
/// Sources: <https://en.wikipedia.org/w/index.php?title=Japanese_conjugation_(ren%27y%C5%8Dkei_base)&oldid=1378034543#Subsidiaries>
/// and <https://en.wiktionary.org/w/index.php?title=%E3%81%A6%E3%82%8B&oldid=92087370>.
pub const PROGRESSIVE: &[Rule] = &[
    voiceless("ている", C::V1, &["progressive"]),
    voiced("でいる", C::V1, &["progressive"]),
    voiceless("てる", C::V1, &["progressive"]),
    voiced("でる", C::V1, &["progressive"]),
];

/// Preparatory ておく ("do in advance") and its contraction とく, both inflecting as godan verbs.
///
/// Sources: <https://en.wikipedia.org/w/index.php?title=Japanese_conjugation_(ren%27y%C5%8Dkei_base)&oldid=1378034543#Subsidiaries>
/// and <https://en.wiktionary.org/w/index.php?title=%E3%81%A8%E3%81%8F&oldid=85867158>.
pub const PREPARATORY: &[Rule] = &[
    voiceless("ておく", C::V5, &["preparatory"]),
    voiced("でおく", C::V5, &["preparatory"]),
    voiceless("とく", C::V5, &["preparatory"]),
    voiced("どく", C::V5, &["preparatory"]),
];

/// Completive てしまう ("do completely, or regrettably") and its contractions ちまう and ちゃう,
/// voiced to じまう and じゃう where て is voiced to で. They inflect as godan verbs, as しまう does.
///
/// Sources: <https://en.wikipedia.org/w/index.php?title=Japanese_conjugation_(ren%27y%C5%8Dkei_base)&oldid=1378034543#Subsidiaries>
/// and <https://en.wiktionary.org/w/index.php?title=%E3%81%A1%E3%82%83%E3%81%86&oldid=92197620#Etymology_1>.
pub const COMPLETIVE: &[Rule] = &[
    voiceless("てしまう", C::V5, &["completive"]),
    voiced("でしまう", C::V5, &["completive"]),
    voiceless("ちまう", C::V5, &["completive"]),
    voiced("じまう", C::V5, &["completive"]),
    voiceless("ちゃう", C::V5, &["completive"]),
    voiced("じゃう", C::V5, &["completive"]),
];

const fn voiceless(inflected: &'static str, from: C, inflections: &'static [&'static str]) -> Rule {
    Rule::replace(inflected, "")
        .from(from)
        .to(C::ONBIN_TA)
        .named(inflections)
}

const fn voiced(inflected: &'static str, from: C, inflections: &'static [&'static str]) -> Rule {
    Rule::replace(inflected, "")
        .from(from)
        .to(C::ONBIN_DA)
        .named(inflections)
}

#[cfg(test)]
mod tests {
    use crate::deinflection::japanese::test_support::yields;

    mod progressive {
        use super::yields;

        #[test]
        fn undoes_teiru() {
            assert!(yields("食べている", "食べる", "v1", &["progressive"]));
        }

        #[test]
        fn undoes_a_voiced_deiru() {
            assert!(yields("読んでいる", "読む", "v5", &["progressive"]));
        }

        #[test]
        fn undoes_the_contraction_teru() {
            assert!(yields("食べてる", "食べる", "v1", &["progressive"]));
        }

        #[test]
        fn undoes_the_voiced_contraction_deru() {
            assert!(yields("読んでる", "読む", "v5", &["progressive"]));
        }

        #[test]
        fn undoes_a_past_progressive() {
            assert!(yields(
                "食べていた",
                "食べる",
                "v1",
                &["past", "progressive"]
            ));
        }

        #[test]
        fn undoes_a_contracted_past_progressive() {
            assert!(yields("食べてた", "食べる", "v1", &["past", "progressive"]));
        }

        #[test]
        fn undoes_a_negative_progressive() {
            assert!(yields(
                "食べていない",
                "食べる",
                "v1",
                &["negative", "progressive"]
            ));
        }
    }

    mod preparatory {
        use super::yields;

        #[test]
        fn undoes_teoku() {
            assert!(yields("書いておく", "書く", "v5", &["preparatory"]));
        }

        #[test]
        fn undoes_the_contraction_toku() {
            assert!(yields("書いとく", "書く", "v5", &["preparatory"]));
        }

        #[test]
        fn undoes_the_voiced_contraction_doku() {
            assert!(yields("読んどく", "読む", "v5", &["preparatory"]));
        }
    }

    mod completive {
        use super::yields;

        #[test]
        fn undoes_teshimau() {
            assert!(yields("書いてしまう", "書く", "v5", &["completive"]));
        }

        #[test]
        fn undoes_the_contraction_chau() {
            assert!(yields("書いちゃう", "書く", "v5", &["completive"]));
        }

        #[test]
        fn undoes_the_voiced_contraction_jau() {
            assert!(yields("読んじゃう", "読む", "v5", &["completive"]));
        }

        #[test]
        fn undoes_the_contraction_chimau() {
            assert!(yields("忘れちまう", "忘れる", "v1", &["completive"]));
        }

        #[test]
        fn undoes_a_past_chau() {
            assert!(yields(
                "食べちゃった",
                "食べる",
                "v1",
                &["past", "completive"]
            ));
        }
    }
}

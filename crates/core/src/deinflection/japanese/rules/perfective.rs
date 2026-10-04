//! Suffixes on the euphonic stem: past た, te-form て, conditional たら and representative たり.

use crate::deinflection::japanese::rule::Rule;
use crate::deinflection::japanese::word_class::WordClasses as C;

/// た, て, たら and たり, voiced to だ, で, だら and だり after the voiced euphonic stems.
///
/// Sources: <https://en.wiktionary.org/w/index.php?title=Appendix:Japanese_verbs&oldid=92311215#Complex_forms>
/// and <https://en.wikipedia.org/w/index.php?title=Japanese_conjugation_(ren%27y%C5%8Dkei_base)&oldid=1378034543#Perfective:_Conjugation_table>.
pub const PERFECTIVE: &[Rule] = &[
    voiceless("た", &["past"]),
    voiced("だ", &["past"]),
    voiceless("て", &["te-form"]),
    voiced("で", &["te-form"]),
    voiceless("たら", &["conditional"]),
    voiced("だら", &["conditional"]),
    voiceless("たり", &["representative"]),
    voiced("だり", &["representative"]),
];

const fn voiceless(inflected: &'static str, inflections: &'static [&'static str]) -> Rule {
    Rule::replace(inflected, "")
        .to(C::ONBIN_TA)
        .named(inflections)
}

const fn voiced(inflected: &'static str, inflections: &'static [&'static str]) -> Rule {
    Rule::replace(inflected, "")
        .to(C::ONBIN_DA)
        .named(inflections)
}

#[cfg(test)]
mod tests {
    use crate::deinflection::japanese::test_support::yields;

    mod past {
        use super::yields;

        #[test]
        fn undoes_an_ichidan_past() {
            assert!(yields("食べた", "食べる", "v1", &["past"]));
        }

        #[test]
        fn undoes_a_godan_past_in_ku() {
            assert!(yields("書いた", "書く", "v5", &["past"]));
        }

        #[test]
        fn undoes_a_godan_past_in_gu() {
            assert!(yields("泳いだ", "泳ぐ", "v5", &["past"]));
        }

        #[test]
        fn undoes_a_godan_past_in_su() {
            assert!(yields("話した", "話す", "v5", &["past"]));
        }

        #[test]
        fn undoes_a_godan_past_in_tsu() {
            assert!(yields("待った", "待つ", "v5", &["past"]));
        }

        #[test]
        fn undoes_a_godan_past_in_u() {
            assert!(yields("買った", "買う", "v5", &["past"]));
        }

        #[test]
        fn undoes_a_godan_past_in_ru() {
            assert!(yields("帰った", "帰る", "v5", &["past"]));
        }

        #[test]
        fn undoes_a_godan_past_in_nu() {
            assert!(yields("死んだ", "死ぬ", "v5", &["past"]));
        }

        #[test]
        fn undoes_a_godan_past_in_bu() {
            assert!(yields("遊んだ", "遊ぶ", "v5", &["past"]));
        }

        #[test]
        fn undoes_a_godan_past_in_mu() {
            assert!(yields("読んだ", "読む", "v5", &["past"]));
        }

        #[test]
        fn undoes_the_past_of_iku() {
            assert!(yields("行った", "行く", "v5", &["past"]));
        }

        #[test]
        fn undoes_the_past_of_iku_in_kana() {
            assert!(yields("いった", "いく", "v5", &["past"]));
        }

        #[test]
        fn undoes_the_past_of_tou() {
            assert!(yields("問うた", "問う", "v5", &["past"]));
        }

        #[test]
        fn undoes_the_past_of_suru() {
            assert!(yields("勉強した", "勉強する", "vs", &["past"]));
        }

        #[test]
        fn undoes_the_past_of_kuru_in_kanji() {
            assert!(yields("来た", "来る", "vk", &["past"]));
        }

        #[test]
        fn undoes_the_past_of_kuru_in_kana() {
            assert!(yields("きた", "くる", "vk", &["past"]));
        }

        #[test]
        fn undoes_the_past_of_a_zuru_verb() {
            assert!(yields("論じた", "論ずる", "vz", &["past"]));
        }
    }

    mod te_form {
        use super::yields;

        #[test]
        fn undoes_an_ichidan_te_form() {
            assert!(yields("食べて", "食べる", "v1", &["te-form"]));
        }

        #[test]
        fn undoes_a_godan_te_form_in_mu() {
            assert!(yields("読んで", "読む", "v5", &["te-form"]));
        }

        #[test]
        fn undoes_the_te_form_of_iku() {
            assert!(yields("行って", "行く", "v5", &["te-form"]));
        }

        #[test]
        fn undoes_the_te_form_of_kou() {
            assert!(yields("請うて", "請う", "v5", &["te-form"]));
        }
    }

    mod conditional {
        use super::yields;

        #[test]
        fn undoes_an_ichidan_conditional() {
            assert!(yields("食べたら", "食べる", "v1", &["conditional"]));
        }

        #[test]
        fn undoes_a_voiced_godan_conditional() {
            assert!(yields("泳いだら", "泳ぐ", "v5", &["conditional"]));
        }
    }

    mod representative {
        use super::yields;

        #[test]
        fn undoes_an_ichidan_representative() {
            assert!(yields("見たり", "見る", "v1", &["representative"]));
        }

        #[test]
        fn undoes_a_voiced_godan_representative() {
            assert!(yields("飲んだり", "飲む", "v5", &["representative"]));
        }
    }
}

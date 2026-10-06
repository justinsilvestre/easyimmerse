//! Suffixes on the euphonic stem: past た, te-form て, conditional たら, representative たり,
//! and ちゃ, the fused form of て and the particle は.

use crate::deinflection::japanese::rule::Rule;
use crate::deinflection::japanese::word_class::WordClasses as C;

/// The auxiliary た with its forms たら (also before ば) and たろう (also たろ and たろっ), the particles て and たり,
/// and ちゃ for ては, voiced to だ, だら, だろう, で, だり and じゃ after the voiced euphonic stems.
/// The euphonic stem cannot stand alone, so these must be undone for lookup to reach the verb.
/// ちゃ ends a word, so it is undone only as the outermost layer.
///
/// Sources: 規程集 下, 資料「要注意語」助動詞 タ, p. (32), and 助詞 テ, p. (27);
/// 規程集 下, 最小単位認定規程 1.1, p. 2 (fused forms are kept whole);
/// UniDic 2025.12, 助動詞-タ (仮定形 たら, 意志推量形 たろう, たろ and たろっ),
/// and 助詞-接続助詞 て with the spellings ちゃ and じゃ.
pub const PERFECTIVE: &[Rule] = &[
    voiceless("た", &["past"]),
    voiced("だ", &["past"]),
    voiceless("て", &["te-form"]),
    voiced("で", &["te-form"]),
    voiceless("たら", &["conditional"]),
    voiced("だら", &["conditional"]),
    voiceless("たらば", &["conditional"]),
    voiced("だらば", &["conditional"]),
    voiceless("たろう", &["volitional", "past"]),
    voiced("だろう", &["volitional", "past"]),
    voiceless("たろ", &["volitional", "past"]),
    voiced("だろ", &["volitional", "past"]),
    voiceless("たろっ", &["volitional", "past"]),
    voiced("だろっ", &["volitional", "past"]),
    voiceless("たり", &["representative"]),
    voiced("だり", &["representative"]),
    voiceless("ちゃ", &["te-wa"]),
    voiced("じゃ", &["te-wa"]),
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

    mod past_volitional {
        use super::yields;

        #[test]
        fn undoes_tarou() {
            assert!(yields("書いたろう", "書く", "v5", &["volitional", "past"]));
        }
    }

    mod te_wa {
        use super::yields;

        #[test]
        fn undoes_cha() {
            assert!(yields("見ちゃ", "見る", "v1", &["te-wa"]));
        }

        #[test]
        fn undoes_a_voiced_ja() {
            assert!(yields("飲んじゃ", "飲む", "v5", &["te-wa"]));
        }

        #[test]
        fn undoes_cha_after_a_causative() {
            assert!(yields("書かせちゃ", "書く", "v5", &["te-wa", "causative"]));
        }

        #[test]
        fn does_not_undo_cha_inside_a_longer_word() {
            assert!(!yields("見ちゃった", "見る", "v1", &["past", "te-wa"]));
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

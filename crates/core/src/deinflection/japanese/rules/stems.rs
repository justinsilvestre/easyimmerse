//! Rules that turn a verb stem back into its dictionary form. They undo no inflection of their own:
//! the suffix rules that produce a stem name the inflection.

use super::{godan, ichidan, kuru, sharing, suru, zuru};
use crate::deinflection::japanese::rule::{Rule, Stem};
use crate::deinflection::japanese::word_class::WordClasses as C;

/// A verb's continuative stem or an i-adjective's stem taken as a word of its own,
/// as 食べ is in 食べやすい and 高 is in 高すぎる.
///
/// Sources: UniDic manual §5.3, p. 19 (連用形 and 語幹 are conjugated forms);
/// 規程集 下, 短単位認定規程 規定5, p. 33 (an attached element such as にくい is a short unit of its own).
pub const BARE: &[Rule] = &[
    Rule::replace("", "")
        .to(C::CONTINUATIVE)
        .named(&["continuative"])
        .stem(Stem::NonEmpty),
    Rule::replace("", "い")
        .to(C::BARE_ADJECTIVE)
        .named(&["stem"])
        .stem(Stem::KanjiOrHiragana),
];

/// Continuative stems (連用形-一般): the godan い row, the bare ichidan stem, き for 来る, し for する, じ for ずる,
/// and the stems in い (連用形-イ音便) of the honorific verbs いらっしゃる, おっしゃる, くださる, なさる and ござる.
///
/// Sources: UniDic manual §5.2.1, p. 17 (五段-ラ行-アル); UniDic 2025.12, 連用形-一般 and 連用形-イ音便 of each 活用型.
pub const CONTINUATIVE: &[Rule] = &sharing(
    [
        godan("き", "く"),
        godan("ぎ", "ぐ"),
        godan("し", "す"),
        godan("ち", "つ"),
        godan("に", "ぬ"),
        godan("び", "ぶ"),
        godan("み", "む"),
        godan("り", "る"),
        godan("い", "う"),
        ichidan("", "る"),
        kuru("き", "くる"),
        kuru("来", "来る"),
        suru("し", "する"),
        zuru("じ", "ずる"),
        godan("いらっしゃい", "いらっしゃる"),
        godan("おっしゃい", "おっしゃる"),
        godan("仰い", "仰る"),
        godan("ください", "くださる"),
        godan("下さい", "下さる"),
        godan("なさい", "なさる"),
        godan("為さい", "為さる"),
        godan("ござい", "ござる"),
        godan("御座い", "御座る"),
    ],
    C::CONTINUATIVE,
    &[],
);

/// Irrealis stems (未然形) before the negative suffixes: the godan あ row (わ for verbs in う),
/// the bare ichidan stem, こ for 来る, し and せ for する, and じ and ぜ for ずる.
/// Godan verbs in る, ichidan verbs in りる, くれる, れる and られる may take ん (未然形-撥音便):
/// 分かんない, 足んない, くんない, 書かんない and 信じらんない.
///
/// Sources: UniDic manual §5.3, pp. 19–20 (未然形-セ, 未然形-撥音便); UniDic 2025.12, 未然形-一般 of each 活用型
/// and 未然形-撥音便 of 五段-ラ行 verbs, 上一段-ラ行 verbs, くれる, れる and られる.
pub const IRREALIS: &[Rule] = &sharing(
    [
        godan("か", "く"),
        godan("が", "ぐ"),
        godan("さ", "す"),
        godan("た", "つ"),
        godan("な", "ぬ"),
        godan("ば", "ぶ"),
        godan("ま", "む"),
        godan("ら", "る"),
        godan("わ", "う"),
        godan("ん", "る"),
        ichidan("", "る"),
        Rule::replace("ん", "りる").to(C::V1),
        Rule::replace("くん", "くれる").to(C::V1),
        kuru("こ", "くる"),
        kuru("来", "来る"),
        suru("し", "する"),
        suru("せ", "する"),
        zuru("じ", "ずる"),
        zuru("ぜ", "ずる"),
        Rule::replace("らん", "られ").to(C::IRREALIS),
        Rule::replace("ん", "れ").to(C::IRREALIS).stem(Stem::ARow),
    ],
    C::IRREALIS,
    &[],
);

/// Euphonic stems (連用形 音便) before た, て, たら and たり, or their voiced だ, で, だら and だり.
/// Godan verbs in く take い, in ぐ take voiced い, in す take し, in う, つ and る take っ,
/// and in ぬ, ぶ and む take voiced ん. 行く and its spellings 逝く and 往く take っ, as does the auxiliary てく,
/// which has no form in い.
/// Ichidan verbs use the bare stem, 来る uses き, する uses し and ずる uses じ.
///
/// Sources: UniDic manual §5.2.1, p. 17 (五段-カ行-イク); UniDic 2025.12, 連用形-イ音便, -促音便 and -撥音便
/// of each 活用型, including those of 行く, 逝く, 往く and てく.
pub const ONBIN_TA: &[Rule] = &sharing(
    [
        godan("い", "く").stem(Stem::NotTe),
        godan("し", "す"),
        godan("っ", "う"),
        godan("っ", "つ"),
        godan("っ", "る"),
        godan("いっ", "いく"),
        godan("行っ", "行く"),
        godan("逝っ", "逝く"),
        godan("往っ", "往く"),
        godan("てっ", "てく"),
        godan("でっ", "でく"),
        ichidan("", "る"),
        kuru("き", "くる"),
        kuru("来", "来る"),
        suru("し", "する"),
        zuru("じ", "ずる"),
    ],
    C::ONBIN_TA,
    &[],
);

/// The voiced euphonic stems, from the same sources as [`ONBIN_TA`].
pub const ONBIN_DA: &[Rule] = &sharing(
    [
        godan("い", "ぐ"),
        godan("ん", "ぬ"),
        godan("ん", "ぶ"),
        godan("ん", "む"),
    ],
    C::ONBIN_DA,
    &[],
);

/// The u-sound euphonic stem (連用形-ウ音便) of godan verbs in う, before た and て.
/// It keeps the dictionary form, as in 問うた, or moves a preceding あ-row kana to the お row, as in もろうた for もらう.
/// Standard Japanese uses it for a few literary verbs such as 問う and 請う; western dialects use it for every such verb.
///
/// Source: UniDic 2025.12, 連用形-ウ音便 of 五段-ワア行 (問う, 買う, 思う; もろう for 貰う).
pub const U_ONBIN: &[Rule] = &sharing(
    [
        godan("う", "う"),
        godan("おう", "あう"),
        godan("こう", "かう"),
        godan("ごう", "がう"),
        godan("そう", "さう"),
        godan("とう", "たう"),
        godan("のう", "なう"),
        godan("ぼう", "ばう"),
        godan("もう", "まう"),
        godan("ろう", "らう"),
    ],
    C::ONBIN_TA,
    &[],
);

#[cfg(test)]
mod tests {
    use crate::deinflection::japanese::test_support::yields;

    mod bare {
        use super::yields;

        #[test]
        fn reports_an_ichidan_continuative_stem() {
            assert!(yields("食べ", "食べる", "v1", &["continuative"]));
        }

        #[test]
        fn reports_a_godan_continuative_stem() {
            assert!(yields("書き", "書く", "v5", &["continuative"]));
        }

        #[test]
        fn reports_shi_as_the_continuative_of_suru() {
            assert!(yields("し", "する", "vs", &["continuative"]));
        }

        #[test]
        fn reports_ki_as_the_continuative_of_kuru() {
            assert!(yields("き", "くる", "vk", &["continuative"]));
        }

        #[test]
        fn reports_the_honorific_continuative_in_i() {
            assert!(yields(
                "いらっしゃい",
                "いらっしゃる",
                "v5",
                &["continuative"]
            ));
        }

        #[test]
        fn reports_an_adjective_stem() {
            assert!(yields("高", "高い", "adj-i", &["stem"]));
        }

        #[test]
        fn reads_yuku_as_a_godan_verb() {
            assert!(yields("ゆき", "ゆく", "v5", &["continuative"]));
        }
    }

    mod irrealis {
        use super::yields;

        #[test]
        fn undoes_the_n_of_a_ru_verb() {
            assert!(yields("分かんない", "分かる", "v5", &["negative"]));
        }

        #[test]
        fn undoes_the_n_of_an_ichidan_verb_in_riru() {
            assert!(yields("足んない", "足りる", "v1", &["negative"]));
        }

        #[test]
        fn undoes_the_n_of_kureru() {
            assert!(yields("くんない", "くれる", "v1", &["negative"]));
        }

        #[test]
        fn undoes_the_ran_of_rareru() {
            assert!(yields(
                "信じらんない",
                "信じる",
                "v1",
                &["negative", "potential"]
            ));
        }
    }

    mod euphonic {
        use super::yields;

        #[test]
        fn undoes_the_euphonic_stem_of_iku_in_another_spelling() {
            assert!(yields("逝った", "逝く", "v5", &["past"]));
        }

        #[test]
        fn does_not_read_te_i_as_the_euphonic_stem_of_teku() {
            assert!(!yields("書いていた", "書く", "v5", &["past", "continuing"]));
        }

        #[test]
        fn undoes_the_u_sound_stem_of_tou() {
            assert!(yields("問うた", "問う", "v5", &["past"]));
        }

        #[test]
        fn undoes_the_u_sound_stem_in_a_western_past() {
            assert!(yields("買うた", "買う", "v5", &["past"]));
        }

        #[test]
        fn undoes_the_u_sound_stem_in_a_western_te_form() {
            assert!(yields("買うて", "買う", "v5", &["te-form"]));
        }

        #[test]
        fn undoes_the_u_sound_stem_with_a_shifted_vowel() {
            assert!(yields("もろうた", "もらう", "v5", &["past"]));
        }

        #[test]
        fn undoes_the_u_sound_stem_before_tara() {
            assert!(yields("会うたら", "会う", "v5", &["conditional"]));
        }

        #[test]
        fn undoes_the_u_sound_stem_before_tari() {
            assert!(yields("笑うたり", "笑う", "v5", &["representative"]));
        }
    }
}

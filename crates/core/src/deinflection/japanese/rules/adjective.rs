//! I-adjective inflections, which also undo the auxiliaries that inflect like i-adjectives, such as ない and たい.

use crate::deinflection::japanese::rule::{Rule, Stem};
use crate::deinflection::japanese::word_class::WordClasses as C;

/// The endings that replace the final い of an i-adjective: past かった, conditional かったら, representative かったり,
/// provisional ければ with its fused forms けりゃ and きゃ, and volitional かろう, かろ or かろっ.
/// いい inflects from よい, so its forms such as よかった trace back to よい.
///
/// Sources: UniDic manual §5.3, p. 20 (仮定形-融合); UniDic 2025.12, 形容詞 (連用形-促音便 かっ, 仮定形 けれ,
/// 仮定形-融合 けりゃ and きゃ, 意志推量形 かろう, かろ and かろっ; 良い written いい and よい),
/// with た (助動詞-タ) and ば after them.
pub const ADJECTIVE: &[Rule] = &[
    adjective("かった", &["past"]),
    adjective("かったら", &["conditional"]),
    adjective("かったり", &["representative"]),
    adjective("ければ", &["provisional"]),
    adjective("けりゃ", &["provisional"]),
    adjective("きゃ", &["provisional"]),
    adjective("かろう", &["volitional"]),
    adjective("かろ", &["volitional"]),
    adjective("かろっ", &["volitional"]),
];

/// What follows the continuative form (連用形) of an i-adjective: nothing (the adverbial use), て, ない, or ちゃ for ては.
///
/// Sources: 規程集 下, 資料「要注意語」助詞 テ, p. (27); UniDic 2025.12, 助動詞 くない (助動詞-ナイ),
/// and 助詞-接続助詞 て with the spelling ちゃ.
pub const ADJECTIVE_CONTINUATIVE_SUFFIXES: &[Rule] = &[
    Rule::replace("", "")
        .to(C::ADJECTIVE_CONTINUATIVE)
        .named(&["adverbial"])
        .stem(Stem::NonEmpty),
    Rule::replace("て", "")
        .to(C::ADJECTIVE_CONTINUATIVE)
        .named(&["te-form"]),
    Rule::replace("ちゃ", "")
        .to(C::ADJECTIVE_CONTINUATIVE)
        .named(&["te-wa"]),
    Rule::replace("ない", "")
        .from(C::ADJ_I)
        .to(C::ADJECTIVE_CONTINUATIVE)
        .named(&["negative"]),
];

/// The continuative forms of an i-adjective: く, くっ before て, and the u-sound form (連用形-ウ音便).
/// The u-sound form replaces く with う and fuses it with the vowel before: 高う, 美しゅう for 美しい,
/// たこう for たかい, ありがとう for ありがたい and すごう for すごい.
/// It is standard before ございます and common in western dialects.
///
/// Sources: UniDic 2025.12, 形容詞 連用形-一般 (く, くっ) and 連用形-ウ音便 (高う, 美しゅう, うるそう, やぼう, すごう, よう),
/// and たい in 連用形-ウ音便 とう.
pub const ADJECTIVE_CONTINUATIVE: &[Rule] = &[
    continuative("く", "い").stem(Stem::NonEmpty),
    continuative("くっ", "い").stem(Stem::NonEmpty),
    continuative("う", "い").stem(Stem::Kanji),
    continuative("しゅう", "しい"),
    continuative("きゅう", "きい"),
    continuative("じゅう", "じい"),
    continuative("こう", "かい"),
    continuative("ごう", "がい"),
    continuative("そう", "さい"),
    continuative("とう", "たい"),
    continuative("のう", "ない"),
    continuative("ぼう", "ばい"),
    continuative("もう", "まい"),
    continuative("ろう", "らい"),
    continuative("よう", "やい"),
    continuative("よう", "よい").stem(Stem::Any),
    continuative("おう", "おい"),
    continuative("こう", "こい"),
    continuative("ごう", "ごい"),
    continuative("そう", "そい"),
    continuative("とう", "とい"),
    continuative("どう", "どい"),
    continuative("のう", "のい"),
    continuative("ぼう", "ぼい"),
    continuative("もう", "もい"),
    continuative("ろう", "ろい"),
];

/// The stem of an i-adjective before appearance そう.
///
/// Source: UniDic manual §5.3, p. 19 (語幹).
pub const ADJECTIVE_STEM: &[Rule] = &[Rule::replace("", "い")
    .from(C::ADJECTIVE_STEM)
    .to(C::ADJ_I)
    .stem(Stem::KanjiOrHiragana)];

const fn adjective(inflected: &'static str, inflections: &'static [&'static str]) -> Rule {
    Rule::replace(inflected, "い")
        .to(C::ADJ_I)
        .named(inflections)
        .stem(Stem::NonEmpty)
}

const fn continuative(inflected: &'static str, base: &'static str) -> Rule {
    Rule::replace(inflected, base)
        .from(C::ADJECTIVE_CONTINUATIVE)
        .to(C::ADJ_I)
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
    fn undoes_the_te_form_with_a_small_tsu() {
        assert!(yields("高くって", "高い", "adj-i", &["te-form"]));
    }

    #[test]
    fn undoes_te_wa_after_an_adjective() {
        assert!(yields("高くちゃ", "高い", "adj-i", &["te-wa"]));
    }

    #[test]
    fn undoes_the_provisional() {
        assert!(yields("高ければ", "高い", "adj-i", &["provisional"]));
    }

    #[test]
    fn undoes_the_fused_provisional_in_kerya() {
        assert!(yields("安けりゃ", "安い", "adj-i", &["provisional"]));
    }

    #[test]
    fn undoes_the_fused_provisional_in_kya() {
        assert!(yields("安きゃ", "安い", "adj-i", &["provisional"]));
    }

    #[test]
    fn undoes_the_conditional() {
        assert!(yields("高かったら", "高い", "adj-i", &["conditional"]));
    }

    #[test]
    fn undoes_the_representative() {
        assert!(yields(
            "忙しかったり",
            "忙しい",
            "adj-i",
            &["representative"]
        ));
    }

    #[test]
    fn undoes_the_volitional() {
        assert!(yields("高かろう", "高い", "adj-i", &["volitional"]));
    }

    #[test]
    fn traces_the_past_of_ii_to_yoi() {
        assert!(yields("よかった", "よい", "adj-i", &["past"]));
    }

    #[test]
    fn leaves_the_nominal_sa_to_lookup() {
        assert!(!yields("悲しさ", "悲しい", "adj-i", &["nominalized"]));
    }

    #[test]
    fn does_not_reduce_an_ending_to_a_bare_i() {
        assert!(!yields("かった", "い", "adj-i", &["past"]));
    }

    mod u_sound {
        use super::yields;

        #[test]
        fn undoes_u_after_a_kanji_stem() {
            assert!(yields("早う", "早い", "adj-i", &["adverbial"]));
        }

        #[test]
        fn undoes_yuu_for_shii() {
            assert!(yields("美しゅう", "美しい", "adj-i", &["adverbial"]));
        }

        #[test]
        fn undoes_the_te_form() {
            assert!(yields("嬉しゅうて", "嬉しい", "adj-i", &["te-form"]));
        }

        #[test]
        fn undoes_a_fused_a_row_vowel() {
            assert!(yields("たこうて", "たかい", "adj-i", &["te-form"]));
        }

        #[test]
        fn undoes_the_negative() {
            assert!(yields("寒うない", "寒い", "adj-i", &["negative"]));
        }

        #[test]
        fn undoes_the_negative_of_yoi() {
            assert!(yields("ようない", "よい", "adj-i", &["negative"]));
        }

        #[test]
        fn undoes_a_fused_o_row_vowel() {
            assert!(yields("すごう", "すごい", "adj-i", &["adverbial"]));
        }

        #[test]
        fn undoes_arigatou() {
            assert!(yields("ありがとう", "ありがたい", "adj-i", &["adverbial"]));
        }
    }
}

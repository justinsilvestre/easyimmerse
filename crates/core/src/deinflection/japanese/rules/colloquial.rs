//! Colloquial sound changes in the dictionary form itself: final る becoming ん, and the fusion of an adjective's final vowels.

use super::{godan, ichidan, kuru, sharing, suru, zuru};
use crate::deinflection::japanese::rule::{Rule, Stem};
use crate::deinflection::japanese::word_class::WordClasses as C;

/// The dictionary form with its final る turned into ん before な or の, as in 触んな, 食べんの and 座んなさい,
/// including られる as らん (食べらんの).
///
/// Sources: UniDic manual §5.3, p. 20 (終止形-撥音便 before the particle な, 連体形-撥音便 before の);
/// UniDic 2025.12, 終止形-撥音便, 連体形-撥音便 and 連用形-撥音便 of 五段-ラ行, 上一段, 下一段, カ行変格 and サ行変格 verbs,
/// and 連体形-撥音便 らん of られる.
pub const CONTRACTED: &[Rule] = &sharing(
    [
        godan("ん", "る"),
        ichidan("ん", "る"),
        kuru("くん", "くる"),
        kuru("来ん", "来る"),
        suru("すん", "する"),
        zuru("ずん", "ずる"),
        Rule::replace("らん", "られる").to(C::V1),
    ],
    C::INPUT,
    &["colloquial"],
);

/// An i-adjective whose final two vowels fuse into a long え or い: やばい becomes やべえ, すごい すげえ,
/// さむい さみい, 美しい 美しえ and 高い 高え, and よい becomes ええ. ない and たい change the same way,
/// as in 知らねえ and 行きてえ.
/// The long vowel may also be written ー.
///
/// Source: UniDic 2025.12, 形容詞 終止形-一般 and 連体形-一般 (やべえ and やべー for やばい, すげえ for すごい,
/// うるせえ for うるさい, 美しえ for 美しい, 高え for 高い, ええ for 良い), 助動詞-ナイ (ねえ) and 助動詞-タイ (てえ).
pub const VOWEL_FUSION: &[Rule] = &[
    fused("え", "い").stem(Stem::Kanji),
    fused("ええ", "よい").stem(Stem::Empty),
    fused("しえ", "しい"),
    fused("きえ", "きい"),
    fused("べえ", "ばい"),
    fused("せえ", "さい"),
    fused("てえ", "たい"),
    fused("けえ", "かい"),
    fused("ねえ", "ない"),
    fused("れえ", "らい"),
    fused("めえ", "まい"),
    fused("げえ", "がい"),
    fused("ぺえ", "ぱい"),
    fused("げえ", "ごい"),
    fused("でえ", "どい"),
    fused("れえ", "ろい"),
    fused("せえ", "そい"),
    fused("べー", "ばい"),
    fused("せー", "さい"),
    fused("てー", "たい"),
    fused("けー", "かい"),
    fused("ねー", "ない"),
    fused("れー", "らい"),
    fused("めー", "まい"),
    fused("げー", "がい"),
    fused("ぺー", "ぱい"),
    fused("げー", "ごい"),
    fused("でー", "どい"),
    fused("れー", "ろい"),
    fused("せー", "そい"),
    fused("みい", "むい"),
    fused("りい", "るい"),
    fused("ちい", "つい"),
    fused("みー", "むい"),
    fused("りー", "るい"),
    fused("ちー", "つい"),
];

const fn fused(inflected: &'static str, base: &'static str) -> Rule {
    Rule::replace(inflected, base)
        .to(C::ADJ_I)
        .named(&["colloquial"])
        .stem(Stem::NonEmpty)
}

#[cfg(test)]
mod tests {
    use crate::deinflection::japanese::test_support::yields;

    #[test]
    fn undoes_n_for_ru_before_the_prohibitive_na() {
        assert!(yields("触ん", "触る", "v5", &["colloquial"]));
    }

    #[test]
    fn undoes_n_for_ru_after_an_ichidan_stem() {
        assert!(yields("見ん", "見る", "v1", &["colloquial"]));
    }

    #[test]
    fn undoes_sun_as_suru() {
        assert!(yields("すん", "する", "vs", &["colloquial"]));
    }

    #[test]
    fn undoes_a_fused_ai() {
        assert!(yields("やべえ", "やばい", "adj-i", &["colloquial"]));
    }

    #[test]
    fn undoes_a_fused_oi() {
        assert!(yields("すげえ", "すごい", "adj-i", &["colloquial"]));
    }

    #[test]
    fn undoes_a_fused_ui() {
        assert!(yields("さみい", "さむい", "adj-i", &["colloquial"]));
    }

    #[test]
    fn undoes_a_fusion_written_with_a_long_vowel_mark() {
        assert!(yields("やべー", "やばい", "adj-i", &["colloquial"]));
    }

    #[test]
    fn undoes_a_fusion_after_a_kanji_stem() {
        assert!(yields("高え", "高い", "adj-i", &["colloquial"]));
    }

    #[test]
    fn undoes_ee_as_yoi() {
        assert!(yields("ええ", "よい", "adj-i", &["colloquial"]));
    }

    #[test]
    fn undoes_a_fused_nai() {
        assert!(yields(
            "知らねえ",
            "知る",
            "v5",
            &["colloquial", "negative"]
        ));
    }

    #[test]
    fn undoes_a_fused_tai() {
        assert!(yields(
            "行きてえ",
            "行く",
            "v5",
            &["colloquial", "desiderative"]
        ));
    }
}

//! The volitional form (意志推量形) and the negative volitional auxiliary まい.

use super::{godan, ichidan, kuru, sharing, suru, zuru};
use crate::deinflection::japanese::rule::Rule;
use crate::deinflection::japanese::word_class::WordClasses as C;

/// Godan verbs shift their final kana to the お row and add う. Ichidan verbs replace る with よう,
/// 来る becomes こよう, する becomes しよう and ずる becomes じよう.
/// UniDic treats these as a conjugated form rather than as the auxiliary う or よう,
/// and includes the short forms that drop the final う (行こ) or replace it with っ (行こっか).
///
/// Sources: UniDic manual §4.1, p. 11, and §5.3, p. 19 (意志推量形); UniDic 2025.12, 意志推量形 of each 活用型.
pub const VOLITIONAL: &[Rule] = &sharing(
    [
        godan("こう", "く"),
        godan("ごう", "ぐ"),
        godan("そう", "す"),
        godan("とう", "つ"),
        godan("のう", "ぬ"),
        godan("ぼう", "ぶ"),
        godan("もう", "む"),
        godan("ろう", "る"),
        godan("おう", "う"),
        ichidan("よう", "る"),
        kuru("こよう", "くる"),
        kuru("来よう", "来る"),
        suru("しよう", "する"),
        zuru("じよう", "ずる"),
    ],
    C::INPUT,
    &["volitional"],
);

/// The short volitional forms of [`VOLITIONAL`], from the same sources.
pub const SHORT_VOLITIONAL: &[Rule] = &sharing(
    [
        godan("こ", "く"),
        godan("ご", "ぐ"),
        godan("そ", "す"),
        godan("と", "つ"),
        godan("の", "ぬ"),
        godan("ぼ", "ぶ"),
        godan("も", "む"),
        godan("ろ", "る"),
        godan("お", "う"),
        godan("こっ", "く"),
        godan("ごっ", "ぐ"),
        godan("そっ", "す"),
        godan("とっ", "つ"),
        godan("のっ", "ぬ"),
        godan("ぼっ", "ぶ"),
        godan("もっ", "む"),
        godan("ろっ", "る"),
        godan("おっ", "う"),
        ichidan("よ", "る"),
        ichidan("よっ", "る"),
        kuru("こよ", "くる"),
        kuru("こよっ", "くる"),
        kuru("来よ", "来る"),
        kuru("来よっ", "来る"),
        suru("しよ", "する"),
        suru("しよっ", "する"),
        zuru("じよ", "ずる"),
        zuru("じよっ", "ずる"),
    ],
    C::INPUT,
    &["volitional"],
);

/// まい ("will not, probably not") follows the dictionary form of a godan verb and the irrealis stem of other verbs.
/// It is also found after the dictionary form of other verbs (食べるまい, するまい).
///
/// Sources: 規程集 下, 資料「要注意語」助動詞 マイ, p. (35) (接続: 五段の終止形, 五段以外には未然形);
/// UniDic 2025.12, 助動詞-マイ, and する in 終止形-一般 す.
pub const NEGATIVE_VOLITIONAL: &[Rule] = &sharing(
    [
        Rule::replace("まい", "").to(C::V5.or(C::V1).or(C::VK).or(C::VS).or(C::VZ)),
        ichidan("まい", "る"),
        kuru("こまい", "くる"),
        kuru("来まい", "来る"),
        suru("しまい", "する"),
        suru("すまい", "する"),
    ],
    C::INPUT,
    &["negative volitional"],
);

#[cfg(test)]
mod tests {
    use crate::deinflection::japanese::test_support::yields;

    #[test]
    fn undoes_a_godan_volitional() {
        assert!(yields("書こう", "書く", "v5", &["volitional"]));
    }

    #[test]
    fn undoes_a_godan_volitional_in_u() {
        assert!(yields("買おう", "買う", "v5", &["volitional"]));
    }

    #[test]
    fn undoes_an_ichidan_volitional() {
        assert!(yields("食べよう", "食べる", "v1", &["volitional"]));
    }

    #[test]
    fn undoes_the_volitional_of_kuru_in_kanji() {
        assert!(yields("来よう", "来る", "vk", &["volitional"]));
    }

    #[test]
    fn undoes_the_volitional_of_kuru_in_kana() {
        assert!(yields("こよう", "くる", "vk", &["volitional"]));
    }

    #[test]
    fn undoes_the_volitional_of_suru() {
        assert!(yields("しよう", "する", "vs", &["volitional"]));
    }

    #[test]
    fn undoes_a_volitional_without_its_final_u() {
        assert!(yields("行こ", "行く", "v5", &["volitional"]));
    }

    #[test]
    fn undoes_a_volitional_ending_in_a_small_tsu() {
        assert!(yields("行こっ", "行く", "v5", &["volitional"]));
    }

    #[test]
    fn undoes_a_short_volitional_of_suru() {
        assert!(yields("しよっ", "する", "vs", &["volitional"]));
    }

    #[test]
    fn undoes_mai_after_a_godan_dictionary_form() {
        assert!(yields("行くまい", "行く", "v5", &["negative volitional"]));
    }

    #[test]
    fn undoes_mai_after_an_ichidan_stem() {
        assert!(yields("見まい", "見る", "v1", &["negative volitional"]));
    }

    #[test]
    fn undoes_mai_after_the_irrealis_of_suru() {
        assert!(yields("しまい", "する", "vs", &["negative volitional"]));
    }

    #[test]
    fn undoes_the_volitional_of_a_zuru_verb() {
        assert!(yields("論じよう", "論ずる", "vz", &["volitional"]));
    }
}

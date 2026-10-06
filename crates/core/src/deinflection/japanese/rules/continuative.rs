//! Auxiliaries on the continuative stem of a verb, and appearance そう, which also follows an adjective stem.

use crate::deinflection::japanese::rule::{Rule, Stem};
use crate::deinflection::japanese::word_class::WordClasses as C;

/// Desiderative たい, which inflects as an i-adjective; たがる, "show signs of wanting to", which inflects as a godan verb;
/// and the contemptuous やがる, which inflects as a godan verb.
///
/// Sources: 規程集 下, 資料「要注意語」助動詞 タイ and タガル, p. (33) (接続: 連用形);
/// UniDic 2025.12, 助動詞 たい (助動詞-タイ), たがる and やがる (五段-ラ行).
/// The 規程集 lists やがる among the suffixes (資料「要注意語」接尾的要素 ヤガル, p. (53)); UniDic 2025.12 classes it as an auxiliary.
pub const CONTINUATIVE_AUXILIARIES: &[Rule] = &[
    Rule::replace("たい", "")
        .from(C::ADJ_I)
        .to(C::CONTINUATIVE)
        .named(&["desiderative"]),
    Rule::replace("たがる", "")
        .from(C::V5)
        .to(C::CONTINUATIVE)
        .named(&["third-person desiderative"]),
    Rule::replace("やがる", "")
        .from(C::V5)
        .to(C::CONTINUATIVE)
        .named(&["contemptuous"]),
];

/// The western honorific はる, which follows the irrealis or the continuative stem (行かはる, 行きはる)
/// and inflects as a godan verb.
///
/// Sources: 規程集 下, 資料「要注意語」助動詞 ハル, p. (35) (接続: 未然形, 連用形); UniDic 2025.12, はる (五段-ラ行).
pub const WESTERN_HONORIFIC: &[Rule] = &[Rule::replace("はる", "")
    .from(C::V5)
    .to(C::IRREALIS.or(C::CONTINUATIVE))
    .named(&["honorific"])
    .stem(Stem::NonEmpty)];

/// そう ("looks like") after a verb's continuative stem or an adjective's stem.
/// いい and ない take さ before it (語幹-サ): よさそう and なさそう.
///
/// School grammar counts そうだ as an auxiliary. UniDic instead splits off そう as the stem of a nominal auxiliary,
/// which would leave the bare stem to lookup.
///
/// Sources: 日本大百科全書 (ニッポニカ) 助動詞 (青木伶子) and 百科事典マイペディア 助動詞 on Kotobank (様態 そうだ);
/// UniDic manual §5.3, p. 19 (語幹-サ); 規程集 下, 資料「要注意語」接尾的要素 ソウ (ID 72), p. (45).
pub const APPEARANCE: &[Rule] = &[
    Rule::replace("そう", "")
        .to(C::CONTINUATIVE.or(C::ADJECTIVE_STEM))
        .named(&["appearance"]),
    Rule::replace("よさそう", "よい")
        .to(C::ADJ_I)
        .named(&["appearance"]),
    Rule::replace("良さそう", "良い")
        .to(C::ADJ_I)
        .named(&["appearance"]),
    Rule::replace("無さそう", "無い")
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

        #[test]
        fn undoes_tagaru() {
            assert!(yields(
                "行きたがる",
                "行く",
                "v5",
                &["third-person desiderative"]
            ));
        }

        #[test]
        fn undoes_a_past_tagaru() {
            assert!(yields(
                "見たがった",
                "見る",
                "v1",
                &["past", "third-person desiderative"]
            ));
        }
    }

    mod contemptuous {
        use super::yields;

        #[test]
        fn undoes_yagaru() {
            assert!(yields("言いやがる", "言う", "v5", &["contemptuous"]));
        }

        #[test]
        fn undoes_a_past_yagaru() {
            assert!(yields(
                "来やがった",
                "来る",
                "vk",
                &["past", "contemptuous"]
            ));
        }
    }

    mod western_honorific {
        use super::yields;

        #[test]
        fn undoes_haru_after_the_irrealis() {
            assert!(yields("行かはる", "行く", "v5", &["honorific"]));
        }

        #[test]
        fn undoes_haru_after_the_continuative() {
            assert!(yields("行きはった", "行く", "v5", &["past", "honorific"]));
        }
    }

    mod appearance {
        use super::yields;

        #[test]
        fn undoes_sou_after_a_verb() {
            assert!(yields("降りそう", "降る", "v5", &["appearance"]));
        }

        #[test]
        fn undoes_sou_after_an_ichidan_verb() {
            assert!(yields("食べそう", "食べる", "v1", &["appearance"]));
        }

        #[test]
        fn undoes_sou_after_suru() {
            assert!(yields("しそう", "する", "vs", &["appearance"]));
        }

        #[test]
        fn undoes_sou_after_an_adjective() {
            assert!(yields("高そう", "高い", "adj-i", &["appearance"]));
        }

        #[test]
        fn undoes_sou_after_a_potential() {
            assert!(yields(
                "読めそう",
                "読む",
                "v5",
                &["appearance", "potential"]
            ));
        }

        #[test]
        fn traces_yosasou_to_yoi() {
            assert!(yields("よさそう", "よい", "adj-i", &["appearance"]));
        }

        #[test]
        fn traces_nasasou_to_nai() {
            assert!(yields("なさそう", "ない", "adj-i", &["appearance"]));
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

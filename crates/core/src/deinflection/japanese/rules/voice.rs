//! Potential, passive and causative: suffixes that form new verbs, which inflect further.

use super::{godan, ichidan, kuru, sharing, suru, zuru};
use crate::deinflection::japanese::rule::{Rule, Stem};
use crate::deinflection::japanese::word_class::WordClasses as C;

/// Godan verbs shift their final kana to the え row and add る. Ichidan verbs and 来る add られる,
/// or colloquially れる. ずる verbs use their passive forms. できる is a verb of its own (UniDic lemma 出来る),
/// not a form of する, so it is left to lookup.
/// A potential verb inflects as an ichidan verb.
///
/// UniDic gives a godan potential such as 書ける, and the forms without ら such as 食べれる and 来れる,
/// the lemma of the verb they are formed from.
///
/// Sources: UniDic 2025.12, the lemmas 書く of 書ける (下一段-カ行), 食べる of 食べれる and 来る of 来れる (下一段-ラ行),
/// and 出来る of できる;
/// 規程集 下, 資料「要注意語」助動詞 ラレル, p. (36) (可能).
pub const POTENTIAL: &[Rule] = &sharing(
    [
        godan("ける", "く"),
        godan("げる", "ぐ"),
        godan("せる", "す"),
        godan("てる", "つ"),
        godan("ねる", "ぬ"),
        godan("べる", "ぶ"),
        godan("める", "む"),
        godan("れる", "る"),
        godan("える", "う"),
        ichidan("られる", "る"),
        ichidan("れる", "る"),
        kuru("こられる", "くる"),
        kuru("来られる", "来る"),
        kuru("これる", "くる"),
        kuru("来れる", "来る"),
        zuru("じられる", "ずる"),
        zuru("ぜられる", "ずる"),
    ],
    C::V1,
    &["potential"],
);

/// Godan verbs shift their final kana to the あ row (わ for verbs in う) and add れる.
/// Ichidan verbs and 来る add られる, する becomes される or せられる, and ずる becomes じられる or ぜられる.
/// A passive verb inflects as an ichidan verb.
///
/// Sources: 規程集 下, 資料「要注意語」助動詞 レル and ラレル, p. (36); UniDic manual §5.3, p. 19 (未然形-サ);
/// UniDic 2025.12, 助動詞-レル.
pub const PASSIVE: &[Rule] = &sharing(
    [
        godan("かれる", "く"),
        godan("がれる", "ぐ"),
        godan("される", "す"),
        godan("たれる", "つ"),
        godan("なれる", "ぬ"),
        godan("ばれる", "ぶ"),
        godan("まれる", "む"),
        godan("られる", "る"),
        godan("われる", "う"),
        ichidan("られる", "る"),
        kuru("こられる", "くる"),
        kuru("来られる", "来る"),
        suru("される", "する"),
        suru("せられる", "する"),
        zuru("じられる", "ずる"),
        zuru("ぜられる", "ずる"),
    ],
    C::V1,
    &["passive"],
);

/// Godan verbs shift their final kana to the あ row (わ for verbs in う) and add せる.
/// Ichidan verbs add させる, 来る becomes こさせる, する becomes させる and ずる becomes じさせる or ぜさせる.
/// The causative inflects as an ichidan verb.
///
/// The passive of a causative is its causative-passive (食べさせられる), so no separate rules are needed.
///
/// Sources: 規程集 下, 資料「要注意語」助動詞 セル and サセル, p. (32); UniDic 2025.12, せる and させる (下一段-サ行).
pub const CAUSATIVE: &[Rule] = &sharing(
    [
        godan("かせる", "く"),
        godan("がせる", "ぐ"),
        godan("させる", "す"),
        godan("たせる", "つ"),
        godan("なせる", "ぬ"),
        godan("ばせる", "ぶ"),
        godan("ませる", "む"),
        godan("らせる", "る"),
        godan("わせる", "う"),
        ichidan("させる", "る"),
        kuru("こさせる", "くる"),
        kuru("来させる", "来る"),
        suru("させる", "する"),
        zuru("じさせる", "ずる"),
        zuru("ぜさせる", "ずる"),
    ],
    C::V1,
    &["causative"],
);

/// The short causative: godan verbs shift their final kana to the あ row (わ for verbs in う) and add す (書かす, 待たす),
/// ichidan verbs add さす (見さす, 着さす), 来る becomes こさす and a する verb ends in さす (勉強さす).
/// The short causative inflects as a godan verb in す, so 書かされる, 待たして and 掛けさして are traced to it first.
///
/// UniDic lists 書かす, 待たす and 食べさす under lemmas of their own, and lookup still finds them where a dictionary lists them.
/// Descriptive grammars treat them as causatives of the verb they come from, formed with a contracted suffix -(s)as-u.
/// さす on its own is not traced to する, so that the verbs 刺す, 差す and 指す keep their place.
///
/// Sources: 阿部 2021, p. 124 (歩かす, 着さす, 歩かされる, 読まして and 書かす, after 日本語記述文法研究会 2009 and 湯澤 1953),
/// and pp. 125–126 (the short causative of する, 持つ, 感じる and 食べる); 村木 1980, p. 46 (よます, かかす, きかす);
/// 規程集 下, 資料「要注意語」助動詞 セル and サセル, p. (32) (膨らま【し】て, 掛け【さし】て);
/// デジタル大辞泉「さす」補説 (四段型にも活用する); 精選版 日本国語大辞典「させる」語誌 (2) (連用形 さし).
pub const SHORT_CAUSATIVE: &[Rule] = &sharing(
    [
        godan("かす", "く").stem(Stem::NonEmpty),
        godan("がす", "ぐ").stem(Stem::NonEmpty),
        godan("さす", "す").stem(Stem::NonEmpty),
        godan("たす", "つ").stem(Stem::NonEmpty),
        godan("なす", "ぬ").stem(Stem::NonEmpty),
        godan("ばす", "ぶ").stem(Stem::NonEmpty),
        godan("ます", "む").stem(Stem::NonEmpty),
        godan("らす", "る").stem(Stem::NonEmpty),
        godan("わす", "う").stem(Stem::NonEmpty),
        ichidan("さす", "る"),
        kuru("こさす", "くる"),
        kuru("来さす", "来る"),
        suru("さす", "する").stem(Stem::NonEmpty),
    ],
    C::V5,
    &["causative"],
);

#[cfg(test)]
mod tests {
    use crate::deinflection::japanese::test_support::yields;

    mod potential {
        use super::yields;

        #[test]
        fn undoes_a_godan_potential() {
            assert!(yields("書ける", "書く", "v5", &["potential"]));
        }

        #[test]
        fn undoes_an_ichidan_potential() {
            assert!(yields("食べられる", "食べる", "v1", &["potential"]));
        }

        #[test]
        fn undoes_a_colloquial_ichidan_potential() {
            assert!(yields("食べれる", "食べる", "v1", &["potential"]));
        }

        #[test]
        fn undoes_the_potential_of_kuru() {
            assert!(yields("来られる", "来る", "vk", &["potential"]));
        }

        #[test]
        fn undoes_the_colloquial_potential_of_kuru() {
            assert!(yields("これる", "くる", "vk", &["potential"]));
        }

        #[test]
        fn leaves_dekiru_as_a_verb_of_its_own() {
            assert!(!yields("勉強できる", "勉強する", "vs", &["potential"]));
        }

        #[test]
        fn undoes_a_negative_potential() {
            assert!(yields("書けない", "書く", "v5", &["negative", "potential"]));
        }
    }

    mod passive {
        use super::yields;

        #[test]
        fn undoes_a_godan_passive() {
            assert!(yields("書かれる", "書く", "v5", &["passive"]));
        }

        #[test]
        fn undoes_a_godan_passive_in_u() {
            assert!(yields("言われる", "言う", "v5", &["passive"]));
        }

        #[test]
        fn undoes_an_ichidan_passive() {
            assert!(yields("食べられる", "食べる", "v1", &["passive"]));
        }

        #[test]
        fn undoes_the_passive_of_suru() {
            assert!(yields("される", "する", "vs", &["passive"]));
        }

        #[test]
        fn undoes_the_passive_of_a_zuru_verb() {
            assert!(yields("論じられる", "論ずる", "vz", &["passive"]));
        }

        #[test]
        fn undoes_a_past_passive() {
            assert!(yields("言われた", "言う", "v5", &["past", "passive"]));
        }
    }

    mod causative {
        use super::yields;

        #[test]
        fn undoes_a_godan_causative() {
            assert!(yields("書かせる", "書く", "v5", &["causative"]));
        }

        #[test]
        fn undoes_an_ichidan_causative() {
            assert!(yields("食べさせる", "食べる", "v1", &["causative"]));
        }

        #[test]
        fn undoes_the_causative_of_kuru() {
            assert!(yields("来させる", "来る", "vk", &["causative"]));
        }

        #[test]
        fn undoes_the_causative_of_suru() {
            assert!(yields("させる", "する", "vs", &["causative"]));
        }

        #[test]
        fn undoes_a_short_godan_causative_continuative() {
            assert!(yields(
                "膨らまして",
                "膨らむ",
                "v5",
                &["te-form", "causative"]
            ));
        }

        #[test]
        fn undoes_a_short_ichidan_causative_continuative() {
            assert!(yields(
                "掛けさして",
                "掛ける",
                "v1",
                &["te-form", "causative"]
            ));
        }

        #[test]
        fn undoes_a_short_godan_causative() {
            assert!(yields("書かす", "書く", "v5", &["causative"]));
        }

        #[test]
        fn undoes_a_short_godan_causative_in_u() {
            assert!(yields("言わす", "言う", "v5", &["causative"]));
        }

        #[test]
        fn undoes_a_short_ichidan_causative() {
            assert!(yields("見さす", "見る", "v1", &["causative"]));
        }

        #[test]
        fn undoes_the_short_causative_of_kuru() {
            assert!(yields("来さす", "来る", "vk", &["causative"]));
        }

        #[test]
        fn undoes_the_short_causative_of_a_suru_verb() {
            assert!(yields("勉強さす", "勉強する", "vs", &["causative"]));
        }

        #[test]
        fn does_not_trace_sasu_alone_to_suru() {
            assert!(!yields("さす", "する", "vs", &["causative"]));
        }

        #[test]
        fn undoes_a_past_short_causative() {
            assert!(yields("待たした", "待つ", "v5", &["past", "causative"]));
        }
    }

    mod causative_passive {
        use super::yields;

        #[test]
        fn undoes_an_ichidan_causative_passive() {
            assert!(yields(
                "食べさせられる",
                "食べる",
                "v1",
                &["passive", "causative"]
            ));
        }

        #[test]
        fn undoes_a_godan_causative_passive() {
            assert!(yields(
                "書かせられる",
                "書く",
                "v5",
                &["passive", "causative"]
            ));
        }

        #[test]
        fn traces_a_contracted_causative_passive_to_the_short_causative_verb() {
            assert!(yields("待たされる", "待たす", "v5", &["passive"]));
        }

        #[test]
        fn undoes_a_contracted_causative_passive() {
            assert!(yields(
                "待たされる",
                "待つ",
                "v5",
                &["passive", "causative"]
            ));
        }

        #[test]
        fn undoes_a_contracted_ichidan_causative_passive() {
            assert!(yields(
                "見さされた",
                "見る",
                "v1",
                &["past", "passive", "causative"]
            ));
        }

        #[test]
        fn undoes_the_causative_passive_of_suru() {
            assert!(yields(
                "させられる",
                "する",
                "vs",
                &["passive", "causative"]
            ));
        }
    }
}

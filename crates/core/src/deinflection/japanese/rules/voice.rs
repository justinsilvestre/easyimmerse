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

/// The short continuative of the causative: し in place of せ after a godan irrealis stem (膨らまして),
/// and さし in place of させ (掛けさして). They are rewritten to the full continuative, which [`CAUSATIVE`] then undoes.
/// UniDic analyses the other short causative forms, such as 書かす and 書かされる, as separate verbs (lemma 書かす),
/// so they are not traced back to the verb they come from.
///
/// Sources: 規程集 下, 資料「要注意語」助動詞 セル and サセル, p. (32) (examples 膨らま【し】て and 掛け【さし】て);
/// UniDic 2025.12, させる in 連用形-一般 さし, and 書かす, 待たす and 食べさす as lemmas of their own (五段-サ行).
pub const SHORT_CAUSATIVE: &[Rule] = &[
    Rule::replace("し", "せ")
        .from(C::CONTINUATIVE.or(C::ONBIN_TA))
        .to(C::CONTINUATIVE)
        .stem(Stem::ARow),
    Rule::replace("さし", "させ")
        .from(C::CONTINUATIVE.or(C::ONBIN_TA))
        .to(C::CONTINUATIVE)
        .stem(Stem::Ichidan),
];

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
        fn does_not_trace_a_short_causative_verb_to_its_source() {
            assert!(!yields("書かす", "書く", "v5", &["causative"]));
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

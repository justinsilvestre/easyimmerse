//! Potential, passive and causative: suffixes that form new verbs, which inflect further.

use super::{godan, ichidan, kuru, sharing, suru, zuru};
use crate::deinflection::japanese::rule::Rule;
use crate::deinflection::japanese::word_class::WordClasses as C;

/// Godan verbs shift their final kana to the え row and add る. Ichidan verbs and 来る add られる,
/// or colloquially れる. The potential of する is できる, and ずる verbs use their passive forms.
/// A potential verb inflects as an ichidan verb.
///
/// Sources: <https://en.wikipedia.org/w/index.php?title=Japanese_conjugation_(mizenkei_base)&oldid=1377950986#Potential:_Conjugation_table>
/// and <https://en.wiktionary.org/w/index.php?title=Appendix:Japanese_verbs&oldid=92311215#Complex_forms>.
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
        suru("できる", "する"),
        suru("出来る", "する"),
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
/// Sources: <https://en.wikipedia.org/w/index.php?title=Japanese_conjugation_(mizenkei_base)&oldid=1377950986#Passive:_Conjugation_table>
/// and <https://en.wiktionary.org/w/index.php?title=Appendix:Japanese_verbs&oldid=92311215#Passive_form>.
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
/// The contracted godan causative-passive (書かされる) is the passive of the short causative below.
///
/// Sources: <https://en.wikipedia.org/w/index.php?title=Japanese_conjugation_(mizenkei_base)&oldid=1377950986#Causative:_Conjugation_table>
/// and <https://en.wiktionary.org/w/index.php?title=Appendix:Japanese_verbs&oldid=92311215#Causative_passive_form>.
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

/// The colloquial short causative: す in place of せる, and さす in place of させる. It inflects as a godan verb.
///
/// Sources: the same as [`CAUSATIVE`].
pub const SHORT_CAUSATIVE: &[Rule] = &sharing(
    [
        godan("かす", "く"),
        godan("がす", "ぐ"),
        godan("さす", "す"),
        godan("たす", "つ"),
        godan("なす", "ぬ"),
        godan("ばす", "ぶ"),
        godan("ます", "む"),
        godan("らす", "る"),
        godan("わす", "う"),
        ichidan("さす", "る"),
        kuru("こさす", "くる"),
        kuru("来さす", "来る"),
        suru("さす", "する"),
        zuru("じさす", "ずる"),
        zuru("ぜさす", "ずる"),
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
        fn traces_dekiru_to_suru() {
            assert!(yields("勉強できる", "勉強する", "vs", &["potential"]));
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
        fn undoes_a_short_godan_causative() {
            assert!(yields("書かす", "書く", "v5", &["causative"]));
        }

        #[test]
        fn undoes_a_short_ichidan_causative() {
            assert!(yields("食べさす", "食べる", "v1", &["causative"]));
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
        fn undoes_a_contracted_godan_causative_passive() {
            assert!(yields(
                "書かされる",
                "書く",
                "v5",
                &["passive", "causative"]
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

//! The volitional (hortative) form.

use super::{godan, ichidan, kuru, sharing, suru, zuru};
use crate::deinflection::japanese::rule::Rule;
use crate::deinflection::japanese::word_class::WordClasses as C;

/// Godan verbs shift their final kana to the お row and add う. Ichidan verbs replace る with よう,
/// 来る becomes こよう, する becomes しよう and ずる becomes じよう.
///
/// Sources: <https://en.wikipedia.org/w/index.php?title=Japanese_conjugation_(mizenkei_base)&oldid=1377950986#Hortative:_Conjugation_table>
/// and <https://en.wiktionary.org/w/index.php?title=Appendix:Japanese_verbs&oldid=92311215#Volitional_form>.
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
    fn undoes_the_volitional_of_a_zuru_verb() {
        assert!(yields("論じよう", "論ずる", "vz", &["volitional"]));
    }
}

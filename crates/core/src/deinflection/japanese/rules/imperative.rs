//! The plain imperative.

use super::{godan, ichidan, kuru, sharing, suru, zuru};
use crate::deinflection::japanese::rule::Rule;
use crate::deinflection::japanese::word_class::WordClasses as C;

/// Godan verbs shift their final kana to the え row. Ichidan verbs replace る with ろ (spoken) or よ (written),
/// 来る becomes こい, する becomes しろ or せよ and ずる becomes じろ or ぜよ.
/// The honorific verbs いらっしゃる, おっしゃる, くださる, なさる and ござる end in い, and くれる becomes くれ.
///
/// Sources: UniDic manual §5.2.1, p. 17 (五段-ラ行-アル: 命令形 in い; 下一段-ラ行-呉レル: 命令形 くれ);
/// UniDic 2025.12, 命令形 of each 活用型.
pub const IMPERATIVE: &[Rule] = &sharing(
    [
        godan("け", "く"),
        godan("げ", "ぐ"),
        godan("せ", "す"),
        godan("て", "つ"),
        godan("ね", "ぬ"),
        godan("べ", "ぶ"),
        godan("め", "む"),
        godan("れ", "る"),
        godan("え", "う"),
        ichidan("ろ", "る"),
        ichidan("よ", "る"),
        kuru("こい", "くる"),
        kuru("来い", "来る"),
        suru("しろ", "する"),
        suru("せよ", "する"),
        zuru("じろ", "ずる"),
        zuru("ぜよ", "ずる"),
        godan("いらっしゃい", "いらっしゃる"),
        godan("おっしゃい", "おっしゃる"),
        godan("仰い", "仰る"),
        godan("ください", "くださる"),
        godan("下さい", "下さる"),
        godan("なさい", "なさる"),
        godan("為さい", "為さる"),
        godan("ござい", "ござる"),
        godan("御座い", "御座る"),
        Rule::replace("くれ", "くれる").to(C::V1),
        Rule::replace("呉れ", "呉れる").to(C::V1),
    ],
    C::INPUT,
    &["imperative"],
);

#[cfg(test)]
mod tests {
    use crate::deinflection::japanese::test_support::yields;

    #[test]
    fn undoes_a_godan_imperative() {
        assert!(yields("書け", "書く", "v5", &["imperative"]));
    }

    #[test]
    fn undoes_a_godan_imperative_in_u() {
        assert!(yields("買え", "買う", "v5", &["imperative"]));
    }

    #[test]
    fn undoes_a_spoken_ichidan_imperative() {
        assert!(yields("食べろ", "食べる", "v1", &["imperative"]));
    }

    #[test]
    fn undoes_a_written_ichidan_imperative() {
        assert!(yields("食べよ", "食べる", "v1", &["imperative"]));
    }

    #[test]
    fn undoes_the_imperative_of_kuru_in_kanji() {
        assert!(yields("来い", "来る", "vk", &["imperative"]));
    }

    #[test]
    fn undoes_the_imperative_of_kuru_in_kana() {
        assert!(yields("こい", "くる", "vk", &["imperative"]));
    }

    #[test]
    fn undoes_the_spoken_imperative_of_suru() {
        assert!(yields("しろ", "する", "vs", &["imperative"]));
    }

    #[test]
    fn undoes_the_written_imperative_of_suru() {
        assert!(yields("勉強せよ", "勉強する", "vs", &["imperative"]));
    }

    #[test]
    fn undoes_the_imperative_of_a_zuru_verb() {
        assert!(yields("論じろ", "論ずる", "vz", &["imperative"]));
    }

    #[test]
    fn undoes_the_imperative_of_an_honorific_verb() {
        assert!(yields("ください", "くださる", "v5", &["imperative"]));
    }

    #[test]
    fn undoes_the_imperative_of_irassharu() {
        assert!(yields(
            "いらっしゃい",
            "いらっしゃる",
            "v5",
            &["imperative"]
        ));
    }

    #[test]
    fn undoes_the_imperative_of_ossharu() {
        assert!(yields("おっしゃい", "おっしゃる", "v5", &["imperative"]));
    }

    #[test]
    fn undoes_the_imperative_of_nasaru() {
        assert!(yields("なさい", "なさる", "v5", &["imperative"]));
    }

    #[test]
    fn undoes_the_imperative_of_kureru() {
        assert!(yields("くれ", "くれる", "v1", &["imperative"]));
    }
}

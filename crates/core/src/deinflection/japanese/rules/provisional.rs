//! The provisional form: the hypothetical stem (仮定形) with the particle ば, or fused with it.

use super::{godan, ichidan, kuru, sharing, suru, zuru};
use crate::deinflection::japanese::rule::Rule;
use crate::deinflection::japanese::word_class::WordClasses as C;

/// The final う-row vowel of the dictionary form becomes え, and ば follows:
/// godan verbs end in the え row plus ば, ichidan verbs in れば, and 来る, する and ずる in くれば, すれば and ずれば.
///
/// Sources: 規程集 下, 資料「要注意語」助詞 バ, p. (30) (接続助詞 after the 仮定形); UniDic 2025.12, 仮定形-一般 of each 活用型.
pub const PROVISIONAL: &[Rule] = &sharing(
    [
        godan("けば", "く"),
        godan("げば", "ぐ"),
        godan("せば", "す"),
        godan("てば", "つ"),
        godan("ねば", "ぬ"),
        godan("べば", "ぶ"),
        godan("めば", "む"),
        godan("れば", "る"),
        godan("えば", "う"),
        ichidan("れば", "る"),
        kuru("くれば", "くる"),
        kuru("来れば", "来る"),
        suru("すれば", "する"),
        zuru("ずれば", "ずる"),
    ],
    C::INPUT,
    &["provisional"],
);

/// The hypothetical stem fused with ば (仮定形-融合): け plus ば becomes きゃ, れ plus ば becomes りゃ, and so on,
/// with や for verbs in う. くれば, すれば and ずれば become くりゃ, すりゃ and ずりゃ.
///
/// Sources: 規程集 下, 最小単位認定規程 1.1, p. 2 (考えりゃ, 行きゃ kept whole); UniDic manual §5.3, p. 20 (仮定形-融合);
/// UniDic 2025.12, 仮定形-融合 of each 活用型.
pub const FUSED_PROVISIONAL: &[Rule] = &sharing(
    [
        godan("きゃ", "く"),
        godan("ぎゃ", "ぐ"),
        godan("しゃ", "す"),
        godan("ちゃ", "つ"),
        godan("にゃ", "ぬ"),
        godan("びゃ", "ぶ"),
        godan("みゃ", "む"),
        godan("りゃ", "る"),
        godan("や", "う"),
        ichidan("りゃ", "る"),
        kuru("くりゃ", "くる"),
        kuru("来りゃ", "来る"),
        suru("すりゃ", "する"),
        zuru("ずりゃ", "ずる"),
    ],
    C::INPUT,
    &["provisional"],
);

#[cfg(test)]
mod tests {
    use crate::deinflection::japanese::test_support::yields;

    #[test]
    fn undoes_a_godan_provisional() {
        assert!(yields("書けば", "書く", "v5", &["provisional"]));
    }

    #[test]
    fn undoes_a_godan_provisional_in_u() {
        assert!(yields("買えば", "買う", "v5", &["provisional"]));
    }

    #[test]
    fn undoes_an_ichidan_provisional() {
        assert!(yields("食べれば", "食べる", "v1", &["provisional"]));
    }

    #[test]
    fn undoes_the_provisional_of_kuru_in_kanji() {
        assert!(yields("来れば", "来る", "vk", &["provisional"]));
    }

    #[test]
    fn undoes_the_provisional_of_kuru_in_kana() {
        assert!(yields("くれば", "くる", "vk", &["provisional"]));
    }

    #[test]
    fn undoes_the_provisional_of_suru() {
        assert!(yields("すれば", "する", "vs", &["provisional"]));
    }

    #[test]
    fn undoes_a_fused_godan_provisional() {
        assert!(yields("書きゃ", "書く", "v5", &["provisional"]));
    }

    #[test]
    fn undoes_a_fused_ichidan_provisional() {
        assert!(yields("見りゃ", "見る", "v1", &["provisional"]));
    }

    #[test]
    fn undoes_a_fused_provisional_of_a_verb_in_u() {
        assert!(yields("買や", "買う", "v5", &["provisional"]));
    }

    #[test]
    fn undoes_the_fused_provisional_of_suru() {
        assert!(yields("すりゃ", "する", "vs", &["provisional"]));
    }

    #[test]
    fn undoes_the_provisional_of_a_zuru_verb() {
        assert!(yields("論ずれば", "論ずる", "vz", &["provisional"]));
    }
}

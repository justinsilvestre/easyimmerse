//! Negative auxiliaries on the irrealis stem: ない, the older ず with its forms ぬ, ん, ね and ざる,
//! the western へん and ひん, and ない as the negative of ある.

use super::{godan, kuru, sharing, suru};
use crate::deinflection::japanese::rule::{Rule, Stem};
use crate::deinflection::japanese::word_class::WordClasses as C;

/// ない inflects as an i-adjective, so its own forms are undone by the adjective rules first.
/// ず has the forms ぬ, ん, ざる (attributive, mostly literary), ね before ば, and にゃ for ねば.
/// ない after ん (知らんかった) is written ん plus かった.
/// The suppletive negative of ある is ない.
///
/// Sources: 規程集 下, 資料「要注意語」助動詞 ナイ and ズ, pp. (32) and (35);
/// UniDic manual §5.3, p. 20 (終止形-撥音便 ん, 仮定形-融合 にゃ);
/// UniDic 2025.12, 助動詞-ナイ (連用形-促音便 んかっ), 助動詞-ヌ and 文語助動詞-ズ (連体形-補助 ざる),
/// and the lemma 有る of the adjective 無い.
pub const NEGATIVE: &[Rule] = &[
    Rule::replace("ない", "")
        .from(C::ADJ_I)
        .to(C::IRREALIS)
        .named(&["negative"]),
    irrealis("ぬ", &["negative"]),
    irrealis("ん", &["negative"]),
    irrealis("ざる", &["negative"]),
    irrealis("んかった", &["past", "negative"]),
    irrealis("ず", &["negative continuative"]),
    irrealis("ねば", &["provisional", "negative"]),
    irrealis("にゃ", &["provisional", "negative"]),
    Rule::replace("ない", "ある")
        .from(C::ADJ_I)
        .to(C::V5)
        .named(&["negative"])
        .stem(Stem::Empty),
];

/// The western negatives へん and ひん, with their past へんかった and ひんかった, on the irrealis stem.
/// Godan verbs may also take へん on the え row (書けへん), する takes せえ or しい, and 来る takes けえ, こお or きい.
///
/// Sources: UniDic 2025.12, 助動詞-ヘン and 助動詞-ヒン (へん, ひん, 連用形 へんかっ and ひんかっ),
/// and the 未然形-一般 rows 書け (五段-カ行), せえ and しい (する), けえ, こお and きい (来る).
pub const WESTERN_NEGATIVE: &[Rule] = &[
    irrealis("へん", &["negative"]),
    irrealis("ひん", &["negative"]),
    irrealis("へんかった", &["past", "negative"]),
    irrealis("ひんかった", &["past", "negative"]),
];

/// The forms of [`WESTERN_NEGATIVE`] on stems that the standard irrealis rules do not cover.
pub const WESTERN_NEGATIVE_STEMS: &[Rule] = &sharing(
    [
        godan("けへん", "く"),
        godan("げへん", "ぐ"),
        godan("せへん", "す"),
        godan("てへん", "つ"),
        godan("ねへん", "ぬ"),
        godan("べへん", "ぶ"),
        godan("めへん", "む"),
        godan("れへん", "る"),
        godan("えへん", "う"),
        suru("せえへん", "する"),
        suru("しいひん", "する"),
        kuru("けえへん", "くる"),
        kuru("こおへん", "くる"),
        kuru("きいひん", "くる"),
        kuru("来えへん", "来る"),
        kuru("来おへん", "来る"),
    ],
    C::INPUT,
    &["negative"],
);

const fn irrealis(inflected: &'static str, inflections: &'static [&'static str]) -> Rule {
    Rule::replace(inflected, "")
        .to(C::IRREALIS)
        .named(inflections)
}

#[cfg(test)]
mod tests {
    use crate::deinflection::japanese::test_support::yields;

    mod nai {
        use super::yields;

        #[test]
        fn undoes_an_ichidan_negative() {
            assert!(yields("食べない", "食べる", "v1", &["negative"]));
        }

        #[test]
        fn undoes_a_godan_negative() {
            assert!(yields("書かない", "書く", "v5", &["negative"]));
        }

        #[test]
        fn undoes_a_godan_negative_in_wa() {
            assert!(yields("買わない", "買う", "v5", &["negative"]));
        }

        #[test]
        fn undoes_the_negative_of_kuru_in_kanji() {
            assert!(yields("来ない", "来る", "vk", &["negative"]));
        }

        #[test]
        fn undoes_the_negative_of_kuru_in_kana() {
            assert!(yields("こない", "くる", "vk", &["negative"]));
        }

        #[test]
        fn undoes_the_negative_of_suru() {
            assert!(yields("しない", "する", "vs", &["negative"]));
        }

        #[test]
        fn undoes_the_negative_of_a_zuru_verb() {
            assert!(yields("論じない", "論ずる", "vz", &["negative"]));
        }

        #[test]
        fn undoes_a_negative_past() {
            assert!(yields("書かなかった", "書く", "v5", &["past", "negative"]));
        }

        #[test]
        fn undoes_a_negative_te_form_in_nakute() {
            assert!(yields("書かなくて", "書く", "v5", &["te-form", "negative"]));
        }

        #[test]
        fn undoes_a_negative_representative() {
            assert!(yields(
                "書かなかったり",
                "書く",
                "v5",
                &["representative", "negative"]
            ));
        }

        #[test]
        fn undoes_the_fused_provisional_nakya() {
            assert!(yields(
                "読まなきゃ",
                "読む",
                "v5",
                &["provisional", "negative"]
            ));
        }

        #[test]
        fn undoes_nakucha() {
            assert!(yields("行かなくちゃ", "行く", "v5", &["te-wa", "negative"]));
        }

        #[test]
        fn traces_nai_back_to_aru() {
            assert!(yields("ない", "ある", "v5", &["negative"]));
        }

        #[test]
        fn does_not_trace_a_verb_negative_back_to_aru() {
            assert!(!yields("食べない", "食べある", "v5", &["negative"]));
        }

        #[test]
        fn leaves_the_particle_de_after_nai_to_lookup() {
            assert!(!yields(
                "食べないで",
                "食べる",
                "v1",
                &["te-form", "negative"]
            ));
        }
    }

    mod zu {
        use super::yields;

        #[test]
        fn undoes_nu() {
            assert!(yields("知らぬ", "知る", "v5", &["negative"]));
        }

        #[test]
        fn undoes_nu_after_kuru() {
            assert!(yields("来ぬ", "来る", "vk", &["negative"]));
        }

        #[test]
        fn undoes_n() {
            assert!(yields("知らん", "知る", "v5", &["negative"]));
        }

        #[test]
        fn undoes_sen_as_the_negative_of_suru() {
            assert!(yields("せん", "する", "vs", &["negative"]));
        }

        #[test]
        fn undoes_the_past_of_n() {
            assert!(yields("知らんかった", "知る", "v5", &["past", "negative"]));
        }

        #[test]
        fn undoes_zaru() {
            assert!(yields("知らざる", "知る", "v5", &["negative"]));
        }

        #[test]
        fn undoes_zaru_after_kuru() {
            assert!(yields("こざる", "くる", "vk", &["negative"]));
        }

        #[test]
        fn undoes_a_godan_zu() {
            assert!(yields("書かず", "書く", "v5", &["negative continuative"]));
        }

        #[test]
        fn undoes_sezu_as_the_zu_of_suru() {
            assert!(yields("せず", "する", "vs", &["negative continuative"]));
        }

        #[test]
        fn undoes_zu_after_a_causative() {
            assert!(yields(
                "書かせず",
                "書く",
                "v5",
                &["negative continuative", "causative"]
            ));
        }

        #[test]
        fn undoes_the_provisional_neba() {
            assert!(yields(
                "書かねば",
                "書く",
                "v5",
                &["provisional", "negative"]
            ));
        }

        #[test]
        fn undoes_the_fused_provisional_nya() {
            assert!(yields("せにゃ", "する", "vs", &["provisional", "negative"]));
        }
    }

    mod western {
        use super::yields;

        #[test]
        fn undoes_hen_on_the_a_row() {
            assert!(yields("行かへん", "行く", "v5", &["negative"]));
        }

        #[test]
        fn undoes_hen_on_the_e_row() {
            assert!(yields("書けへん", "書く", "v5", &["negative"]));
        }

        #[test]
        fn undoes_hin_after_an_ichidan_stem() {
            assert!(yields("起きひん", "起きる", "v1", &["negative"]));
        }

        #[test]
        fn undoes_seehen_as_the_negative_of_suru() {
            assert!(yields("せえへん", "する", "vs", &["negative"]));
        }

        #[test]
        fn undoes_keehen_as_the_negative_of_kuru() {
            assert!(yields("けえへん", "くる", "vk", &["negative"]));
        }

        #[test]
        fn undoes_the_past_henkatta() {
            assert!(yields(
                "行かへんかった",
                "行く",
                "v5",
                &["past", "negative"]
            ));
        }
    }
}

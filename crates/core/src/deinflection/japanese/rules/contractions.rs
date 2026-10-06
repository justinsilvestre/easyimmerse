//! Auxiliaries that contract て with a subsidiary verb, such as てる for ている.
//!
//! The full forms (ている, ておく, てしまう and so on) are left to lookup: the te-form before them is a word of its own,
//! and the subsidiary verb after it is another. The contractions cannot be split that way, so they are undone.

use crate::deinflection::japanese::rule::Rule;
use crate::deinflection::japanese::word_class::WordClasses as C;

/// Progressive てる for ている, which inflects as an ichidan verb, and とる for ておる, which inflects as a godan verb.
///
/// Sources: 規程集 下, 資料「要注意語」助動詞 テル and トル, p. (34); 規程集 下, 最小単位認定規程 1.1, p. 2
/// (生き／てる, 知っ／とる); UniDic 2025.12, てる (下一段-タ行, でる 下一段-ダ行) and とる (五段-ラ行, どる).
pub const PROGRESSIVE: &[Rule] = &[
    voiceless("てる", C::V1, &["progressive"]),
    voiced("でる", C::V1, &["progressive"]),
    voiceless("とる", C::V5, &["progressive"]),
    voiced("どる", C::V5, &["progressive"]),
];

/// Preparatory とく for ておく, which inflects as a godan verb.
///
/// Sources: 規程集 下, 資料「要注意語」助動詞 トク, p. (34); 規程集 下, 最小単位認定規程 1.1, p. 2 (置い／とく);
/// UniDic manual §5.2.3, p. 17; UniDic 2025.12, とく and どく (五段-カ行).
pub const PREPARATORY: &[Rule] = &[
    voiceless("とく", C::V5, &["preparatory"]),
    voiced("どく", C::V5, &["preparatory"]),
];

/// てく for ていく ("go on doing", "do and go"), which inflects as a godan verb with the euphonic stem てっ, like 行く.
///
/// Sources: 規程集 下, 資料「要注意語」助動詞 テク, p. (34); 規程集 下, 最小単位認定規程 1.1, p. 2 (持っ／てく, 持っ／てっ／た);
/// UniDic 2025.12, てく and でく (五段-カ行).
pub const CONTINUING: &[Rule] = &[
    voiceless("てく", C::V5, &["continuing"]),
    voiced("でく", C::V5, &["continuing"]),
];

/// Completive ちゃう and ちまう for てしまう ("do completely, or regrettably"), voiced to じゃう and じまう where て is voiced to で.
/// They inflect as godan verbs.
///
/// Sources: 規程集 下, 資料「要注意語」助動詞 チマウ and チャウ, p. (33); 規程集 下, 最小単位認定規程 1.1, p. 2
/// (行っ／ちまう, 行っ／ちゃう); UniDic 2025.12, ちゃう and ちまう (五段-ワア行) with じゃう and じまう.
pub const COMPLETIVE: &[Rule] = &[
    voiceless("ちゃう", C::V5, &["completive"]),
    voiced("じゃう", C::V5, &["completive"]),
    voiceless("ちまう", C::V5, &["completive"]),
    voiced("じまう", C::V5, &["completive"]),
];

/// Benefactive たげる for てあげる, which inflects as an ichidan verb, and たる for てやる, which inflects as a godan verb.
///
/// Sources: 規程集 下, 資料「要注意語」助動詞 タゲル and タル, p. (33) (送っ【たげ】たり, 殴っ【たっ】てん);
/// UniDic 2025.12, たげる (下一段-ガ行) and たる (五段-ラ行).
pub const BENEFACTIVE: &[Rule] = &[
    voiceless("たげる", C::V1, &["benefactive"]),
    voiced("だげる", C::V1, &["benefactive"]),
    voiceless("たる", C::V5, &["benefactive"]),
    voiced("だる", C::V5, &["benefactive"]),
];

/// てらっしゃる for ていらっしゃる, the honorific of ている, which inflects as いらっしゃる does.
///
/// Sources: 規程集 下, 資料「要注意語」助動詞 テラッシャル, p. (34) (参加し【てらっしゃい】ました, 住ん【でらっしゃる】);
/// UniDic 2025.12, てらっしゃる (五段-ラ行).
pub const HONORIFIC_PROGRESSIVE: &[Rule] = &[
    voiceless("てらっしゃる", C::V5, &["honorific progressive"]),
    voiced("でらっしゃる", C::V5, &["honorific progressive"]),
];

const fn voiceless(inflected: &'static str, from: C, inflections: &'static [&'static str]) -> Rule {
    Rule::replace(inflected, "")
        .from(from)
        .to(C::ONBIN_TA)
        .named(inflections)
}

const fn voiced(inflected: &'static str, from: C, inflections: &'static [&'static str]) -> Rule {
    Rule::replace(inflected, "")
        .from(from)
        .to(C::ONBIN_DA)
        .named(inflections)
}

#[cfg(test)]
mod tests {
    use crate::deinflection::japanese::test_support::yields;

    mod progressive {
        use super::yields;

        #[test]
        fn undoes_teru() {
            assert!(yields("食べてる", "食べる", "v1", &["progressive"]));
        }

        #[test]
        fn undoes_the_voiced_deru() {
            assert!(yields("読んでる", "読む", "v5", &["progressive"]));
        }

        #[test]
        fn undoes_a_past_teru() {
            assert!(yields("食べてた", "食べる", "v1", &["past", "progressive"]));
        }

        #[test]
        fn undoes_toru() {
            assert!(yields("待っとる", "待つ", "v5", &["progressive"]));
        }

        #[test]
        fn undoes_a_past_toru() {
            assert!(yields("知っとった", "知る", "v5", &["past", "progressive"]));
        }

        #[test]
        fn leaves_the_full_teiru_to_lookup() {
            assert!(!yields("食べている", "食べる", "v1", &["progressive"]));
        }
    }

    mod preparatory {
        use super::yields;

        #[test]
        fn undoes_toku() {
            assert!(yields("書いとく", "書く", "v5", &["preparatory"]));
        }

        #[test]
        fn undoes_the_voiced_doku() {
            assert!(yields("読んどく", "読む", "v5", &["preparatory"]));
        }

        #[test]
        fn undoes_a_past_toku() {
            assert!(yields("置いといた", "置く", "v5", &["past", "preparatory"]));
        }

        #[test]
        fn undoes_a_negative_potential_toku() {
            assert!(yields(
                "放っとけない",
                "放る",
                "v5",
                &["negative", "potential", "preparatory"]
            ));
        }

        #[test]
        fn leaves_the_full_teoku_to_lookup() {
            assert!(!yields("書いておく", "書く", "v5", &["preparatory"]));
        }
    }

    mod continuing {
        use super::yields;

        #[test]
        fn undoes_teku() {
            assert!(yields("持ってく", "持つ", "v5", &["continuing"]));
        }

        #[test]
        fn undoes_a_past_teku() {
            assert!(yields("持ってった", "持つ", "v5", &["past", "continuing"]));
        }

        #[test]
        fn undoes_a_voiced_deku() {
            assert!(yields("飛んでく", "飛ぶ", "v5", &["continuing"]));
        }
    }

    mod benefactive {
        use super::yields;

        #[test]
        fn undoes_tageru() {
            assert!(yields("送ったげる", "送る", "v5", &["benefactive"]));
        }

        #[test]
        fn undoes_taru() {
            assert!(yields("書いたる", "書く", "v5", &["benefactive"]));
        }

        #[test]
        fn undoes_a_voiced_daru() {
            assert!(yields("読んだる", "読む", "v5", &["benefactive"]));
        }
    }

    mod honorific_progressive {
        use super::yields;

        #[test]
        fn undoes_terassharu() {
            assert!(yields(
                "住んでらっしゃる",
                "住む",
                "v5",
                &["honorific progressive"]
            ));
        }

        #[test]
        fn undoes_a_polite_terassharu() {
            assert!(yields(
                "参加してらっしゃいました",
                "参加する",
                "vs",
                &["past", "polite", "honorific progressive"]
            ));
        }
    }

    mod completive {
        use super::yields;

        #[test]
        fn undoes_chau() {
            assert!(yields("書いちゃう", "書く", "v5", &["completive"]));
        }

        #[test]
        fn undoes_the_voiced_jau() {
            assert!(yields("読んじゃう", "読む", "v5", &["completive"]));
        }

        #[test]
        fn undoes_chimau() {
            assert!(yields("忘れちまう", "忘れる", "v1", &["completive"]));
        }

        #[test]
        fn undoes_the_voiced_jimau() {
            assert!(yields(
                "飲んじまった",
                "飲む",
                "v5",
                &["past", "completive"]
            ));
        }

        #[test]
        fn undoes_a_past_chau() {
            assert!(yields(
                "食べちゃった",
                "食べる",
                "v1",
                &["past", "completive"]
            ));
        }

        #[test]
        fn leaves_the_full_teshimau_to_lookup() {
            assert!(!yields("書いてしまう", "書く", "v5", &["completive"]));
        }
    }
}

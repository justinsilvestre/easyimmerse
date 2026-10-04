//! The polite auxiliary ます and its inflections, on the continuative stem.

use crate::deinflection::japanese::rule::Rule;
use crate::deinflection::japanese::word_class::WordClasses as C;

/// ます, past ました, negative ません, negative past ませんでした, volitional ましょう, te-form まして,
/// conditional ましたら, provisional ますれば and imperative ませ.
///
/// Sources: <https://en.wiktionary.org/w/index.php?title=Appendix:Japanese_verbs&oldid=92311215#Inflected_forms>
/// (the paradigm of ます) and <https://en.wikipedia.org/w/index.php?title=Japanese_conjugation&oldid=1377029019#Politeness_stylization>.
pub const POLITE: &[Rule] = &[
    polite("ます", &["polite"]),
    polite("ました", &["past", "polite"]),
    polite("ません", &["negative", "polite"]),
    polite("ませんでした", &["past", "negative", "polite"]),
    polite("ましょう", &["volitional", "polite"]),
    polite("まして", &["te-form", "polite"]),
    polite("ましたら", &["conditional", "polite"]),
    polite("ますれば", &["provisional", "polite"]),
    polite("ませ", &["imperative", "polite"]),
];

const fn polite(inflected: &'static str, inflections: &'static [&'static str]) -> Rule {
    Rule::replace(inflected, "")
        .to(C::CONTINUATIVE)
        .named(inflections)
}

#[cfg(test)]
mod tests {
    use crate::deinflection::japanese::test_support::yields;

    #[test]
    fn undoes_an_ichidan_polite_form() {
        assert!(yields("食べます", "食べる", "v1", &["polite"]));
    }

    #[test]
    fn undoes_a_godan_polite_form() {
        assert!(yields("書きます", "書く", "v5", &["polite"]));
    }

    #[test]
    fn undoes_the_polite_form_of_kuru_in_kanji() {
        assert!(yields("来ます", "来る", "vk", &["polite"]));
    }

    #[test]
    fn undoes_the_polite_form_of_kuru_in_kana() {
        assert!(yields("きます", "くる", "vk", &["polite"]));
    }

    #[test]
    fn undoes_the_polite_form_of_suru() {
        assert!(yields("勉強します", "勉強する", "vs", &["polite"]));
    }

    #[test]
    fn undoes_the_polite_form_of_a_zuru_verb() {
        assert!(yields("論じます", "論ずる", "vz", &["polite"]));
    }

    #[test]
    fn undoes_the_polite_form_of_an_honorific_verb() {
        assert!(yields("くださいます", "くださる", "v5", &["polite"]));
    }

    #[test]
    fn undoes_the_polite_past() {
        assert!(yields("書きました", "書く", "v5", &["past", "polite"]));
    }

    #[test]
    fn undoes_the_polite_negative() {
        assert!(yields("書きません", "書く", "v5", &["negative", "polite"]));
    }

    #[test]
    fn undoes_the_polite_negative_past() {
        assert!(yields(
            "書きませんでした",
            "書く",
            "v5",
            &["past", "negative", "polite"]
        ));
    }

    #[test]
    fn undoes_the_polite_volitional() {
        assert!(yields(
            "書きましょう",
            "書く",
            "v5",
            &["volitional", "polite"]
        ));
    }

    #[test]
    fn undoes_the_polite_te_form() {
        assert!(yields("書きまして", "書く", "v5", &["te-form", "polite"]));
    }

    #[test]
    fn undoes_the_polite_conditional() {
        assert!(yields(
            "書きましたら",
            "書く",
            "v5",
            &["conditional", "polite"]
        ));
    }

    #[test]
    fn undoes_the_polite_provisional() {
        assert!(yields(
            "書きますれば",
            "書く",
            "v5",
            &["provisional", "polite"]
        ));
    }

    #[test]
    fn undoes_the_polite_imperative_of_an_honorific_verb() {
        assert!(yields(
            "いらっしゃいませ",
            "いらっしゃる",
            "v5",
            &["imperative", "polite"]
        ));
    }

    #[test]
    fn undoes_the_polite_negative_of_aru() {
        assert!(yields("ありません", "ある", "v5", &["negative", "polite"]));
    }
}

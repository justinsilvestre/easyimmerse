//! Adjective declension and regular comparison.

use crate::deinflection::german::inflection::*;
use crate::deinflection::german::rule::{Rule, Stem};
use crate::deinflection::german::word_class::WordClasses as C;

/// The strong, weak and mixed declensions share the endings -e, -en, -er, -es and -em, so one name covers them all.
/// Adjectives in -el, -er and -en may drop the schwa of their last syllable before an ending (dunkle, teure),
/// and adjectives in -e merge their schwa with that of the ending (müde-n), as two schwas never follow each other.
///
/// Sources: Schäfer (2018), Tab. 9.12, p. 278, and pp. 261 and 304–305 (the loss of one of two schwas);
/// grammis, unit 4067 (declension of adjectives);
/// <https://de.wikipedia.org/w/index.php?title=Deutsche_Deklination&oldid=270208356> („Adjektive auf -el, -er, -en",
/// which cites Duden, *Die Grammatik*, 8th ed. 2009, p. 365).
pub const DECLENSION: &[Rule] = &[
    declined("e", ""),
    declined("en", ""),
    declined("er", ""),
    declined("es", ""),
    declined("em", ""),
    declined("le", "el"),
    declined("len", "el"),
    declined("ler", "el"),
    declined("les", "el"),
    declined("lem", "el"),
    declined("re", "er"),
    declined("ren", "er"),
    declined("rer", "er"),
    declined("res", "er"),
    declined("rem", "er"),
    declined("n", "").stem(Stem::FinalE),
    declined("r", "").stem(Stem::FinalE),
    declined("s", "").stem(Stem::FinalE),
    declined("m", "").stem(Stem::FinalE),
    declined("ne", "en"),
    declined("nen", "en"),
    declined("ner", "en"),
    declined("nes", "en"),
    declined("nem", "en"),
];

/// The comparative adds -(e)r, with no schwa after a stem in -e (träge-r), and the superlative -(e)st, which is used only with a declension ending or in am …sten.
/// Adjectives in -el drop the schwa before -er, and those in -er and -en may (nobler, teurer).
/// After s, ß, x and z the superlative drops the s of -st (größte).
/// Umlaut and suppletive forms are listed in the lexicon instead.
///
/// Sources: Schäfer (2018), Tab. 9.13, p. 283; grammis, units 4067 and 5208 (2);
/// Amtliches Regelwerk (2024), § 26, p. 48.
pub const COMPARISON: &[Rule] = &[
    comparative("er", ""),
    comparative("r", "").stem(Stem::FinalE),
    comparative("ler", "el"),
    comparative("rer", "er"),
    comparative("ner", "en"),
    superlative("st").stem(Stem::NonEmpty),
    superlative("est").stem(Stem::NonEmpty),
    superlative("t").stem(Stem::Sibilant),
];

const fn declined(ending: &'static str, base: &'static str) -> Rule {
    Rule::replace(ending, base)
        .to(C::ADJECTIVE.or(C::DECLINED))
        .named(&[DECLINED])
}

const fn comparative(ending: &'static str, base: &'static str) -> Rule {
    Rule::replace(ending, base)
        .from(C::INPUT.or(C::DECLINED))
        .to(C::ADJECTIVE)
        .named(&[COMPARATIVE])
}

const fn superlative(ending: &'static str) -> Rule {
    Rule::replace(ending, "")
        .from(C::DECLINED)
        .to(C::ADJECTIVE)
        .named(&[SUPERLATIVE])
}

#[cfg(test)]
mod tests {
    use crate::deinflection::german::test_support::yields;

    #[test]
    fn undoes_a_declension_ending() {
        assert!(yields("schönes", "schön", "adj", &["declined"]));
    }

    #[test]
    fn undoes_a_declension_ending_after_a_dropped_schwa() {
        assert!(yields("dunkle", "dunkel", "adj", &["declined"]));
    }

    #[test]
    fn undoes_a_declension_ending_on_a_stem_in_e() {
        assert!(yields("erstes", "erste", "adj", &["declined"]));
    }

    #[test]
    fn undoes_the_comparative() {
        assert!(yields("schneller", "schnell", "adj", &["comparative"]));
    }

    #[test]
    fn undoes_a_declined_comparative() {
        assert!(yields(
            "schnellere",
            "schnell",
            "adj",
            &["declined", "comparative"]
        ));
    }

    #[test]
    fn undoes_the_comparative_after_a_dropped_schwa() {
        assert!(yields("teurer", "teuer", "adj", &["comparative"]));
    }

    #[test]
    fn undoes_the_comparative_of_a_stem_in_e() {
        assert!(yields("träger", "träge", "adj", &["comparative"]));
    }

    #[test]
    fn undoes_a_declined_superlative() {
        assert!(yields(
            "schnellsten",
            "schnell",
            "adj",
            &["declined", "superlative"]
        ));
    }

    #[test]
    fn undoes_a_superlative_in_est() {
        assert!(yields(
            "heißeste",
            "heiß",
            "adj",
            &["declined", "superlative"]
        ));
    }

    #[test]
    fn leaves_a_bare_superlative_stem() {
        assert!(!yields("schnellst", "schnell", "adj", &["superlative"]));
    }
}

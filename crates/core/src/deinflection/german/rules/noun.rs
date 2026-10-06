//! Noun case and plural endings. They work at the end of the word, so they also inflect the last part of a compound.

use crate::deinflection::german::inflection::*;
use crate::deinflection::german::rule::{Rule, Stem, Umlaut};
use crate::deinflection::german::word_class::WordClasses as C;

/// Only the genitive singular (-es or -s) and the dative plural (-n) are marked regularly, and rarely the dative singular (-e).
/// The dative plural -n is left out after a plural in -n or -s. Weak nouns end in -(e)n in every form but the nominative singular.
/// A few nouns of the mixed type take -ns or -ens in the genitive (Namens, Herzens).
/// The s of the endings -nis, -as, -is, -os and -us is doubled before a vowel (Kenntnisses).
/// Nouns made from adjectives keep the adjective endings (der Angestellte, ein Angestellter, mit Neuem).
///
/// Sources: Schäfer (2018), Tab. 9.6 and Satz 9.2, pp. 262–263, and § 9.2.4, p. 264 (weak nouns);
/// grammis, units 4066 (case inflection, including the mixed type) and 4067 (nominalized adjectives);
/// Amtliches Regelwerk (2024), § 5 (2), p. 36.
pub const CASE: &[Rule] = &[
    noun("s", "").named(&[GENITIVE]),
    noun("es", "").named(&[GENITIVE]),
    noun("sses", "s").named(&[GENITIVE]),
    noun("ns", "").named(&[GENITIVE]),
    noun("ens", "").named(&[GENITIVE]),
    noun("e", "").named(&[DATIVE]),
    noun("en", "").named(&[OBLIQUE]),
    noun("n", "").stem(Stem::Schwa).named(&[OBLIQUE]),
    noun("r", "").stem(Stem::FinalE).named(&[DECLINED]),
    noun("s", "").stem(Stem::FinalE).named(&[DECLINED]),
    noun("m", "").stem(Stem::FinalE).named(&[DECLINED]),
    Rule::replace("n", "")
        .to(C::PLURAL)
        .stem(Stem::NotNOrS)
        .named(&[DATIVE]),
];

/// The plural takes -e, -er, -en, -n or -s, and -e, -er and the zero ending may come with umlaut.
/// After a stem in e, el or er the schwa of -en is dropped (Löwe-n, Nudel-n), and after a stem in el, er or en
/// the plural adds no ending, so that umlaut alone may mark it (Mütter).
/// The n of -in and the s of -nis, -as, -is, -os and -us are doubled before a vowel (Ärztinnen, Kenntnisse).
/// Some loanwords replace their ending (Museen, Organismen, Firmen, Konten, Prinzipien, Lexika, Schemata).
/// The umlaut of aa and oo is written ä and ö (Saal, Säle).
///
/// Sources: Schäfer (2018), Tab. 9.3 to 9.5 and Satz 9.1, pp. 260–261; grammis, unit 4065 (number inflection,
/// including the loanword plurals); Amtliches Regelwerk (2024), § 5 (2), p. 36, and § 9 E2, p. 39.
pub const PLURAL_ENDINGS: &[Rule] = &[
    noun("e", "").from(C::INPUT.or(C::PLURAL)).named(&[PLURAL]),
    noun("e", "")
        .from(C::INPUT.or(C::PLURAL))
        .umlaut(Umlaut::Reverse)
        .named(&[PLURAL]),
    noun("e", "")
        .from(C::INPUT.or(C::PLURAL))
        .umlaut(Umlaut::ReverseDoubled)
        .named(&[PLURAL]),
    noun("er", "").from(C::INPUT.or(C::PLURAL)).named(&[PLURAL]),
    noun("er", "")
        .from(C::INPUT.or(C::PLURAL))
        .umlaut(Umlaut::Reverse)
        .named(&[PLURAL]),
    noun("", "")
        .from(C::INPUT.or(C::PLURAL))
        .umlaut(Umlaut::Reverse)
        .stem(Stem::SchwaSyllable)
        .named(&[PLURAL]),
    noun("", "")
        .from(C::PLURAL)
        .stem(Stem::SchwaSyllable)
        .named(&[PLURAL]),
    noun("en", "").named(&[PLURAL]),
    noun("n", "").stem(Stem::Schwa).named(&[PLURAL]),
    noun("s", "").named(&[PLURAL]),
    noun("nnen", "n").named(&[PLURAL]),
    noun("sse", "s")
        .from(C::INPUT.or(C::PLURAL))
        .named(&[PLURAL]),
    noun("en", "um").named(&[PLURAL]),
    noun("en", "us").named(&[PLURAL]),
    noun("en", "a").named(&[PLURAL]),
    noun("en", "o").named(&[PLURAL]),
    noun("ien", "").named(&[PLURAL]),
    noun("a", "on").named(&[PLURAL]),
    noun("ta", "").named(&[PLURAL]),
];

const fn noun(ending: &'static str, base: &'static str) -> Rule {
    Rule::replace(ending, base).to(C::NOUN)
}

#[cfg(test)]
mod tests {
    use crate::deinflection::german::test_support::yields;

    #[test]
    fn undoes_the_genitive() {
        assert!(yields("Hauses", "Haus", "n", &["genitive"]));
    }

    #[test]
    fn undoes_the_genitive_of_the_mixed_type() {
        assert!(yields("Namens", "Name", "n", &["genitive"]));
    }

    #[test]
    fn undoes_the_ending_of_a_nominalized_adjective() {
        assert!(yields("Angestellter", "Angestellte", "n", &["declined"]));
    }

    #[test]
    fn undoes_the_weak_noun_ending() {
        assert!(yields("Menschen", "Mensch", "n", &["oblique"]));
    }

    #[test]
    fn undoes_the_plural_with_umlaut() {
        assert!(yields("Häuser", "Haus", "n", &["plural"]));
    }

    #[test]
    fn undoes_the_dative_plural() {
        assert!(yields("Häusern", "Haus", "n", &["dative", "plural"]));
    }

    #[test]
    fn undoes_the_dative_plural_of_a_compound() {
        assert!(yields(
            "Kinderbüchern",
            "Kinderbuch",
            "n",
            &["dative", "plural"]
        ));
    }

    #[test]
    fn undoes_a_plural_marked_by_umlaut_alone() {
        assert!(yields("Mütter", "Mutter", "n", &["plural"]));
    }

    #[test]
    fn undoes_the_dative_of_a_plural_without_ending() {
        assert!(yields("Lehrern", "Lehrer", "n", &["dative", "plural"]));
    }

    #[test]
    fn undoes_a_plural_with_the_umlaut_of_a_doubled_vowel() {
        assert!(yields("Säle", "Saal", "n", &["plural"]));
    }

    #[test]
    fn undoes_the_plural_in_n() {
        assert!(yields("Nudeln", "Nudel", "n", &["plural"]));
    }

    #[test]
    fn undoes_the_plural_of_a_noun_in_in() {
        assert!(yields("Ärztinnen", "Ärztin", "n", &["plural"]));
    }

    #[test]
    fn undoes_the_plural_of_a_noun_in_nis() {
        assert!(yields("Kenntnisse", "Kenntnis", "n", &["plural"]));
    }

    #[test]
    fn undoes_a_loanword_plural() {
        assert!(yields("Museen", "Museum", "n", &["plural"]));
    }

    #[test]
    fn leaves_a_lowercase_word_to_the_other_rules() {
        assert!(!yields("tage", "tag", "n", &["plural"]));
    }
}

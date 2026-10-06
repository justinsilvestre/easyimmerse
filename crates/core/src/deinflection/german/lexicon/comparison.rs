//! Adjectives and adverbs whose comparison changes the stem.

use crate::deinflection::german::inflection::*;
use crate::deinflection::german::rule::{Rule, Stem};
use crate::deinflection::german::word_class::WordClasses as C;

/// The few adjectives whose comparative and superlative take umlaut. These rules match at the end of a word,
/// because a compound compares its last part (absatzstärker).
/// Groß drops the s of -st after its ß (größte).
///
/// Sources, by the Wikidata lexeme (CC0) that gives the comparative or superlative, unless noted:
/// alt L343308, arg L343473, arm L343483, dumm L344286, groß L400213, hart L1416847, jung L1446179, klug L588754,
/// krank L495102, nass L495173, rot L818, scharf L844745 (also Schäfer 2018, Tab. 9.13, p. 283), schwach L314298,
/// schwarz L181224, stark L11828, warm L409890; kurz from Schäfer (2018), p. 282, example (69a);
/// lang from Schäfer (2018), p. 220; kalt and grob from grammis, unit 5208 (1), which Wikidata and Schäfer lack.
/// All were checked against grammis, unit 5208 (1); groß against the Amtliches Regelwerk (2024), § 26, p. 48.
pub const UMLAUT_COMPARISON: &[Rule] = &[
    comparative("älter", "alt"),
    superlative("ältest", "alt"),
    comparative("ärger", "arg"),
    superlative("ärgst", "arg"),
    comparative("ärmer", "arm"),
    superlative("ärmst", "arm"),
    comparative("dümmer", "dumm"),
    superlative("dümmst", "dumm"),
    comparative("gröber", "grob"),
    superlative("gröbst", "grob"),
    comparative("größer", "groß"),
    superlative("größt", "groß"),
    comparative("härter", "hart"),
    superlative("härtest", "hart"),
    comparative("jünger", "jung"),
    superlative("jüngst", "jung"),
    comparative("kälter", "kalt"),
    superlative("kältest", "kalt"),
    comparative("klüger", "klug"),
    superlative("klügst", "klug"),
    comparative("kränker", "krank"),
    superlative("kränkst", "krank"),
    comparative("kürzer", "kurz"),
    superlative("kürzest", "kurz"),
    comparative("länger", "lang"),
    superlative("längst", "lang"),
    comparative("nässer", "nass"),
    superlative("nässest", "nass"),
    comparative("röter", "rot"),
    superlative("rötest", "rot"),
    comparative("schärfer", "scharf"),
    superlative("schärfst", "scharf"),
    comparative("schwächer", "schwach"),
    superlative("schwächst", "schwach"),
    comparative("schwärzer", "schwarz"),
    superlative("schwärzest", "schwarz"),
    comparative("stärker", "stark"),
    superlative("stärkst", "stark"),
    comparative("wärmer", "warm"),
    superlative("wärmst", "warm"),
];

/// Comparatives and superlatives with their own stems, which are listed as whole words.
/// Superlative stems such as best are reached only after a declension ending is removed (besten, am besten).
///
/// Sources: gut, viel and wenig: Schäfer (2018), p. 283, and grammis, unit 5208 (4);
/// hoch and nah(e): grammis, unit 5208 (1), and Schäfer (2018), p. 283 (höher);
/// hoh-, the declension stem of hoch: <https://de.wikipedia.org/w/index.php?title=Deutsche_Deklination&oldid=270208356>
/// („Unregelmäßig dekliniertes Adjektiv", which cites Duden, *Die Grammatik*, 8th ed. 2009, p. 366);
/// gern(e) and oft: grammis, Propädeutische Grammatik, unit 6896 (comparison of adverbs).
pub const SUPPLETIVE_COMPARISON: &[Rule] = &[
    whole_comparative("besser", "gut", C::ADJECTIVE),
    whole_superlative("best", "gut", C::ADJECTIVE),
    whole_comparative("mehr", "viel", C::ADJECTIVE),
    whole_superlative("meist", "viel", C::ADJECTIVE),
    whole_comparative("minder", "wenig", C::ADJECTIVE),
    whole_superlative("mindest", "wenig", C::ADJECTIVE),
    whole_comparative("höher", "hoch", C::ADJECTIVE),
    whole_superlative("höchst", "hoch", C::ADJECTIVE),
    Rule::replace("hoh", "hoch")
        .from(C::DECLINED)
        .to(C::ADJECTIVE)
        .stem(Stem::Empty),
    whole_comparative("näher", "nah", C::ADJECTIVE),
    whole_comparative("näher", "nahe", C::ADJECTIVE),
    whole_superlative("nächst", "nah", C::ADJECTIVE),
    whole_superlative("nächst", "nahe", C::ADJECTIVE),
    whole_comparative("lieber", "gern", C::ADVERB),
    whole_comparative("lieber", "gerne", C::ADVERB),
    whole_superlative("liebst", "gern", C::ADVERB),
    whole_superlative("liebst", "gerne", C::ADVERB),
    whole_comparative("öfter", "oft", C::ADVERB),
    whole_superlative("öftest", "oft", C::ADVERB),
];

const fn comparative(form: &'static str, base: &'static str) -> Rule {
    whole_comparative(form, base, C::ADJECTIVE).stem(Stem::Any)
}

const fn superlative(form: &'static str, base: &'static str) -> Rule {
    whole_superlative(form, base, C::ADJECTIVE).stem(Stem::Any)
}

const fn whole_comparative(form: &'static str, base: &'static str, to: C) -> Rule {
    Rule::replace(form, base)
        .from(C::INPUT.or(C::DECLINED))
        .to(to)
        .stem(Stem::Empty)
        .named(&[COMPARATIVE])
}

const fn whole_superlative(form: &'static str, base: &'static str, to: C) -> Rule {
    Rule::replace(form, base)
        .from(C::DECLINED)
        .to(to)
        .stem(Stem::Empty)
        .named(&[SUPERLATIVE])
}

#[cfg(test)]
mod tests {
    use crate::deinflection::german::test_support::yields;

    #[test]
    fn undoes_a_comparative_with_umlaut() {
        assert!(yields("älter", "alt", "adj", &["comparative"]));
    }

    #[test]
    fn undoes_a_declined_superlative_with_umlaut() {
        assert!(yields(
            "größten",
            "groß",
            "adj",
            &["declined", "superlative"]
        ));
    }

    #[test]
    fn undoes_the_comparative_of_a_compound() {
        assert!(yields(
            "absatzstärker",
            "absatzstark",
            "adj",
            &["comparative"]
        ));
    }

    #[test]
    fn undoes_a_suppletive_comparative() {
        assert!(yields("besser", "gut", "adj", &["comparative"]));
    }

    #[test]
    fn undoes_a_suppletive_superlative_after_am() {
        assert!(yields("besten", "gut", "adj", &["declined", "superlative"]));
    }

    #[test]
    fn undoes_the_declension_of_hoch() {
        assert!(yields("hohen", "hoch", "adj", &["declined"]));
    }

    #[test]
    fn undoes_the_comparative_of_an_adverb() {
        assert!(yields("lieber", "gern", "adv", &["comparative"]));
    }

    #[test]
    fn undoes_the_superlative_of_an_adverb() {
        assert!(yields(
            "liebsten",
            "gern",
            "adv",
            &["declined", "superlative"]
        ));
    }
}

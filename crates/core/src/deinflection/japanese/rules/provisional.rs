//! The provisional form in ば, on the hypothetical stem (kateikei).

use super::{godan, ichidan, kuru, sharing, suru, zuru};
use crate::deinflection::japanese::rule::Rule;
use crate::deinflection::japanese::word_class::WordClasses as C;

/// The final う-row vowel of the dictionary form becomes え, and ば follows:
/// godan verbs end in the え row plus ば, ichidan verbs in れば, and 来る, する and ずる in くれば, すれば and ずれば.
///
/// Sources: <https://en.wiktionary.org/w/index.php?title=Appendix:Japanese_verbs&oldid=92311215#Hypothetical_conditional_form>
/// and <https://en.wikipedia.org/w/index.php?title=Japanese_conjugation&oldid=1377029019#Verb_bases> (kateikei).
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
    fn undoes_the_provisional_of_a_zuru_verb() {
        assert!(yields("論ずれば", "論ずる", "vz", &["provisional"]));
    }
}

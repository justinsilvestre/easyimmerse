//! A hand-written test set for adjectives, which Wikidata lists with few forms.
//!
//! The words are our own examples. Their forms follow the declension endings of Schäfer (2018), Tab. 9.12, p. 278,
//! the comparison endings of Tab. 9.13, p. 283, and the irregular and umlaut forms that the lexicon cites.

use super::test_support::recovers;

/// Rows of inflected form, dictionary form and word class.
const ADJECTIVE_CASES: [(&str, &str, &str); 52] = [
    ("kleine", "klein", "adj"),
    ("kleinen", "klein", "adj"),
    ("kleiner", "klein", "adj"),
    ("kleines", "klein", "adj"),
    ("kleinem", "klein", "adj"),
    ("kleinere", "klein", "adj"),
    ("kleineren", "klein", "adj"),
    ("kleinste", "klein", "adj"),
    ("kleinsten", "klein", "adj"),
    ("neue", "neu", "adj"),
    ("neuer", "neu", "adj"),
    ("neueste", "neu", "adj"),
    ("neusten", "neu", "adj"),
    ("dunkle", "dunkel", "adj"),
    ("dunklen", "dunkel", "adj"),
    ("dunkler", "dunkel", "adj"),
    ("dunkelste", "dunkel", "adj"),
    ("teure", "teuer", "adj"),
    ("teuren", "teuer", "adj"),
    ("teurer", "teuer", "adj"),
    ("teuerste", "teuer", "adj"),
    ("noblen", "nobel", "adj"),
    ("bescheidner", "bescheiden", "adj"),
    ("heißeste", "heiß", "adj"),
    ("schnellsten", "schnell", "adj"),
    ("alte", "alt", "adj"),
    ("älter", "alt", "adj"),
    ("älteren", "alt", "adj"),
    ("ältesten", "alt", "adj"),
    ("kürzer", "kurz", "adj"),
    ("kürzeste", "kurz", "adj"),
    ("größer", "groß", "adj"),
    ("größte", "groß", "adj"),
    ("größten", "groß", "adj"),
    ("stärkere", "stark", "adj"),
    ("hohe", "hoch", "adj"),
    ("hohen", "hoch", "adj"),
    ("höher", "hoch", "adj"),
    ("höchste", "hoch", "adj"),
    ("nähere", "nah", "adj"),
    ("nächsten", "nah", "adj"),
    ("besser", "gut", "adj"),
    ("besseren", "gut", "adj"),
    ("beste", "gut", "adj"),
    ("besten", "gut", "adj"),
    ("mehr", "viel", "adj"),
    ("meisten", "viel", "adj"),
    ("lieber", "gern", "adv"),
    ("liebsten", "gern", "adv"),
    ("öfter", "oft", "adv"),
    ("gelesene", "lesen", "v"),
    ("lachende", "lachen", "v"),
];

#[test]
fn recovers_the_dictionary_form_of_every_hand_written_adjective_case() {
    let failures: Vec<_> = ADJECTIVE_CASES
        .iter()
        .filter(|(inflected, term, word_class)| !recovers(inflected, term, word_class))
        .collect();
    assert_eq!(failures, Vec::<&(&str, &str, &str)>::new());
}

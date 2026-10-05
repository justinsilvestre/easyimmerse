//! Lookup of German text, from the looked-up text to the entry of its dictionary form.

use super::build_lookup_results::build_lookup_results;
use super::found_rows::{DictionaryOrigin, FoundEntry};
use super::lookup_candidate::lookup_candidates;
use super::lookup_result::LookupResult;
use crate::dictionary::{DictionaryFormatKind, TermEntry};

fn found(term: &str, word_classes: &[&str], entry_id: i64) -> FoundEntry {
    let mut entry = TermEntry::new(term, Vec::new());
    entry.word_classes = word_classes.iter().map(|name| name.to_string()).collect();
    FoundEntry {
        dictionary: DictionaryOrigin {
            id: "wty-de-en".to_string(),
            title: "German".to_string(),
            format: DictionaryFormatKind::Yomitan,
            rank: 1,
            frequency_mode: None,
        },
        entry_id,
        folded_headword: crate::lookup::fold_case(term),
        entry,
        tags: Vec::new(),
    }
}

fn look_up(text: &str, entries: Vec<FoundEntry>) -> Vec<LookupResult> {
    build_lookup_results(&lookup_candidates(text, "de"), entries, &[])
}

fn finds(text: &str, term: &str, word_classes: &[&str]) -> bool {
    look_up(text, vec![found(term, word_classes, 1)])
        .iter()
        .any(|result| result.term == term)
}

#[test]
fn finds_the_singular_of_a_dative_plural() {
    assert!(finds("Häusern", "Haus", &["n"]));
}

#[test]
fn finds_the_infinitive_of_a_strong_past() {
    assert!(finds("ging", "gehen", &["v"]));
}

#[test]
fn finds_the_infinitive_of_a_strong_participle() {
    assert!(finds("gegangen", "gehen", &["v"]));
}

#[test]
fn finds_the_particle_verb_of_a_zu_infinitive() {
    assert!(finds("anzurufen", "anrufen", &["v"]));
}

#[test]
fn finds_the_particle_verb_of_a_participle() {
    assert!(finds("angerufen", "anrufen", &["v"]));
}

#[test]
fn finds_the_verb_of_a_present_participle() {
    assert!(finds("lesend", "lesen", &["v"]));
}

#[test]
fn finds_the_positive_of_a_suppletive_comparative() {
    assert!(finds("besser", "gut", &["adj"]));
}

#[test]
fn finds_the_positive_of_the_superlative_in_am_besten() {
    assert!(finds("besten", "gut", &["adj"]));
}

#[test]
fn finds_an_adverb_without_word_classes_from_its_comparative() {
    assert!(finds("lieber", "gern", &[]));
}

#[test]
fn finds_a_possessive_without_word_classes_from_a_declined_form() {
    assert!(finds("meinem", "mein", &[]));
}

#[test]
fn finds_the_current_spelling_of_a_pre_reform_word() {
    assert!(finds("daß", "dass", &[]));
}

#[test]
fn finds_the_standard_spelling_of_a_swiss_word() {
    assert!(finds("Strasse", "Straße", &["n"]));
}

#[test]
fn finds_the_infinitive_of_a_2nd_person_with_schwa() {
    assert!(finds("arbeitest", "arbeiten", &["v"]));
}

#[test]
fn finds_the_infinitive_of_a_1st_person_of_a_verb_in_eln() {
    assert!(finds("sammle", "sammeln", &["v"]));
}

#[test]
fn finds_the_infinitive_of_a_2nd_person_after_a_sibilant() {
    assert!(finds("reist", "reisen", &["v"]));
}

#[test]
fn finds_a_verb_capitalized_at_the_start_of_a_sentence() {
    assert!(finds("Gingen", "gehen", &["v"]));
}

#[test]
fn leaves_out_a_bare_imperative_for_an_entry_that_is_not_a_verb() {
    assert!(!finds("Haus", "hausen", &["n"]));
}

#[test]
fn ranks_a_plural_above_a_bare_imperative() {
    let entries = vec![found("vögeln", &["v"], 1), found("Vogel", &["n"], 2)];
    assert_eq!(look_up("Vögel", entries)[0].term, "Vogel");
}

#[test]
fn ranks_a_comparative_above_a_bare_imperative() {
    let entries = vec![found("bessern", &["v"], 1), found("gut", &["adj"], 2)];
    assert_eq!(look_up("besser", entries)[0].term, "gut");
}

#[test]
fn ranks_the_noun_of_a_sentence_initial_word_above_a_bare_imperative() {
    let entries = vec![found("laufen", &["v"], 1), found("Lauf", &["n"], 2)];
    assert_eq!(look_up("Lauf", entries)[0].term, "Lauf");
}

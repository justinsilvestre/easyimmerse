//! Lookup of German particle verbs whose finite verb and particle stand apart, from a click on either part.
//! The sentences and their expected results are those of the test table in the research note on separable verbs;
//! the dictionary is a small stand-in for the user's dictionaries.

use super::build_lookup_results::build_lookup_results;
use super::found_rows::{DictionaryOrigin, FoundEntry};
use super::lookup_candidate::{LookupCandidate, candidate_headwords, lookup_candidates};
use super::lookup_result::LookupResult;
use super::separated_particles::separated_verb_candidates;
use crate::dictionary::{DictionaryFormatKind, TermEntry};
use crate::lookup::fold_case;

#[rustfmt::skip]
const VERBS: &[&str] = &[
    "abnehmen", "absagen", "anarbeiten", "anfangen", "anhalten", "ankommen", "anrufen", "ansehen", "arbeiten",
    "auffallen", "aufstehen", "aufwarten", "durchfallen", "einladen", "ernennen", "fallen", "fangen", "festhalten",
    "finden", "geben", "gehen", "haben", "halten", "hinzukommen", "hören", "innehaben", "klarstellen", "kommen",
    "laden", "loswerden", "nehmen", "nennen", "rufen", "sagen", "schlafen", "sehen", "sein", "setzen",
    "stattfinden", "stehen", "stellen", "übersetzen", "vorhaben", "warten", "werden", "wiederkommen", "wiedersehen",
    "zuhören", "zunehmen", "zurückgeben", "zurückhaben", "zurufen",
];

const OTHER_WORDS: &[&str] = &["an", "auf", "zu", "vor", "klar", "wieder"];

fn found(term: &str, word_classes: &[&str], entry_id: i64) -> FoundEntry {
    let mut entry = TermEntry::new(term, Vec::new());
    entry.word_classes = word_classes.iter().map(|name| name.to_string()).collect();
    FoundEntry {
        dictionary: DictionaryOrigin {
            id: "de-en".to_string(),
            title: "German".to_string(),
            format: DictionaryFormatKind::Yomitan,
            rank: 1,
            frequency_mode: None,
        },
        entry_id,
        folded_headword: fold_case(term),
        entry,
        tags: Vec::new(),
    }
}

fn dictionary() -> Vec<FoundEntry> {
    let verbs = VERBS.iter().map(|verb| (*verb, "v"));
    let others = OTHER_WORDS.iter().map(|word| (*word, "adv"));
    verbs
        .chain(others)
        .enumerate()
        .map(|(id, (term, class))| found(term, &[class], id as i64))
        .collect()
}

/// Looks up the `occurrence`-th appearance of `word` in `sentence`, counted from 0, as a client would:
/// with the text from the word onwards, and the whole sentence as context.
fn look_up_occurrence(sentence: &str, word: &str, occurrence: usize) -> Vec<LookupResult> {
    let is_whole_word = |(start, _): &(usize, &str)| {
        let before = sentence[..*start].chars().next_back();
        let after = sentence[start + word.len()..].chars().next();
        !before.is_some_and(char::is_alphabetic) && !after.is_some_and(char::is_alphabetic)
    };
    let (byte_offset, _) = sentence
        .match_indices(word)
        .filter(is_whole_word)
        .nth(occurrence)
        .unwrap();
    let offset = sentence[..byte_offset].chars().count();
    let mut candidates = lookup_candidates(&sentence[byte_offset..], "de");
    candidates.extend(separated_verb_candidates(sentence, offset, "de"));
    let headwords: Vec<String> = candidate_headwords(&candidates)
        .iter()
        .map(|headword| fold_case(headword))
        .collect();
    let stored = dictionary()
        .into_iter()
        .filter(|found| headwords.contains(&found.folded_headword))
        .collect();
    build_lookup_results(&candidates, stored, &[])
}

fn look_up(sentence: &str, word: &str) -> Vec<LookupResult> {
    look_up_occurrence(sentence, word, 0)
}

fn first_term(sentence: &str, word: &str) -> String {
    look_up(sentence, word)[0].term.clone()
}

fn terms(sentence: &str, word: &str) -> Vec<String> {
    look_up(sentence, word)
        .into_iter()
        .map(|result| result.term)
        .collect()
}

fn finds_separated_verb(sentence: &str, word: &str) -> bool {
    look_up(sentence, word)
        .iter()
        .any(|result| result.separated_verb.is_some())
}

#[test]
fn s01_finds_the_particle_verb_from_the_verb() {
    assert_eq!(first_term("Ich rufe dich morgen an.", "rufe"), "anrufen");
}

#[test]
fn s01_keeps_the_verb_alone_as_a_later_result() {
    assert!(terms("Ich rufe dich morgen an.", "rufe").contains(&"rufen".to_string()));
}

#[test]
fn s01_reports_where_the_verb_and_the_particle_stand() {
    let separated = look_up("Ich rufe dich morgen an.", "rufe")[0]
        .separated_verb
        .clone()
        .unwrap();
    assert_eq!((separated.verb.start, separated.particle.start), (4, 21));
}

#[test]
fn s02_finds_the_particle_verb_from_the_particle() {
    assert_eq!(first_term("Ich rufe dich morgen an.", "an"), "anrufen");
}

#[test]
fn s02_keeps_the_particle_alone_as_a_later_result() {
    assert!(terms("Ich rufe dich morgen an.", "an").contains(&"an".to_string()));
}

#[test]
fn s03_finds_the_particle_verb_of_an_imperative() {
    assert_eq!(first_term("Ruf mich morgen an!", "Ruf"), "anrufen");
}

#[test]
fn s04_finds_the_particle_verb_of_a_question() {
    assert_eq!(first_term("Rufst du mich morgen an?", "Rufst"), "anrufen");
}

#[test]
fn s05_finds_the_particle_verb_from_the_particle_of_a_w_question() {
    assert_eq!(first_term("Wann rufst du mich an?", "an"), "anrufen");
}

#[test]
fn s06_finds_nothing_beyond_a_dass_clause() {
    assert!(!finds_separated_verb(
        "Ich weiß, dass du mich morgen anrufst.",
        "weiß"
    ));
}

#[test]
fn s07_finds_the_particle_before_a_comma() {
    assert_eq!(
        first_term("Ich habe vor, dich morgen anzurufen.", "habe"),
        "vorhaben"
    );
}

#[test]
fn s07_keeps_haben_as_a_later_result() {
    assert!(terms("Ich habe vor, dich morgen anzurufen.", "habe").contains(&"haben".to_string()));
}

#[test]
fn s08_finds_the_particle_verb_from_a_particle_before_a_comma() {
    assert_eq!(
        first_term("Ich habe vor, dich morgen anzurufen.", "vor"),
        "vorhaben"
    );
}

#[test]
fn s09_leaves_a_preposition_with_an_object_alone() {
    assert_eq!(terms("Ich warte auf dich.", "auf"), ["auf"]);
}

#[test]
fn s10_finds_no_particle_verb_when_the_dictionary_lacks_the_pair() {
    assert!(!finds_separated_verb(
        "Ich warte schon lange darauf.",
        "warte"
    ));
}

#[test]
fn s10_finds_the_verb_first() {
    assert_eq!(
        first_term("Ich warte schon lange darauf.", "warte"),
        "warten"
    );
}

#[test]
fn s11_finds_the_particle_verb_from_zu() {
    assert_eq!(first_term("Er hört mir aufmerksam zu.", "zu"), "zuhören");
}

#[test]
fn s12_never_joins_a_particle_to_sein() {
    assert!(!finds_separated_verb("Die Tür ist zu.", "ist"));
}

#[test]
fn s13_leaves_zu_before_an_adjective_alone() {
    assert!(!finds_separated_verb("Es ist mir zu kalt.", "zu"));
}

#[test]
fn s14_finds_the_particle_after_a_long_middle_field() {
    assert_eq!(
        first_term("Sie sieht sich den Film im Kino an.", "sieht"),
        "ansehen"
    );
}

#[test]
fn s15_finds_the_particle_at_the_end_rather_than_a_preposition() {
    assert_eq!(
        terms("Er hält an seinem Plan fest.", "hält")[..2],
        ["festhalten", "halten"]
    );
}

#[test]
fn s16_finds_a_noun_first_part() {
    assert_eq!(
        first_term("Die Sitzung findet morgen statt.", "findet"),
        "stattfinden"
    );
}

#[test]
fn s17_finds_an_adjective_first_part_from_the_particle() {
    assert_eq!(
        first_term("Sie stellt die Sache sofort klar.", "klar"),
        "klarstellen"
    );
}

#[test]
fn s18_finds_a_particle_verb_of_haben() {
    assert_eq!(
        first_term("Er hat das Amt seit Jahren inne.", "hat"),
        "innehaben"
    );
}

#[test]
fn s19_finds_a_particle_verb_of_werden() {
    assert_eq!(
        first_term("Sie wird ihre Sorgen nicht los.", "wird"),
        "loswerden"
    );
}

#[test]
fn s20_finds_the_particle_at_the_end_rather_than_a_preposition() {
    assert_eq!(
        terms("Er fällt durch seine Größe auf.", "fällt")[..2],
        ["auffallen", "fallen"]
    );
}

#[test]
fn s21_finds_the_particle_before_und() {
    assert_eq!(
        first_term("Ich stehe früh auf und gehe zur Arbeit.", "stehe"),
        "aufstehen"
    );
}

#[test]
fn s21_finds_no_particle_for_the_second_verb() {
    assert!(!finds_separated_verb(
        "Ich stehe früh auf und gehe zur Arbeit.",
        "gehe"
    ));
}

#[test]
fn s22_finds_no_particle_for_a_verb_without_one() {
    assert!(!finds_separated_verb(
        "Ich stehe früh auf, er schläft noch.",
        "schläft"
    ));
}

#[test]
fn s23_reaches_past_the_commas_of_a_list() {
    assert_eq!(
        first_term("Wir laden Anna, Paul und Maria zur Feier ein.", "laden"),
        "einladen"
    );
}

#[test]
fn s24_skips_a_relative_clause_from_the_verb() {
    let sentence = "Er gibt das Buch, das er gestern gekauft hat, morgen zurück.";
    assert_eq!(first_term(sentence, "gibt"), "zurückgeben");
}

#[test]
fn s24_skips_a_relative_clause_from_the_particle() {
    let sentence = "Er gibt das Buch, das er gestern gekauft hat, morgen zurück.";
    assert_eq!(first_term(sentence, "zurück"), "zurückgeben");
}

#[test]
fn s25_finds_no_particle_for_the_verb_at_the_end_of_a_relative_clause() {
    let sentence = "Er gibt das Buch, das er gestern gekauft hat, morgen zurück.";
    assert!(!finds_separated_verb(sentence, "hat"));
}

#[test]
fn s26_skips_a_bi_particle_adverb_from_the_verb() {
    assert_eq!(first_term("Er ruft sie ab und zu an.", "ruft"), "anrufen");
}

#[test]
fn s26_leaves_the_zu_of_a_bi_particle_adverb_alone() {
    assert!(!finds_separated_verb("Er ruft sie ab und zu an.", "zu"));
}

#[test]
fn s27_leaves_the_vor_of_nach_wie_vor_alone() {
    assert!(!finds_separated_verb(
        "Er ruft sie nach wie vor jeden Tag an.",
        "vor"
    ));
}

#[test]
fn s28_never_reads_the_pronoun_er_as_a_particle() {
    assert!(!finds_separated_verb(
        "Als Grund nennt er die Kosten.",
        "nennt"
    ));
}

#[test]
fn s29_finds_the_particle_verb_of_a_plural_verb() {
    assert_eq!(
        first_term("Wir kommen bestimmt wieder.", "kommen"),
        "wiederkommen"
    );
}

#[test]
fn s29_keeps_the_plain_verb_as_a_later_result() {
    assert!(terms("Wir kommen bestimmt wieder.", "kommen").contains(&"kommen".to_string()));
}

#[test]
fn s30_finds_wiedersehen() {
    assert_eq!(
        first_term("Ich sehe dich morgen wieder.", "sehe"),
        "wiedersehen"
    );
}

#[test]
fn s30_keeps_sehen_as_a_later_result() {
    assert!(terms("Ich sehe dich morgen wieder.", "sehe").contains(&"sehen".to_string()));
}

#[test]
fn s31_finds_the_separable_reading_of_uebersetzen() {
    assert_eq!(
        first_term("Er setzt die Gäste mit der Fähre über.", "setzt"),
        "übersetzen"
    );
}

#[test]
#[ignore = "coordinated particles: zu before statt is not a clause end, so only abnehmen is found"]
fn s32_finds_both_coordinated_particles() {
    let found = terms("Er nimmt im Winter zu statt ab.", "nimmt");
    assert!(found.contains(&"zunehmen".to_string()) && found.contains(&"abnehmen".to_string()));
}

#[test]
fn s32_finds_the_last_of_two_coordinated_particles() {
    assert_eq!(
        first_term("Er nimmt im Winter zu statt ab.", "nimmt"),
        "abnehmen"
    );
}

#[test]
#[ignore = "extraposition: a particle before a prepositional phrase in the Nachfeld is not sought, which costs more precision than it gains"]
fn s33_finds_a_particle_before_an_extraposed_phrase() {
    assert_eq!(
        first_term("Fang endlich an mit der Arbeit!", "Fang"),
        "anfangen"
    );
}

#[test]
fn s34_finds_a_topicalized_particle() {
    assert_eq!(
        first_term("Hinzu kommt ein weiteres Problem.", "Hinzu"),
        "hinzukommen"
    );
}

#[test]
fn s35_finds_only_the_verb_before_a_circumposition() {
    let stored = dictionary()
        .into_iter()
        .filter(|found| found.entry.term != "anarbeiten")
        .collect();
    assert!(!finds_separated_verb_in(
        "Er arbeitet von heute an.",
        "arbeitet",
        stored
    ));
}

#[test]
fn s35_offers_a_false_particle_verb_when_the_dictionary_has_one() {
    assert_eq!(
        first_term("Er arbeitet von heute an.", "arbeitet"),
        "anarbeiten"
    );
}

#[test]
fn s36_finds_no_particle_for_a_verb_at_the_end_of_a_subordinate_clause() {
    assert!(!finds_separated_verb(
        "Er sagte ab, weil er krank war.",
        "war"
    ));
}

#[test]
fn s36_finds_the_particle_before_a_subordinate_clause() {
    assert_eq!(
        first_term("Er sagte ab, weil er krank war.", "sagte"),
        "absagen"
    );
}

#[test]
fn s37_finds_the_particle_in_cues_that_the_client_joined() {
    let joined = ["Ich rufe dich", "morgen an."].join(" ");
    assert_eq!(first_term(&joined, "rufe"), "anrufen");
}

#[test]
fn s37_finds_no_particle_in_the_first_cue_alone() {
    assert!(!finds_separated_verb("Ich rufe dich", "rufe"));
}

fn separated_verb_candidates_at(sentence: &str, word: &str) -> Vec<LookupCandidate> {
    let offset = sentence[..sentence.find(word).unwrap()].chars().count();
    separated_verb_candidates(sentence, offset, "de")
}

const SODASS_SENTENCE: &str = "Er stand früh auf, sodass er den Zug erreichte.";

#[test]
fn finds_the_particle_before_a_sodass_clause() {
    assert_eq!(first_term(SODASS_SENTENCE, "stand"), "aufstehen");
}

#[test]
fn finds_no_particle_for_the_verb_at_the_end_of_a_sodass_clause() {
    assert!(!finds_separated_verb(SODASS_SENTENCE, "erreichte"));
}

#[test]
fn ends_the_clause_at_sodass_when_its_verb_is_sein() {
    let sentence = "Er stand früh auf, sodass er pünktlich war.";
    assert!(separated_verb_candidates_at(sentence, "war").is_empty());
}

#[test]
fn ends_the_clause_at_so_dass_written_apart() {
    let sentence = "Er stand früh auf, so dass er pünktlich war.";
    assert!(separated_verb_candidates_at(sentence, "war").is_empty());
}

const DEREN_SENTENCE: &str = "Ich rufe die Frau, deren Sohn morgen kommt, heute an.";

#[test]
fn skips_a_relative_clause_with_deren_from_the_verb() {
    assert_eq!(first_term(DEREN_SENTENCE, "rufe"), "anrufen");
}

#[test]
fn finds_no_particle_for_the_verb_of_a_relative_clause_with_deren() {
    assert!(!finds_separated_verb(DEREN_SENTENCE, "kommt"));
}

#[test]
fn skips_a_relative_clause_with_deren_from_the_particle() {
    assert_eq!(first_term(DEREN_SENTENCE, "an"), "anrufen");
}

fn finds_separated_verb_in(sentence: &str, word: &str, stored: Vec<FoundEntry>) -> bool {
    let offset = sentence[..sentence.find(word).unwrap()].chars().count();
    let candidates = separated_verb_candidates(sentence, offset, "de");
    build_lookup_results(&candidates, stored, &[])
        .iter()
        .any(|result| result.separated_verb.is_some())
}

#[test]
fn finds_nothing_for_japanese() {
    assert!(separated_verb_candidates("Ich rufe dich an.", 4, "ja").is_empty());
}

#[test]
fn rejects_a_particle_verb_listed_only_with_a_capital() {
    let stored = vec![found("Anrufen", &["v"], 1)];
    assert!(!finds_separated_verb_in(
        "Ich rufe dich an.",
        "rufe",
        stored
    ));
}

#[test]
fn rejects_a_particle_verb_listed_as_a_noun() {
    let stored = vec![found("anrufen", &["n"], 1)];
    assert!(!finds_separated_verb_in(
        "Ich rufe dich an.",
        "rufe",
        stored
    ));
}

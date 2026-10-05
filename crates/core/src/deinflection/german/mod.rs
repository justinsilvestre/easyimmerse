//! A rule-based deinflector for German verbs, nouns, adjectives and declined determiners.
//!
//! Regular rules replace endings, and may reverse an umlaut or remove the ge- and zu of non-finite verb forms.
//! Irregular forms, such as those of strong verbs, are listed in a lexicon. Rules chain, so that gelesenen is traced
//! back through gelesen to lesen. The rule groups and their sources are listed in `docs/german-deinflection-sources.md`.

mod inflection;
mod lexicon;
mod opening;
mod particles;
mod rule;
mod rules;
mod search;
mod spelling;
mod word_class;

use super::Deinflection;
use search::Found;

/// Lists the dictionary forms that the German `text` may be an inflection of, starting with the text itself, unchanged.
/// Other spellings of the text, such as the lowercase form of a capitalized word, follow as unchanged forms of their own.
pub fn deinflect(text: &str) -> Vec<Deinflection> {
    let variants = spelling::variants(text);
    let mut found: Vec<Found> = Vec::new();
    for variant in &variants {
        search::search(variant, &mut found);
    }
    let unchanged = variants
        .iter()
        .map(|variant| Deinflection::unchanged(variant));
    unchanged
        .chain(found.into_iter().map(into_deinflection))
        .collect()
}

/// Whether `deinflection` is a finite verb form: one that agrees with a subject in person and number
/// (rufe, rief, ruft), or an imperative. Participles, infinitives and declined forms are not finite.
pub fn is_finite_verb(deinflection: &Deinflection) -> bool {
    deinflection.word_classes.iter().any(|class| class == "v")
        && matches!(deinflection.inflections.as_slice(), [only] if inflection::finite_form(only).is_some())
}

/// Whether `deinflection` is an imperative singular, which lookup ranks below other readings,
/// because the bare-stem imperative rule fits almost any word.
pub(super) fn is_fallback(deinflection: &Deinflection) -> bool {
    matches!(deinflection.inflections.as_slice(), [only] if only == inflection::IMPERATIVE_SG)
}

fn into_deinflection(found: Found) -> Deinflection {
    Deinflection {
        term: found.text,
        word_classes: found.classes.dictionary_names(),
        inflections: found.inflections.into_iter().map(String::from).collect(),
    }
}

#[cfg(test)]
pub(super) mod test_support {
    /// Whether deinflecting `text` yields `term` in `word_class` through exactly `inflections`.
    pub fn yields(text: &str, term: &str, word_class: &str, inflections: &[&str]) -> bool {
        super::deinflect(text).iter().any(|candidate| {
            candidate.term == term
                && candidate
                    .word_classes
                    .iter()
                    .any(|class| class == word_class)
                && candidate.inflections == inflections
        })
    }

    /// Whether deinflecting `text` yields `term` in `word_class` through any inflections.
    pub fn recovers(text: &str, term: &str, word_class: &str) -> bool {
        super::deinflect(text).iter().any(|candidate| {
            candidate.term == term
                && candidate
                    .word_classes
                    .iter()
                    .any(|class| class == word_class)
        })
    }
}

#[cfg(test)]
mod adjective_cases;
#[cfg(test)]
mod oracle_tests;

#[cfg(test)]
mod tests {
    use super::test_support::yields;
    use super::{deinflect, is_fallback, is_finite_verb};
    use crate::deinflection::Deinflection;

    fn reading(text: &str, term: &str, inflections: &[&str]) -> Deinflection {
        deinflect(text)
            .into_iter()
            .find(|candidate| candidate.term == term && candidate.inflections == inflections)
            .expect("the reading is among the candidates")
    }

    #[test]
    fn puts_the_unchanged_text_first() {
        assert_eq!(deinflect("Häusern")[0], Deinflection::unchanged("Häusern"));
    }

    #[test]
    fn lists_the_lowercase_spelling_as_unchanged() {
        assert!(deinflect("Über").contains(&Deinflection::unchanged("über")));
    }

    #[test]
    fn lists_the_current_spelling_of_a_pre_reform_word_as_unchanged() {
        assert!(deinflect("daß").contains(&Deinflection::unchanged("dass")));
    }

    #[test]
    fn deinflects_a_capitalized_verb_at_the_start_of_a_sentence() {
        assert!(yields("Gingen", "gehen", "v", &["past 1pl/3pl"]));
    }

    #[test]
    fn deinflects_a_capitalized_noun_keeping_its_capital() {
        assert!(yields("Häusern", "Haus", "n", &["dative", "plural"]));
    }

    #[test]
    fn deinflects_a_pre_reform_spelling() {
        assert!(yields("mußte", "müssen", "v", &["past 1sg/3sg"]));
    }

    #[test]
    fn deinflects_a_swiss_spelling() {
        assert!(yields("Strassen", "Straße", "n", &["plural"]));
    }

    #[test]
    fn deinflects_the_participle_of_a_verb_with_a_word_list_particle() {
        assert!(yields("losgegangen", "losgehen", "v", &["past participle"]));
    }

    #[test]
    fn deinflects_the_participle_of_a_verb_with_an_adjective_first_part() {
        assert!(yields(
            "festgehalten",
            "festhalten",
            "v",
            &["past participle"]
        ));
    }

    #[test]
    fn deinflects_the_participle_of_a_verb_with_a_colloquial_particle() {
        assert!(yields(
            "reingekommen",
            "reinkommen",
            "v",
            &["past participle"]
        ));
    }

    #[test]
    fn deinflects_a_joined_past_of_a_verb_with_a_noun_first_part() {
        assert!(yields("teilnahm", "teilnehmen", "v", &["past 1sg/3sg"]));
    }

    #[test]
    fn reads_ging_only_as_a_past() {
        let readings: Vec<_> = deinflect("ging")
            .into_iter()
            .filter(|candidate| candidate.term == "gehen")
            .map(|candidate| candidate.inflections)
            .collect();
        assert_eq!(readings, [["past 1sg/3sg"]]);
    }

    #[test]
    fn reads_waer_as_a_subjunctive_ii() {
        assert!(yields("wär", "sein", "v", &["subjunctive II 1sg/3sg"]));
    }

    #[test]
    fn deinflects_a_declined_determiner() {
        assert!(yields("meinem", "mein", "det", &["declined"]));
    }

    #[test]
    fn deinflects_a_determiner_to_its_form_in_er() {
        assert!(yields("diesem", "dieser", "det", &["declined"]));
    }

    #[test]
    fn leaves_a_personal_pronoun_alone() {
        assert!(
            !deinflect("mir")
                .iter()
                .any(|candidate| candidate.term == "ich")
        );
    }

    #[test]
    fn lists_each_term_and_inflection_chain_once() {
        let candidates = deinflect("gelesenen");
        let mut chains: Vec<_> = candidates
            .iter()
            .map(|candidate| (&candidate.term, &candidate.inflections))
            .collect();
        chains.sort();
        chains.dedup();
        assert_eq!(chains.len(), candidates.len());
    }

    #[test]
    fn keeps_the_candidates_for_a_long_word_few() {
        assert!(deinflect("Geschwindigkeitsbegrenzungen").len() < 100);
    }

    #[test]
    fn treats_a_present_form_as_finite() {
        assert!(is_finite_verb(&reading("rufe", "rufen", &["present 1sg"])));
    }

    #[test]
    fn treats_a_strong_past_form_as_finite() {
        assert!(is_finite_verb(&reading("rief", "rufen", &["past 1sg/3sg"])));
    }

    #[test]
    fn treats_a_joined_particle_verb_form_as_finite() {
        assert!(is_finite_verb(&reading(
            "anrief",
            "anrufen",
            &["past 1sg/3sg"]
        )));
    }

    #[test]
    fn treats_a_participle_as_non_finite() {
        assert!(!is_finite_verb(&reading(
            "angerufen",
            "anrufen",
            &["past participle"]
        )));
    }

    #[test]
    fn treats_a_zu_infinitive_as_non_finite() {
        assert!(!is_finite_verb(&reading(
            "anzurufen",
            "anrufen",
            &["zu-infinitive"]
        )));
    }

    #[test]
    fn treats_the_unchanged_text_as_non_finite() {
        assert!(!is_finite_verb(&Deinflection::unchanged("rufen")));
    }

    #[test]
    fn treats_a_noun_plural_as_non_finite() {
        assert!(!is_finite_verb(&reading("Häuser", "Haus", &["plural"])));
    }

    #[test]
    fn treats_the_imperative_singular_as_a_fallback() {
        assert!(is_fallback(&reading("lach", "lachen", &["imperative sg"])));
    }

    #[test]
    fn treats_the_present_as_no_fallback() {
        assert!(!is_fallback(&reading(
            "lacht",
            "lachen",
            &["present 3sg/2pl"]
        )));
    }
}

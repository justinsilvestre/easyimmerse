//! Narrows the readings of regular verb endings for the verbs whose irregular forms the lexicon lists.
//!
//! A regular ending can name forms that an irregular verb builds otherwise: lauft cannot be the 3rd person singular
//! of laufen, whose 3rd person is läuft, so lauft is only its 2nd person plural (and imperative plural).

use std::collections::HashMap;
use std::sync::LazyLock;

use super::irregular_verbs::{IRREGULAR_VERBS, IrregularVerb};
use super::suppletive_forms::{MODAL_AND_AUXILIARY_PRESENT, N_INFINITIVE_FORMS};
use crate::deinflection::german::inflection::{
    PAST_PARTICIPLE, Paradigm, Persons, finite_form, finite_name,
};
use crate::deinflection::german::opening::particle_splits;

/// Verbs with both strong (or mixed) and weak forms, whose regular forms all stay possible.
///
/// Sources: grammis, Propädeutische Grammatik, unit 4074, the two tables of verbs with strong and weak forms
/// (erschallen as formed from schallen); dingen from Wikidata lexeme L883783 (abdingen: dingte, abgedingt), CC0.
#[rustfmt::skip]
const VERBS_WITH_WEAK_FORMS: [&str; 46] = [
    "dingen",
    "dünken", "erkiesen", "fragen", "gleiten", "glimmen", "hauen", "klimmen", "kreischen", "küren", "löschen",
    "mahlen", "melken", "salzen", "saugen", "schallen", "erschallen", "schinden", "schleißen", "schmeißen",
    "schnauben", "sieden", "spalten", "stieben", "triefen", "wägen", "winken", "backen", "bewegen", "bleichen",
    "erschrecken", "gären", "hängen", "pflegen", "quellen", "schaffen", "scheren", "schleifen", "schmelzen",
    "schwellen", "senden", "stecken", "weben", "weichen", "wenden", "wiegen",
];

/// The forms that the lexicon gives a verb instead of the regular ones.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Exceptions {
    present: Persons,
    past: bool,
    subjunctive_ii: bool,
    participle: bool,
}

static EXCEPTIONS: LazyLock<HashMap<&'static str, Exceptions>> = LazyLock::new(build_exceptions);

/// The reading that a regular verb rule may keep for `term`, given that it names `reading`:
/// the reading itself, a narrower one without the persons that the lexicon gives other forms, or none.
/// Verbs formed with an inseparable prefix are left alone, because weak verbs such as bereiten share their shape.
pub(in crate::deinflection::german) fn legitimate_reading(
    term: &str,
    reading: &'static str,
) -> Option<&'static str> {
    let Some(exceptions) = exceptions_for(term) else {
        return Some(reading);
    };
    if reading == PAST_PARTICIPLE {
        return (!exceptions.participle).then_some(reading);
    }
    let Some(form) = finite_form(reading) else {
        return Some(reading);
    };
    match form.paradigm {
        Paradigm::Present => {
            finite_name(Paradigm::Present, form.persons.without(exceptions.present))
        }
        Paradigm::Past => (!exceptions.past).then_some(reading),
        Paradigm::SubjunctiveII => (!exceptions.subjunctive_ii).then_some(reading),
        Paradigm::SubjunctiveI | Paradigm::Imperative => Some(reading),
    }
}

fn exceptions_for(term: &str) -> Option<Exceptions> {
    let after_particles = particle_splits(term).into_iter().map(|split| split.rest);
    std::iter::once(term)
        .chain(after_particles)
        .find_map(|verb| EXCEPTIONS.get(verb).copied())
}

fn build_exceptions() -> HashMap<&'static str, Exceptions> {
    let mut exceptions: HashMap<&'static str, Exceptions> = IRREGULAR_VERBS
        .iter()
        .filter(|verb| !VERBS_WITH_WEAK_FORMS.contains(&verb.infinitive))
        .map(|verb| (verb.infinitive, listed_exceptions(verb)))
        .collect();
    for &(_, infinitive, readings) in MODAL_AND_AUXILIARY_PRESENT
        .iter()
        .chain(&N_INFINITIVE_FORMS)
    {
        if let Some(entry) = exceptions.get_mut(infinitive) {
            entry.present = entry.present.or(present_persons(readings));
        }
    }
    exceptions
}

fn listed_exceptions(verb: &IrregularVerb) -> Exceptions {
    let second = if verb.present_2sg.is_empty() {
        Persons::NONE
    } else {
        Persons::SECOND_SINGULAR
    };
    let third = if verb.present_3sg.is_empty() {
        Persons::NONE
    } else {
        Persons::THIRD_SINGULAR
    };
    Exceptions {
        present: second.or(third),
        past: !verb.past.is_empty(),
        subjunctive_ii: !verb.subjunctive_ii.is_empty(),
        participle: !verb.past_participle.is_empty(),
    }
}

fn present_persons(readings: &[&str]) -> Persons {
    readings
        .iter()
        .filter_map(|reading| finite_form(reading))
        .filter(|form| form.paradigm == Paradigm::Present)
        .fold(Persons::NONE, |persons, form| persons.or(form.persons))
}

#[cfg(test)]
mod tests {
    use super::legitimate_reading;

    #[test]
    fn narrows_a_3rd_singular_reading_of_a_verb_with_an_irregular_3rd_singular() {
        assert_eq!(
            legitimate_reading("laufen", "present 3sg/2pl"),
            Some("present 2pl")
        );
    }

    #[test]
    fn drops_a_2nd_singular_reading_of_a_verb_with_an_irregular_2nd_singular() {
        assert_eq!(legitimate_reading("laufen", "present 2sg"), None);
    }

    #[test]
    fn keeps_the_imperative_plural_of_an_irregular_verb() {
        assert_eq!(
            legitimate_reading("nehmen", "imperative pl"),
            Some("imperative pl")
        );
    }

    #[test]
    fn drops_a_weak_past_of_a_strong_verb() {
        assert_eq!(legitimate_reading("gehen", "past 1sg/3sg"), None);
    }

    #[test]
    fn keeps_a_weak_past_of_a_verb_with_weak_forms() {
        assert_eq!(
            legitimate_reading("backen", "past 1sg/3sg"),
            Some("past 1sg/3sg")
        );
    }

    #[test]
    fn narrows_the_readings_of_a_particle_verb() {
        assert_eq!(
            legitimate_reading("anfahren", "present 3sg/2pl"),
            Some("present 2pl")
        );
    }

    #[test]
    fn leaves_a_regular_verb_alone() {
        assert_eq!(
            legitimate_reading("lachen", "present 3sg/2pl"),
            Some("present 3sg/2pl")
        );
    }

    #[test]
    fn leaves_a_weak_verb_with_an_inseparable_prefix_alone() {
        assert_eq!(
            legitimate_reading("bereiten", "past 1sg/3sg"),
            Some("past 1sg/3sg")
        );
    }

    #[test]
    fn drops_the_regular_1st_singular_of_a_modal_verb() {
        assert_eq!(legitimate_reading("dürfen", "present 1sg"), None);
    }
}

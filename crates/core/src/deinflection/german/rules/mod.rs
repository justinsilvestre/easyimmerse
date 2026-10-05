//! The tables of regular rules, one module per group of related inflections.
//! Irregular forms are listed in the lexicon instead, apart from the umlaut comparatives, which match at the end of a word.

mod adjective;
mod finite;
mod non_finite;
mod noun;

use super::lexicon::comparison::UMLAUT_COMPARISON;
use super::rule::Rule;

/// Every group of regular rules.
pub const ALL: &[&[Rule]] = &[
    finite::PRESENT,
    finite::WEAK_PAST,
    finite::EL_ER_INFINITIVE,
    non_finite::PARTICIPLES,
    non_finite::ZU_INFINITIVES,
    non_finite::PRESENT_PARTICIPLES,
    noun::CASE,
    noun::PLURAL_ENDINGS,
    adjective::DECLENSION,
    adjective::COMPARISON,
    UMLAUT_COMPARISON,
];

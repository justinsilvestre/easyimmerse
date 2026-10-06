//! Irregular forms, listed word by word and looked up by the whole remaining word.

pub mod comparison;
mod determiners;
mod irregular_verbs;
mod regular_readings;
mod suppletive_forms;
mod verb_forms;
mod weak_verbs;

use std::collections::HashMap;
use std::sync::LazyLock;

use super::inflection::DECLINED;
use super::opening::Opening;
use super::rule::Rule;
use super::word_class::WordClasses as C;
pub(super) use regular_readings::legitimate_reading;
use suppletive_forms::SuppletiveForm;
use verb_forms::{lexical, verb_rules};

/// Rules for single listed forms, indexed by the form.
pub(super) struct Lexicon {
    rules_by_form: HashMap<String, Vec<Rule>>,
}

pub(super) static LEXICON: LazyLock<Lexicon> = LazyLock::new(Lexicon::build);

impl Lexicon {
    /// The rules whose form is exactly `rest`.
    pub fn rules_for(&self, rest: &str) -> &[Rule] {
        self.rules_by_form.get(rest).map_or(&[], Vec::as_slice)
    }

    fn build() -> Self {
        let mut rules_by_form: HashMap<String, Vec<Rule>> = HashMap::new();
        for rule in all_rules() {
            rules_by_form
                .entry(rule.ending.to_string())
                .or_default()
                .push(rule);
        }
        Self { rules_by_form }
    }
}

fn all_rules() -> impl Iterator<Item = Rule> {
    let verbs = irregular_verbs::IRREGULAR_VERBS
        .iter()
        .chain(&irregular_verbs::WEAK_VERBS_WITH_STRONG_FORMS)
        .flat_map(verb_rules);
    let suppletive = suppletive_forms::MODAL_AND_AUXILIARY_PRESENT
        .iter()
        .chain(&suppletive_forms::SEIN_SUBJUNCTIVE)
        .chain(&suppletive_forms::N_INFINITIVE_FORMS)
        .map(suppletive_rule);
    verbs
        .chain(suppletive)
        .chain(comparison::SUPPLETIVE_COMPARISON.iter().cloned())
        .chain(determiner_rules())
}

fn suppletive_rule(&(form, base, readings): &SuppletiveForm) -> Rule {
    lexical(form.to_string(), base, Opening::Prefixed, readings)
}

fn determiner_rules() -> impl Iterator<Item = Rule> {
    let bare = determiners::BARE_STEMS.iter().flat_map(|&(stem, base)| {
        determiners::ENDINGS
            .iter()
            .map(move |ending| (format!("{stem}{ending}"), base))
    });
    let short = determiners::SHORT_ENDINGS
        .iter()
        .map(|&(stem, ending)| (format!("{stem}{ending}"), stem));
    let er = determiners::ER_STEMS.iter().flat_map(|&(stem, base)| {
        determiners::ENDINGS
            .iter()
            .map(move |ending| (format!("{stem}{ending}"), base))
    });
    bare.chain(short)
        .chain(er)
        .filter(|(form, base)| form != base)
        .map(|(form, base)| lexical(form, base, Opening::Free, &[DECLINED]).to(C::DETERMINER))
}

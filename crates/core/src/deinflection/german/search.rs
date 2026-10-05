//! A breadth-first search that applies rules in chains, so that stacked inflections are undone.

use super::lexicon::LEXICON;
use super::opening::Opening;
use super::rule::Rule;
use super::rules::ALL;
use super::word_class::WordClasses;

/// The most rules applied in one chain. The longest supported chains, such as a declined participle of a verb in -el, need four.
const MAX_CHAIN_LENGTH: usize = 6;

/// The openings under which the lexicon's forms are looked up.
const LEXICON_OPENINGS: [Opening; 4] = [
    Opening::Free,
    Opening::Prefixed,
    Opening::Augment,
    Opening::Inseparable,
];

/// A dictionary form reached through a chain of rules.
#[derive(Debug, Clone)]
pub(super) struct Found {
    pub text: String,
    pub classes: WordClasses,
    pub inflections: Vec<&'static str>,
}

/// Adds to `found` the dictionary forms reachable from `text` through chains of rules, in order of chain length.
/// A form already found with the same inflections gains the new classes instead of being listed twice.
pub(super) fn search(text: &str, found: &mut Vec<Found>) {
    let mut frontier = vec![Found {
        text: text.to_string(),
        classes: WordClasses::INPUT,
        inflections: Vec::new(),
    }];
    for _ in 0..MAX_CHAIN_LENGTH {
        frontier = frontier.iter().flat_map(expand).collect();
        frontier
            .iter()
            .for_each(|candidate| record(found, candidate));
        if frontier.is_empty() {
            break;
        }
    }
}

fn expand(candidate: &Found) -> Vec<Found> {
    let regular = ALL.iter().flat_map(|group| group.iter()).flat_map(|rule| {
        rule.opening
            .splits(&candidate.text)
            .into_iter()
            .filter_map(move |split| rule.undo(&candidate.text, split, candidate.classes))
            .flat_map(move |text| apply(candidate, rule, text))
    });
    let listed = LEXICON_OPENINGS.iter().flat_map(|opening| {
        opening
            .splits(&candidate.text)
            .into_iter()
            .flat_map(move |split| {
                LEXICON
                    .rules_for(split.rest)
                    .iter()
                    .filter(move |rule| rule.opening == *opening)
                    .filter_map(move |rule| {
                        let text = rule.undo(&candidate.text, split, candidate.classes)?;
                        Some(apply(candidate, rule, text))
                    })
                    .flatten()
            })
    });
    regular.chain(listed).collect()
}

/// The candidates that `rule` gives when it turns `candidate` into `text`: one per reading, or one if it names none.
fn apply(candidate: &Found, rule: &Rule, text: String) -> Vec<Found> {
    let chain = |reading: Option<&'static str>| Found {
        text: text.clone(),
        classes: rule.to,
        inflections: candidate
            .inflections
            .iter()
            .copied()
            .chain(reading)
            .collect(),
    };
    if rule.readings.is_empty() {
        return vec![chain(None)];
    }
    rule.readings
        .iter()
        .map(|reading| chain(Some(reading)))
        .collect()
}

fn record(found: &mut Vec<Found>, candidate: &Found) {
    if candidate.text.is_empty() || !candidate.classes.intersects(WordClasses::DICTIONARY) {
        return;
    }
    let same = found.iter_mut().find(|existing| {
        existing.text == candidate.text && existing.inflections == candidate.inflections
    });
    match same {
        Some(existing) => existing.classes = existing.classes.or(candidate.classes),
        None => found.push(candidate.clone()),
    }
}

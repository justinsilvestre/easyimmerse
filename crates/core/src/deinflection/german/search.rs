//! A breadth-first search that applies rules in chains, so that stacked inflections are undone.

use super::lexicon::{LEXICON, legitimate_reading};
use super::opening::{Opening, Split};
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

const ALL_OPENINGS: [Opening; 5] = [
    Opening::Free,
    Opening::Prefixed,
    Opening::Augment,
    Opening::Inseparable,
    Opening::ZuInfix,
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
    let splits = Splits::of(&candidate.text);
    let regular = ALL.iter().flat_map(|group| group.iter()).flat_map(|rule| {
        splits
            .under(rule.opening)
            .iter()
            .filter_map(move |split| rule.undo(&candidate.text, *split, candidate.classes))
            .flat_map(move |text| apply(candidate, rule, text, Origin::Regular))
    });
    let listed = LEXICON_OPENINGS.iter().flat_map(|opening| {
        splits.under(*opening).iter().flat_map(move |split| {
            LEXICON
                .rules_for(split.rest)
                .iter()
                .filter(move |rule| rule.opening == *opening)
                .filter_map(move |rule| {
                    let text = rule.undo(&candidate.text, *split, candidate.classes)?;
                    Some(apply(candidate, rule, text, Origin::Listed))
                })
                .flatten()
        })
    });
    regular.chain(listed).collect()
}

/// Whether a rule is a regular ending rule or a listed irregular form.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Origin {
    Regular,
    Listed,
}

/// The ways of dividing one text under each opening, computed once per text.
struct Splits<'a> {
    by_opening: Vec<(Opening, Vec<Split<'a>>)>,
}

impl<'a> Splits<'a> {
    fn of(text: &'a str) -> Self {
        let by_opening = ALL_OPENINGS
            .iter()
            .map(|opening| (*opening, opening.splits(text)))
            .collect();
        Self { by_opening }
    }

    fn under(&self, opening: Opening) -> &[Split<'a>] {
        self.by_opening
            .iter()
            .find(|(candidate, _)| *candidate == opening)
            .map_or(&[], |(_, splits)| splits.as_slice())
    }
}

/// The candidates that `rule` gives when it turns `candidate` into `text`: one per reading, or one if it names none.
/// A regular verb rule keeps only the readings that are legitimate for an irregular verb in the lexicon.
fn apply(candidate: &Found, rule: &Rule, text: String, origin: Origin) -> Vec<Found> {
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
    let filters_readings = origin == Origin::Regular && rule.to.intersects(WordClasses::VERB);
    rule.readings
        .iter()
        .filter_map(|reading| {
            if filters_readings {
                legitimate_reading(&text, reading)
            } else {
                Some(*reading)
            }
        })
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

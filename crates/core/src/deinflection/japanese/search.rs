//! A breadth-first search that applies rules in chains, so that stacked inflections are undone.

use super::rule::Rule;
use super::word_class::WordClasses;
use crate::deinflection::Deinflection;

/// The most rules applied in one chain. The longest supported chains need about eight.
const MAX_CHAIN_LENGTH: usize = 12;

#[derive(Debug, Clone)]
struct Candidate {
    text: String,
    classes: WordClasses,
    inflections: Vec<&'static str>,
}

/// Lists the dictionary forms reachable from `text` through chains of `rules`,
/// after the unchanged text and in order of chain length.
pub(super) fn search(text: &str, rules: &[&[Rule]]) -> Vec<Deinflection> {
    let mut found: Vec<Candidate> = Vec::new();
    let mut frontier = vec![Candidate {
        text: text.to_string(),
        classes: WordClasses::UNDEINFLECTED,
        inflections: Vec::new(),
    }];
    for _ in 0..MAX_CHAIN_LENGTH {
        frontier = expand(&frontier, rules);
        frontier
            .iter()
            .for_each(|candidate| record(&mut found, candidate));
        if frontier.is_empty() {
            break;
        }
    }
    let deinflections = found.into_iter().map(into_deinflection);
    std::iter::once(Deinflection::unchanged(text))
        .chain(deinflections)
        .collect()
}

fn expand(frontier: &[Candidate], rules: &[&[Rule]]) -> Vec<Candidate> {
    let all_rules = rules.iter().flat_map(|group| group.iter());
    let pairs = frontier
        .iter()
        .flat_map(|candidate| all_rules.clone().map(move |rule| (candidate, rule)));
    pairs
        .filter_map(|(candidate, rule)| apply(candidate, rule))
        .collect()
}

fn apply(candidate: &Candidate, rule: &Rule) -> Option<Candidate> {
    let text = rule.undo(&candidate.text, candidate.classes)?;
    let inflections = [candidate.inflections.as_slice(), rule.inflections].concat();
    Some(Candidate {
        text,
        classes: rule.to,
        inflections,
    })
}

/// Keeps a candidate that is a dictionary form, merging the classes of one already found
/// with the same term and inflections.
fn record(found: &mut Vec<Candidate>, candidate: &Candidate) {
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

fn into_deinflection(candidate: Candidate) -> Deinflection {
    Deinflection {
        term: candidate.text,
        word_classes: candidate.classes.dictionary_names(),
        inflections: candidate
            .inflections
            .into_iter()
            .map(String::from)
            .collect(),
    }
}

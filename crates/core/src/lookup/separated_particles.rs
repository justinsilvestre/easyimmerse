//! Finding the particle verb that a looked-up word belongs to when its finite verb and particle stand apart,
//! as rufe and an in „Ich rufe dich morgen an", from the sentence around the word and without a part-of-speech tagger.
//!
//! The particle stands at the end of the clause of its finite verb, in the right sentence bracket.
//! Each pair of a finite verb and a word in that position is offered as a particle verb,
//! and the user's dictionaries decide which of them exist. `docs/german-deinflection-sources.md` gives the sources.

use super::context_sentence::{SentenceToken, sentence_around};
use super::german_clause_words::{
    BI_PARTICLE_ADVERBS, COMPARISON_PARTICLES, COORDINATORS, NEVER_SEPARATED_PREFIXES,
    PREPOSITIONS, RELATIVE_PRONOUNS, SUBJUNCTIONS, UNSEPARABLE_BASES, W_WORDS,
};
use super::lookup_candidate::LookupCandidate;
use super::separated_verb::{ContextWord, SeparatedVerb};
use crate::deinflection::german::is_finite_verb;
use crate::deinflection::{Deinflection, deinflect, is_fallback};

/// Lists the particle verbs that the word at `offset` in `context` may be part of, as finite verb or as particle.
/// `offset` counts characters. Only German text yields candidates.
pub fn separated_verb_candidates(
    context: &str,
    offset: usize,
    language: &str,
) -> Vec<LookupCandidate> {
    let is_german = language
        .split(['-', '_'])
        .next()
        .is_some_and(|primary| primary.eq_ignore_ascii_case("de"));
    let Some((tokens, clicked)) = sentence_around(context, offset).filter(|_| is_german) else {
        return Vec::new();
    };
    let sentence = Sentence::new(tokens);
    let mut candidates = Vec::new();
    for (verb, particle) in sentence.pairs_with(clicked) {
        sentence.add_candidates(verb, particle, clicked, &mut candidates);
    }
    candidates
}

struct Sentence {
    tokens: Vec<SentenceToken>,
    /// The finite verb readings of each token that may be a finite verb, in the order of the tokens.
    verb_readings: Vec<Vec<Deinflection>>,
}

impl Sentence {
    fn new(tokens: Vec<SentenceToken>) -> Self {
        let verb_readings = (0..tokens.len())
            .map(|index| finite_readings(&tokens, index))
            .collect();
        Self {
            tokens,
            verb_readings,
        }
    }

    /// Pairs the clicked word with the particles of its clause when it is a finite verb,
    /// and with the finite verbs whose clause it ends when it may be a particle.
    fn pairs_with(&self, clicked: usize) -> Vec<(usize, usize)> {
        let as_verb = self
            .particle_slots(clicked)
            .into_iter()
            .map(|particle| (clicked, particle));
        let as_particle = (0..clicked)
            .rev()
            .filter(|verb| self.particle_slots(*verb).contains(&clicked))
            .map(|verb| (verb, clicked));
        let mut pairs: Vec<(usize, usize)> = as_verb.chain(as_particle).collect();
        if clicked == 0 && self.is_verb(1) && !self.is_word_of(0, NEVER_SEPARATED_PREFIXES) {
            pairs.push((1, 0));
        }
        pairs
    }

    /// Lists the positions in the clause of the finite verb at `verb` where its particle may stand:
    /// directly before the end of the clause, a coordinator or a comparison.
    /// The clause skips embedded clauses, and reaches past a comma or coordinator when no finite verb follows.
    fn particle_slots(&self, verb: usize) -> Vec<usize> {
        if !self.is_verb(verb) || self.ends_clause_at(verb + 1) {
            return Vec::new();
        }
        let mut slots = Vec::new();
        let mut index = verb + 1;
        while index < self.tokens.len() {
            if self.opens_embedded_clause(index) {
                match self.next_comma(index + 1) {
                    Some(closing) => index = closing + 1,
                    None => break,
                }
                continue;
            }
            if self.is_comma(index) || self.is_word_of(index, COORDINATORS) {
                if self.has_finite_verb_from(index + 1) {
                    break;
                }
            } else if self.is_word_of(index, SUBJUNCTIONS) {
                break;
            } else if self.is_particle_slot(index) {
                slots.push(index);
            }
            index += 1;
        }
        slots
    }

    fn add_candidates(
        &self,
        verb: usize,
        particle: usize,
        clicked: usize,
        candidates: &mut Vec<LookupCandidate>,
    ) {
        let (Some(verb_word), Some(particle_word), Some(clicked_word)) =
            (self.word(verb), self.word(particle), self.word(clicked))
        else {
            return;
        };
        let separated = SeparatedVerb {
            verb: verb_word.clone(),
            particle: particle_word.clone(),
        };
        let particle_text = particle_word.text.to_lowercase();
        for reading in &self.verb_readings[verb] {
            let candidate = LookupCandidate {
                matched_text: clicked_word.text.clone(),
                deinflection: Deinflection {
                    term: format!("{particle_text}{}", reading.term),
                    ..reading.clone()
                },
                is_bare_form: false,
                separated_verb: Some(separated.clone()),
            };
            if !candidates.contains(&candidate) {
                candidates.push(candidate);
            }
        }
    }

    fn is_verb(&self, index: usize) -> bool {
        self.verb_readings
            .get(index)
            .is_some_and(|readings| !readings.is_empty())
    }

    /// Whether the clause ends at `index` without an embedded clause, so that a verb just before it is clause-final
    /// and has no separated particle, as hat in „…, das er gekauft hat, …".
    fn ends_clause_at(&self, index: usize) -> bool {
        index >= self.tokens.len()
            || (self.is_comma(index) && !self.opens_embedded_clause(index))
            || self.is_word_of(index, COORDINATORS)
    }

    /// Whether the comma at `index` opens a verb-final clause: one introduced by a subjunction, an interrogative,
    /// a relative pronoun, or a preposition and a relative pronoun.
    fn opens_embedded_clause(&self, index: usize) -> bool {
        let opens = |words: &[&str]| self.is_word_of(index + 1, words);
        self.is_comma(index)
            && (opens(SUBJUNCTIONS)
                || opens(W_WORDS)
                || opens(RELATIVE_PRONOUNS)
                || (opens(PREPOSITIONS) && self.is_word_of(index + 2, RELATIVE_PRONOUNS)))
    }

    /// Whether a lowercase finite verb stands between `start` and the next comma, coordinator, subjunction or end.
    fn has_finite_verb_from(&self, start: usize) -> bool {
        (start..self.tokens.len())
            .take_while(|index| {
                !self.is_comma(*index)
                    && !self.is_word_of(*index, COORDINATORS)
                    && !self.is_word_of(*index, SUBJUNCTIONS)
            })
            .any(|index| self.is_verb(index))
    }

    /// Whether the word at `index` may be a separated particle: a lowercase word directly before the end of the clause,
    /// a coordinator or a comparison, which is not a prefix that never separates or part of a bi-particle adverb.
    fn is_particle_slot(&self, index: usize) -> bool {
        let Some(word) = self.word(index) else {
            return false;
        };
        let next = index + 1;
        starts_lowercase(&word.text)
            && (next == self.tokens.len()
                || self.is_comma(next)
                || self.is_word_of(next, COORDINATORS)
                || self.is_word_of(next, COMPARISON_PARTICLES))
            && !NEVER_SEPARATED_PREFIXES.contains(&word.text.as_str())
            && !self.is_in_bi_particle_adverb(index)
    }

    fn is_in_bi_particle_adverb(&self, index: usize) -> bool {
        BI_PARTICLE_ADVERBS.iter().any(|adverb| {
            (index.saturating_sub(adverb.len() - 1)..=index).any(|start| {
                adverb
                    .iter()
                    .enumerate()
                    .all(|(offset, part)| self.is_word_of(start + offset, &[part]))
            })
        })
    }

    fn next_comma(&self, start: usize) -> Option<usize> {
        (start..self.tokens.len()).find(|index| self.is_comma(*index))
    }

    fn word(&self, index: usize) -> Option<&ContextWord> {
        match self.tokens.get(index) {
            Some(SentenceToken::Word(word)) => Some(word),
            _ => None,
        }
    }

    fn is_comma(&self, index: usize) -> bool {
        matches!(self.tokens.get(index), Some(SentenceToken::Comma))
    }

    /// Whether the word at `index` is one of `words`, ignoring the capital of a sentence-initial word.
    fn is_word_of(&self, index: usize, words: &[&str]) -> bool {
        self.word(index)
            .is_some_and(|word| words.contains(&word.text.to_lowercase().as_str()))
    }
}

/// The finite verb readings of the token at `index`, other than those of sein.
/// Only a lowercase word, or the first word of the sentence, can be a verb, because German capitalizes nouns.
/// The bare-stem imperative fits almost any word, so it is read only from the first word, where imperatives stand.
fn finite_readings(tokens: &[SentenceToken], index: usize) -> Vec<Deinflection> {
    let Some(SentenceToken::Word(word)) = tokens.get(index) else {
        return Vec::new();
    };
    if index > 0 && !starts_lowercase(&word.text) {
        return Vec::new();
    }
    deinflect("de", &word.text)
        .into_iter()
        .filter(|reading| is_finite_verb(reading) && (index == 0 || !is_fallback(reading)))
        .filter(|reading| !UNSEPARABLE_BASES.contains(&reading.term.as_str()))
        .collect()
}

fn starts_lowercase(text: &str) -> bool {
    text.chars().next().is_some_and(char::is_lowercase)
}

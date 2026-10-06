//! Turns the listed forms of an irregular verb into rules for every form they imply.

use super::irregular_verbs::IrregularVerb;
use crate::deinflection::german::inflection::*;
use crate::deinflection::german::opening::Opening;
use crate::deinflection::german::rule::{Rule, Stem};
use crate::deinflection::german::word_class::WordClasses as C;

/// The names of a paradigm's forms, in the order 1st/3rd singular, 2nd singular, 1st/3rd plural, 2nd plural.
type PersonNames = [&'static [&'static str]; 4];

const PAST: PersonNames = [&[PAST_1SG_3SG], &[PAST_2SG], &[PAST_1PL_3PL], &[PAST_2PL]];
const SUBJUNCTIVE_II: PersonNames = [
    &[SUBJUNCTIVE_II_1SG_3SG],
    &[SUBJUNCTIVE_II_2SG],
    &[SUBJUNCTIVE_II_1PL_3PL],
    &[SUBJUNCTIVE_II_2PL],
];

/// Lists the rules that lead from each form of `verb`, alone or after particles and a prefix, to its infinitive.
pub(super) fn verb_rules(verb: &IrregularVerb) -> Vec<Rule> {
    let infinitive = verb.infinitive;
    let mut rules = Vec::new();
    let mut add = |form: String, readings: &'static [&'static str]| {
        rules.push(lexical(form, infinitive, Opening::Prefixed, readings));
    };
    alternatives(verb.present_2sg).for_each(|form| add(form.to_string(), &[PRESENT_2SG]));
    alternatives(verb.present_3sg).for_each(|form| add(form.to_string(), &[PRESENT_3SG]));
    alternatives(verb.imperative_sg).for_each(|form| add(form.to_string(), &[IMPERATIVE_SG]));
    for past in alternatives(verb.past) {
        add_person_forms(&mut add, past, PAST);
    }
    for subjunctive in alternatives(verb.subjunctive_ii) {
        add_person_forms(&mut add, subjunctive, SUBJUNCTIVE_II);
        if can_drop_schwa(subjunctive, verb.past) {
            add_apocopated_subjunctive(&mut add, subjunctive);
        }
    }
    for participle in alternatives(verb.past_participle) {
        rules.extend(participle_rules(participle, infinitive));
    }
    rules
}

/// A rule that turns the whole `form`, after what `opening` allows, into `base`.
/// The lexicon lives as long as the program, so the generated form is leaked once to share the rules' static lifetime.
pub(super) fn lexical(
    form: String,
    base: &'static str,
    opening: Opening,
    readings: &'static [&'static str],
) -> Rule {
    Rule::replace(Box::leak(form.into_boxed_str()), base)
        .opening(opening)
        .stem(Stem::Empty)
        .named(readings)
}

fn alternatives(forms: &'static str) -> impl Iterator<Item = &'static str> {
    forms.split('/').filter(|form| !form.is_empty())
}

/// Adds the endings ∅, -st, -en and -t to a past or subjunctive II form of the 1st and 3rd person singular.
/// A form in -e takes -n rather than -en. The 2nd person endings may keep a schwa (fandest, batet, kamest),
/// and after s, ß, x or z the s of -st merges with the stem's (last).
///
/// Sources: Schäfer (2018), Tab. 10.9, p. 304, Tab. 10.10, p. 305, and Tab. 10.12, p. 307;
/// grammis, unit 4119 (schwa in the past, after dentals, and the merging of s).
fn add_person_forms(
    add: &mut impl FnMut(String, &'static [&'static str]),
    form: &str,
    names: PersonNames,
) {
    let [singular, second_singular, plural, second_plural] = names;
    add(form.to_string(), singular);
    if form.ends_with('e') {
        add(format!("{form}st"), second_singular);
        add(format!("{form}n"), plural);
        add(format!("{form}t"), second_plural);
        return;
    }
    let sibilant = form.ends_with(['s', 'ß', 'x', 'z']);
    add(
        format!("{form}{}", if sibilant { "t" } else { "st" }),
        second_singular,
    );
    add(format!("{form}est"), second_singular);
    add(format!("{form}en"), plural);
    add(format!("{form}t"), second_plural);
    add(format!("{form}et"), second_plural);
}

/// Whether the subjunctive II `form` may drop its schwa: only when something else, such as the umlaut of hätte, käme
/// or wäre, still tells it from the past. The schwa of ginge or sollte is the only mark of the mood, so it stays.
///
/// Source: grammis, unit 4119 („Nicht-Setzung von Schwa in der gesprochenen Sprache": the schwa may drop when it
/// marks no inflection, and *riefst for riefest is impossible because it would equal the past).
fn can_drop_schwa(form: &str, past: &'static str) -> bool {
    let Some(stem) = form.strip_suffix('e') else {
        return false;
    };
    alternatives(past).all(|past| past != form && past != stem && !past.starts_with(stem))
}

/// The subjunctive II may drop the schwa before its ending, or at the end of the word (hätt(e)st, wär(e)),
/// mostly in speech.
///
/// Sources: grammis, unit 4119 (hätt(e)st, läg(e)); Schäfer (2018), Tab. 10.20, p. 314 (wär(-e)-st);
/// Amtliches Regelwerk (2024), § 80 (3), p. 150 (müsst’ ich, as written speech).
fn add_apocopated_subjunctive(add: &mut impl FnMut(String, &'static [&'static str]), form: &str) {
    let Some(stem) = form.strip_suffix('e') else {
        return;
    };
    add(stem.to_string(), SUBJUNCTIVE_II[0]);
    add(format!("{stem}st"), SUBJUNCTIVE_II[1]);
    add(format!("{stem}t"), SUBJUNCTIVE_II[3]);
}

/// The participle of a simple verb carries ge-, which a particle precedes and an inseparable prefix replaces
/// (gangen in ge-gangen, aus-ge-gangen and ver-gangen). A verb that itself starts with a prefix has no ge- (befohlen).
///
/// Sources: Schäfer (2018), Tab. 10.14 and 10.15, p. 309; grammis, unit 5210.
fn participle_rules(participle: &str, infinitive: &'static str) -> Vec<Rule> {
    let readings: &'static [&'static str] = &[PAST_PARTICIPLE];
    let rule = |form: &str, opening| Rule {
        from: C::INPUT.or(C::DECLINED),
        ..lexical(form.to_string(), infinitive, opening, readings)
    };
    match augmented_core(participle, infinitive) {
        Some(core) => vec![
            rule(core, Opening::Augment),
            rule(core, Opening::Inseparable),
        ],
        None => vec![rule(participle, Opening::Prefixed)],
    }
}

/// The participle without its ge-, if it has one. Verbs such as gehen and geben start with ge without a prefix,
/// so their participle stem keeps its g after the ge- (ge-gangen), while gewinnen and gebären start with the prefix ge-
/// and take no second one (gewonnen).
fn augmented_core<'a>(participle: &'a str, infinitive: &str) -> Option<&'a str> {
    let core = participle.strip_prefix("ge")?;
    (!infinitive.starts_with("ge") || core.starts_with('g')).then_some(core)
}

#[cfg(test)]
mod tests {
    use super::{augmented_core, can_drop_schwa};

    #[test]
    fn can_drop_schwa_from_a_subjunctive_with_umlaut() {
        assert!(can_drop_schwa("wäre", "war"));
    }

    #[test]
    fn keeps_the_schwa_of_a_subjunctive_shaped_like_the_past() {
        assert!(!can_drop_schwa("ginge", "ging"));
    }

    #[test]
    fn keeps_the_schwa_of_a_subjunctive_equal_to_the_past() {
        assert!(!can_drop_schwa("sollte", "sollte"));
    }

    #[test]
    fn augmented_core_removes_ge() {
        assert_eq!(augmented_core("gesprochen", "sprechen"), Some("sprochen"));
    }

    #[test]
    fn augmented_core_removes_the_ge_before_a_stem_in_ge() {
        assert_eq!(augmented_core("gegangen", "gehen"), Some("gangen"));
    }

    #[test]
    fn augmented_core_keeps_the_prefix_ge() {
        assert_eq!(augmented_core("gewonnen", "gewinnen"), None);
    }

    #[test]
    fn augmented_core_finds_no_ge_after_another_prefix() {
        assert_eq!(augmented_core("befohlen", "befehlen"), None);
    }
}

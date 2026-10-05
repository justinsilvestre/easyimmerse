//! A single deinflection rule: an ending replacement between two sets of word classes.

use std::borrow::Cow;

use super::opening::{Opening, Split};
use super::word_class::WordClasses;

/// Replaces the ending `ending` of a word in one of the classes `from` with `base`, giving a word in one of the classes `to`.
///
/// Noun rules, those producing a noun or a plural, apply only to capitalized words; all other rules apply only to words
/// that start in lowercase, because German capitalizes nouns (Amtliches Regelwerk 2024, § 55).
/// A capitalized word at the start of a sentence is also tried in lowercase before the rules run.
#[derive(Debug, Clone, Copy)]
pub(super) struct Rule {
    pub opening: Opening,
    pub ending: &'static str,
    pub base: &'static str,
    pub stem: Stem,
    pub umlaut: Umlaut,
    pub from: WordClasses,
    pub to: WordClasses,
    /// The alternative inflections that the ending may stand for, each giving its own result.
    /// A rule that only links two forms names none and gives one result.
    pub readings: &'static [&'static str],
}

/// What happens to the last umlaut of the stem.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum Umlaut {
    Keep,
    /// The umlaut is reversed, as in Häus-er → Haus.
    Reverse,
    /// The umlaut is reversed to a doubled vowel, because ä and ö stand for the umlaut of aa and oo (Säle → Saal).
    ///
    /// Source: Amtliches Regelwerk (2024), § 9 E2, p. 39.
    ReverseDoubled,
}

/// A constraint on the text that remains once the opening and the ending are removed.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum Stem {
    Any,
    NonEmpty,
    /// No stem: the ending is the whole remaining word, as for listed irregular forms.
    Empty,
    /// A stem ending in s, ß, x or z, after which the 2nd person singular takes -t instead of -st.
    Sibilant,
    /// A stem ending in el or er, such as sammel-n and wander-n.
    ElEr,
    /// A stem ending in e, el or er, which takes -n rather than -en.
    Schwa,
    /// A stem ending in el, er or en, which adds no plural ending.
    SchwaSyllable,
    /// A stem not ending in n or s, which may take the dative plural -n.
    NotNOrS,
    /// A non-empty stem not ending in e.
    NotE,
    /// A stem ending in e.
    FinalE,
}

impl Rule {
    /// A rule replacing `ending` with `base` on the input text, to be narrowed with the other builder methods.
    pub const fn replace(ending: &'static str, base: &'static str) -> Self {
        Self {
            opening: Opening::Free,
            ending,
            base,
            stem: Stem::NonEmpty,
            umlaut: Umlaut::Keep,
            from: WordClasses::INPUT,
            to: WordClasses::VERB,
            readings: &[],
        }
    }

    pub const fn from(self, from: WordClasses) -> Self {
        Self { from, ..self }
    }

    pub const fn to(self, to: WordClasses) -> Self {
        Self { to, ..self }
    }

    pub const fn named(self, readings: &'static [&'static str]) -> Self {
        Self { readings, ..self }
    }

    pub const fn stem(self, stem: Stem) -> Self {
        Self { stem, ..self }
    }

    pub const fn opening(self, opening: Opening) -> Self {
        Self { opening, ..self }
    }

    pub const fn umlaut(self, umlaut: Umlaut) -> Self {
        Self { umlaut, ..self }
    }

    /// The base form of `text`, a word in `classes` that was split into `split`, if this rule applies to it.
    pub fn undo(&self, text: &str, split: Split, classes: WordClasses) -> Option<String> {
        if !classes.intersects(self.from) || is_capitalized(text) != self.is_noun_rule() {
            return None;
        }
        let stem = split.rest.strip_suffix(self.ending)?;
        if !self.stem.accepts(stem) {
            return None;
        }
        let stem = match self.umlaut {
            Umlaut::Keep => Cow::Borrowed(stem),
            Umlaut::Reverse => Cow::Owned(reverse_last_umlaut(stem, false)?),
            Umlaut::ReverseDoubled => Cow::Owned(reverse_last_umlaut(stem, true)?),
        };
        Some([split.kept, &stem, self.base].concat())
    }

    fn is_noun_rule(&self) -> bool {
        self.to
            .intersects(WordClasses::NOUN.or(WordClasses::PLURAL))
    }
}

impl Stem {
    fn accepts(self, stem: &str) -> bool {
        let ends_in = |endings: &[&str]| endings.iter().any(|ending| stem.ends_with(ending));
        match self {
            Stem::Any => true,
            Stem::NonEmpty => !stem.is_empty(),
            Stem::Empty => stem.is_empty(),
            Stem::Sibilant => ends_in(&["s", "ß", "x", "z"]),
            Stem::ElEr => ends_in(&["el", "er"]),
            Stem::Schwa => ends_in(&["e", "el", "er"]),
            Stem::SchwaSyllable => ends_in(&["el", "er", "en"]),
            Stem::NotNOrS => !stem.is_empty() && !ends_in(&["n", "s"]),
            Stem::NotE => !stem.is_empty() && !stem.ends_with('e'),
            Stem::FinalE => stem.ends_with('e'),
        }
    }
}

fn is_capitalized(text: &str) -> bool {
    text.chars().next().is_some_and(char::is_uppercase)
}

/// Replaces the last umlauted vowel of `stem` with its base vowel, as in Bücher → Bucher and Häus → Haus,
/// or with the doubled base vowel when `doubled` is set. Gives nothing when `stem` has no umlaut.
///
/// Source: Schäfer (2018), p. 202, example (14), and p. 203 (the pairs a–ä, o–ö, u–ü and au–äu).
pub(super) fn reverse_last_umlaut(stem: &str, doubled: bool) -> Option<String> {
    let (index, umlaut) = stem
        .char_indices()
        .rev()
        .find(|(_, character)| base_vowel(*character).is_some())?;
    let base = base_vowel(umlaut)?;
    let after = &stem[index + umlaut.len_utf8()..];
    if doubled && base == 'u' {
        return None;
    }
    let base = if doubled {
        format!("{base}{base}")
    } else {
        base.to_string()
    };
    Some(format!("{}{base}{after}", &stem[..index]))
}

fn base_vowel(character: char) -> Option<char> {
    match character {
        'ä' => Some('a'),
        'ö' => Some('o'),
        'ü' => Some('u'),
        'Ä' => Some('A'),
        'Ö' => Some('O'),
        'Ü' => Some('U'),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::{Rule, Stem, Umlaut, reverse_last_umlaut};
    use crate::deinflection::german::opening::Split;
    use crate::deinflection::german::word_class::WordClasses as C;

    fn undo(rule: &Rule, text: &str) -> Option<String> {
        rule.undo(
            text,
            Split {
                kept: "",
                rest: text,
            },
            C::INPUT,
        )
    }

    #[test]
    fn undo_replaces_the_ending() {
        let rule = Rule::replace("st", "en");
        assert_eq!(undo(&rule, "lachst").as_deref(), Some("lachen"));
    }

    #[test]
    fn undo_reverses_the_last_umlaut() {
        let rule = Rule::replace("er", "").umlaut(Umlaut::Reverse).to(C::NOUN);
        assert_eq!(undo(&rule, "Häuser").as_deref(), Some("Haus"));
    }

    #[test]
    fn undo_rejects_a_stem_without_umlaut_when_one_is_needed() {
        let rule = Rule::replace("er", "").umlaut(Umlaut::Reverse).to(C::NOUN);
        assert_eq!(undo(&rule, "Kinder"), None);
    }

    #[test]
    fn undo_applies_noun_rules_only_to_capitalized_words() {
        let rule = Rule::replace("e", "").to(C::NOUN);
        assert_eq!(undo(&rule, "tage"), None);
    }

    #[test]
    fn undo_applies_other_rules_only_to_lowercase_words() {
        let rule = Rule::replace("e", "en");
        assert_eq!(undo(&rule, "Lache"), None);
    }

    #[test]
    fn undo_rejects_a_word_of_another_class() {
        let rule = Rule::replace("st", "").from(C::DECLINED).to(C::ADJECTIVE);
        assert_eq!(undo(&rule, "schnellst"), None);
    }

    #[test]
    fn undo_checks_the_stem() {
        let rule = Rule::replace("t", "en").stem(Stem::Sibilant);
        assert_eq!(undo(&rule, "lacht"), None);
    }

    #[test]
    fn reverse_last_umlaut_turns_aeu_into_au() {
        assert_eq!(reverse_last_umlaut("Bäum", false).as_deref(), Some("Baum"));
    }

    #[test]
    fn reverse_last_umlaut_doubles_the_vowel_when_asked() {
        assert_eq!(reverse_last_umlaut("Säl", true).as_deref(), Some("Saal"));
    }

    #[test]
    fn reverse_last_umlaut_changes_only_the_last_umlaut() {
        assert_eq!(
            reverse_last_umlaut("Kinderbüch", false).as_deref(),
            Some("Kinderbuch")
        );
    }
}

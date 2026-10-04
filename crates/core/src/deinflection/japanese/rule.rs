//! A single deinflection rule: a suffix replacement between two sets of word classes.

use super::word_class::WordClasses;

/// Replaces the ending `inflected` of a word in one of the classes `from`
/// with `base`, giving a word in one of the classes `to`.
#[derive(Debug, Clone, Copy)]
pub(super) struct Rule {
    pub inflected: &'static str,
    pub base: &'static str,
    pub from: WordClasses,
    pub to: WordClasses,
    /// The inflections this rule undoes, outermost first.
    /// Rules that only turn a stem back into a dictionary form undo none.
    pub inflections: &'static [&'static str],
    pub stem: Stem,
}

/// A constraint on the text that remains once the inflected ending is removed.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum Stem {
    /// Any stem, including an empty one.
    Any,
    /// A non-empty stem that could belong to an ichidan verb.
    Ichidan,
    /// A non-empty stem, such as an adjective's.
    NonEmpty,
    /// No stem: the ending is the whole word.
    Empty,
}

impl Rule {
    /// A rule replacing `inflected` with `base`, to be narrowed with the other builder methods.
    pub const fn replace(inflected: &'static str, base: &'static str) -> Self {
        Self {
            inflected,
            base,
            from: WordClasses::INPUT,
            to: WordClasses::DICTIONARY,
            inflections: &[],
            stem: Stem::Any,
        }
    }

    /// Sets the classes the inflected word may have.
    pub const fn from(self, from: WordClasses) -> Self {
        Self { from, ..self }
    }

    /// Sets the classes the base word may have.
    pub const fn to(self, to: WordClasses) -> Self {
        Self { to, ..self }
    }

    /// Sets the inflections undone, outermost first.
    pub const fn named(self, inflections: &'static [&'static str]) -> Self {
        Self {
            inflections,
            ..self
        }
    }

    /// Sets the constraint on the stem.
    pub const fn stem(self, stem: Stem) -> Self {
        Self { stem, ..self }
    }

    /// The base form of `text`, if this rule applies to it.
    pub fn undo(&self, text: &str, classes: WordClasses) -> Option<String> {
        if !classes.intersects(self.from) {
            return None;
        }
        let stem = text.strip_suffix(self.inflected)?;
        self.stem.accepts(stem).then(|| [stem, self.base].concat())
    }
}

impl Stem {
    fn accepts(self, stem: &str) -> bool {
        match self {
            Stem::Any => true,
            Stem::NonEmpty => !stem.is_empty(),
            Stem::Empty => stem.is_empty(),
            Stem::Ichidan => stem.chars().last().is_some_and(can_end_ichidan_stem),
        }
    }
}

/// Ichidan stems end in a kana of the い or え row, or in a kanji such as 見 or 出.
fn can_end_ichidan_stem(character: char) -> bool {
    !is_hiragana(character) || I_AND_E_ROWS.contains(character)
}

const I_AND_E_ROWS: &str = "いきぎしじちぢにひびぴみりゐえけげせぜてでねへべぺめれゑ";

fn is_hiragana(character: char) -> bool {
    ('\u{3041}'..='\u{3096}').contains(&character)
}

#[cfg(test)]
mod tests {
    use super::{Rule, Stem};
    use crate::deinflection::japanese::word_class::WordClasses;

    #[test]
    fn undo_replaces_the_ending() {
        let rule = Rule::replace("かった", "い").to(WordClasses::ADJ_I);
        assert_eq!(
            rule.undo("高かった", WordClasses::UNDEINFLECTED).as_deref(),
            Some("高い")
        );
    }

    #[test]
    fn undo_rejects_a_word_of_another_class() {
        let rule = Rule::replace("", "る").from(WordClasses::CONTINUATIVE);
        assert_eq!(rule.undo("食べ", WordClasses::UNDEINFLECTED), None);
    }

    #[test]
    fn undo_rejects_an_ichidan_stem_ending_in_the_a_row() {
        let rule = Rule::replace("られる", "る").stem(Stem::Ichidan);
        assert_eq!(rule.undo("書かられる", WordClasses::UNDEINFLECTED), None);
    }

    #[test]
    fn undo_accepts_an_ichidan_stem_ending_in_a_kanji() {
        let rule = Rule::replace("られる", "る").stem(Stem::Ichidan);
        assert_eq!(
            rule.undo("見られる", WordClasses::UNDEINFLECTED).as_deref(),
            Some("見る")
        );
    }

    #[test]
    fn undo_rejects_a_stem_when_the_ending_must_be_the_whole_word() {
        let rule = Rule::replace("ない", "ある").stem(Stem::Empty);
        assert_eq!(rule.undo("食べない", WordClasses::UNDEINFLECTED), None);
    }
}

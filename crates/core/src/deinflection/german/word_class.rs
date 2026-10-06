//! The word classes that German deinflection rules accept and produce.

/// A set of word classes: the classes that dictionaries tag their entries with,
/// plus intermediate states that exist only while a chain of rules is being undone.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) struct WordClasses(u8);

impl WordClasses {
    pub const VERB: Self = Self(1);
    pub const NOUN: Self = Self(1 << 1);
    pub const ADJECTIVE: Self = Self(1 << 2);
    /// Adverbs, which compare like adjectives (gern, lieber, am liebsten).
    pub const ADVERB: Self = Self(1 << 3);
    /// Articles and pronouns that decline with adjective-like endings, such as mein and dieser.
    pub const DETERMINER: Self = Self(1 << 4);

    /// Text as given, before any rule is applied.
    pub const INPUT: Self = Self(1 << 5);
    /// An adjective form whose declension ending has been removed, such as schnellst in schnellsten.
    pub const DECLINED: Self = Self(1 << 6);
    /// A noun plural whose dative ending has been removed, such as Häuser in Häusern.
    pub const PLURAL: Self = Self(1 << 7);

    /// The classes that dictionary entries carry.
    pub const DICTIONARY: Self = Self::VERB
        .or(Self::NOUN)
        .or(Self::ADJECTIVE)
        .or(Self::ADVERB)
        .or(Self::DETERMINER);

    /// Combines two sets.
    pub const fn or(self, other: Self) -> Self {
        Self(self.0 | other.0)
    }

    /// Whether the two sets share a class.
    pub const fn intersects(self, other: Self) -> bool {
        self.0 & other.0 != 0
    }

    /// The dictionary classes in this set, by the names that German Yomitan dictionaries use, such as `v`.
    pub fn dictionary_names(self) -> Vec<String> {
        DICTIONARY_NAMES
            .iter()
            .filter(|(class, _)| self.intersects(*class))
            .map(|(_, name)| name.to_string())
            .collect()
    }
}

const DICTIONARY_NAMES: [(WordClasses, &str); 5] = [
    (WordClasses::VERB, "v"),
    (WordClasses::NOUN, "n"),
    (WordClasses::ADJECTIVE, "adj"),
    (WordClasses::ADVERB, "adv"),
    (WordClasses::DETERMINER, "det"),
];

#[cfg(test)]
mod tests {
    use super::WordClasses;

    #[test]
    fn dictionary_names_lists_only_dictionary_classes() {
        let classes = WordClasses::ADJECTIVE
            .or(WordClasses::DECLINED)
            .or(WordClasses::VERB);
        assert_eq!(classes.dictionary_names(), ["v", "adj"]);
    }
}

//! The word classes that deinflection rules accept and produce.

/// A set of word classes: the classes that dictionaries tag their entries with,
/// plus intermediate states that exist only while a chain of rules is being undone.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) struct WordClasses(u16);

impl WordClasses {
    /// Ichidan (monograde) verbs.
    pub const V1: Self = Self(1);
    /// Godan (pentagrade) verbs.
    pub const V5: Self = Self(1 << 1);
    /// The irregular verb 来る (kuru).
    pub const VK: Self = Self(1 << 2);
    /// The irregular verb する (suru) and its compounds.
    pub const VS: Self = Self(1 << 3);
    /// Verbs ending in ずる (zuru), such as 論ずる.
    pub const VZ: Self = Self(1 << 4);
    /// I-adjectives, including auxiliaries that inflect like them, such as ない and たい.
    pub const ADJ_I: Self = Self(1 << 5);

    /// The continuative stem (ren'yōkei) of a verb, such as 書き in 書きます.
    pub const CONTINUATIVE: Self = Self(1 << 6);
    /// The irrealis stem (mizenkei) of a verb that negative suffixes attach to, such as 書か in 書かない.
    pub const IRREALIS: Self = Self(1 << 7);
    /// The euphonic stem (onbinkei) of a verb that takes た and て, such as 書い in 書いた.
    pub const ONBIN_TA: Self = Self(1 << 8);
    /// The euphonic stem of a verb that takes だ and で, such as 読ん in 読んだ.
    pub const ONBIN_DA: Self = Self(1 << 9);
    /// The stem of an i-adjective, such as 高 in 高そう.
    pub const ADJECTIVE_STEM: Self = Self(1 << 10);
    /// Text as given, before any rule is applied. It may also have any dictionary class.
    pub const INPUT: Self = Self(1 << 11);

    /// The classes that dictionary entries carry.
    pub const DICTIONARY: Self = Self::V1
        .or(Self::V5)
        .or(Self::VK)
        .or(Self::VS)
        .or(Self::VZ)
        .or(Self::ADJ_I);
    /// The classes of text that no rule has been applied to yet.
    pub const UNDEINFLECTED: Self = Self::INPUT.or(Self::DICTIONARY);

    /// Combines two sets.
    pub const fn or(self, other: Self) -> Self {
        Self(self.0 | other.0)
    }

    /// Whether the two sets share a class.
    pub const fn intersects(self, other: Self) -> bool {
        self.0 & other.0 != 0
    }

    /// The dictionary classes in this set, by their Yomitan rule names, such as `v1`.
    pub fn dictionary_names(self) -> Vec<String> {
        DICTIONARY_NAMES
            .iter()
            .filter(|(class, _)| self.intersects(*class))
            .map(|(_, name)| name.to_string())
            .collect()
    }
}

const DICTIONARY_NAMES: [(WordClasses, &str); 6] = [
    (WordClasses::V1, "v1"),
    (WordClasses::V5, "v5"),
    (WordClasses::VK, "vk"),
    (WordClasses::VS, "vs"),
    (WordClasses::VZ, "vz"),
    (WordClasses::ADJ_I, "adj-i"),
];

#[cfg(test)]
mod tests {
    use super::WordClasses;

    #[test]
    fn dictionary_names_lists_only_dictionary_classes() {
        let classes = WordClasses::V5
            .or(WordClasses::ADJ_I)
            .or(WordClasses::IRREALIS);
        assert_eq!(classes.dictionary_names(), ["v5", "adj-i"]);
    }

    #[test]
    fn undeinflected_text_intersects_every_dictionary_class() {
        assert!(WordClasses::UNDEINFLECTED.intersects(WordClasses::VZ));
    }
}

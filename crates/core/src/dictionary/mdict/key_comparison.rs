use std::borrow::Cow;

use crate::lookup::fold_case;

use super::header::Header;

/// The characters that MDict ignores in keys when `StripKey` is `Yes`.
/// The format leaves the set undocumented; this is the one that js-mdict (MIT licence) strips from `.mdx` keys.
const STRIPPED_CHARACTERS: &[char] = &[
    ' ', '(', ')', '.', ',', '-', '&', '、', '\'', '/', '\\', '@', '_', '$', '!',
];

/// How a dictionary compares keys, as its header's `KeyCaseSensitive` and `StripKey` attributes set it.
///
/// Two keys match when their normalized forms are equal.
/// `KeyCaseSensitive` defaults to `No` and `StripKey` to `Yes`, as in MdxBuilder.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct KeyComparison {
    is_case_sensitive: bool,
    strips_keys: bool,
}

impl KeyComparison {
    pub fn from_header(header: &Header) -> Self {
        let attributes = &header.attributes;
        Self {
            is_case_sensitive: is_yes(attributes.get("KeyCaseSensitive"), false),
            strips_keys: is_yes(attributes.get("StripKey"), true),
        }
    }

    /// Returns the form of a key under which it matches other keys.
    pub fn normalize(&self, key: &str) -> String {
        let key = self.strip(key);
        if self.is_case_sensitive {
            key.into_owned()
        } else {
            fold_case(&key)
        }
    }

    /// Returns the key without the characters that comparison ignores,
    /// when the dictionary strips keys and the key has some of them besides other characters.
    pub fn stripped_spelling(&self, key: &str) -> Option<String> {
        match self.strip(key) {
            Cow::Owned(stripped) if !stripped.is_empty() => Some(stripped),
            _ => None,
        }
    }

    fn strip<'a>(&self, key: &'a str) -> Cow<'a, str> {
        if self.strips_keys && key.contains(STRIPPED_CHARACTERS) {
            Cow::Owned(key.replace(STRIPPED_CHARACTERS, ""))
        } else {
            Cow::Borrowed(key)
        }
    }
}

fn is_yes(value: Option<&str>, default: bool) -> bool {
    match value.map(str::trim) {
        Some(value) if value.eq_ignore_ascii_case("yes") => true,
        Some(value) if value.eq_ignore_ascii_case("no") => false,
        _ => default,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dictionary::mdict::header::FormatVersion;
    use crate::dictionary::mdict::header_attributes::HeaderAttributes;

    fn comparison(attributes: &str) -> KeyComparison {
        KeyComparison::from_header(&Header {
            version: FormatVersion::V2,
            attributes: HeaderAttributes::parse(&format!("<Dictionary {attributes}/>")),
            key_info_encrypted: false,
        })
    }

    #[test]
    fn ignores_case_and_punctuation_by_default() {
        assert_eq!(comparison("").normalize("Ice-Cream"), "icecream");
    }

    #[test]
    fn keeps_case_when_keys_are_case_sensitive() {
        let comparison = comparison(r#"KeyCaseSensitive="Yes""#);
        assert_eq!(comparison.normalize("Ice-Cream"), "IceCream");
    }

    #[test]
    fn keeps_punctuation_when_keys_are_not_stripped() {
        let comparison = comparison(r#"StripKey="No""#);
        assert_eq!(comparison.normalize("Ice-Cream"), "ice-cream");
    }

    #[test]
    fn spells_a_key_without_its_punctuation() {
        assert_eq!(
            comparison("").stripped_spelling("o'clock"),
            Some("oclock".to_string())
        );
    }

    #[test]
    fn has_no_stripped_spelling_for_a_key_without_punctuation() {
        assert_eq!(comparison("").stripped_spelling("cat"), None);
    }

    #[test]
    fn has_no_stripped_spelling_for_a_key_of_punctuation_only() {
        assert_eq!(comparison("").stripped_spelling("..."), None);
    }

    #[test]
    fn has_no_stripped_spelling_when_keys_are_not_stripped() {
        let comparison = comparison(r#"StripKey="No""#);
        assert_eq!(comparison.stripped_spelling("o'clock"), None);
    }
}

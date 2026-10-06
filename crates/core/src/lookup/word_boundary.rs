/// Reports whether a character ends the stretch of text that lookup considers:
/// whitespace, or a punctuation mark other than an apostrophe or a hyphen.
/// Apostrophes and hyphens are kept because headwords such as `don't` and `well-known` contain them.
pub fn is_word_boundary(character: char) -> bool {
    character.is_whitespace() || is_punctuation(character)
}

fn is_punctuation(character: char) -> bool {
    match character {
        '\'' | '-' | '\u{2010}' | '\u{2011}' | '\u{2019}' => false,
        _ if character.is_ascii_punctuation() => true,
        '¡' | '«' | '·' | '»' | '¿' => true,
        '\u{2000}'..='\u{206F}' => true,
        '\u{3001}'..='\u{3003}' | '\u{3008}'..='\u{3011}' | '\u{3014}'..='\u{301F}' => true,
        '\u{3030}' | '\u{303D}' | '\u{30FB}' => true,
        '\u{FF01}'..='\u{FF0F}' | '\u{FF1A}'..='\u{FF20}' => true,
        '\u{FF3B}'..='\u{FF40}' | '\u{FF5B}'..='\u{FF65}' => true,
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn treats_a_space_as_a_boundary() {
        assert!(is_word_boundary(' '));
    }

    #[test]
    fn treats_an_ideographic_full_stop_as_a_boundary() {
        assert!(is_word_boundary('。'));
    }

    #[test]
    fn treats_a_corner_bracket_as_a_boundary() {
        assert!(is_word_boundary('」'));
    }

    #[test]
    fn treats_a_comma_as_a_boundary() {
        assert!(is_word_boundary(','));
    }

    #[test]
    fn keeps_an_apostrophe_within_a_word() {
        assert!(!is_word_boundary('\''));
    }

    #[test]
    fn keeps_the_iteration_mark_within_a_word() {
        assert!(!is_word_boundary('々'));
    }

    #[test]
    fn keeps_the_long_vowel_mark_within_a_word() {
        assert!(!is_word_boundary('ー'));
    }
}

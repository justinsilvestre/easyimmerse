use super::kanji_results::is_kanji;
use super::word_boundary::is_word_boundary;

/// Lists the positions in `text` where a reader could start a lookup, counted in characters (Unicode scalar values).
///
/// In text that separates its words with spaces, these are the starts of words.
/// In Japanese and Chinese, which do not, every character is a position, since a word may begin at any of them.
/// Whitespace and punctuation are never positions.
pub fn lookup_positions(text: &str) -> Vec<usize> {
    let mut positions = Vec::new();
    let mut previous: Option<char> = None;
    for (position, character) in text.chars().enumerate() {
        if !is_word_boundary(character) && may_start_word(previous, character) {
            positions.push(position);
        }
        previous = Some(character);
    }
    positions
}

fn may_start_word(previous: Option<char>, character: char) -> bool {
    match previous {
        None => true,
        Some(previous) => {
            is_word_boundary(previous) || is_unspaced(previous) || is_unspaced(character)
        }
    }
}

/// Reports whether a character belongs to a script written without spaces between words:
/// kanji or Chinese characters, kana, and the marks written among them.
fn is_unspaced(character: char) -> bool {
    is_kanji(character)
        || matches!(
            character,
            '\u{3005}'..='\u{3007}' | '\u{3040}'..='\u{30FF}' | '\u{31F0}'..='\u{31FF}' | '\u{FF66}'..='\u{FF9F}'
        )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lists_the_start_of_each_word_in_spaced_text() {
        assert_eq!(lookup_positions("Ich rufe dich an."), vec![0, 4, 9, 14]);
    }

    #[test]
    fn lists_every_character_of_japanese_text() {
        assert_eq!(lookup_positions("猫が本を"), vec![0, 1, 2, 3]);
    }

    #[test]
    fn skips_punctuation_in_japanese_text() {
        assert_eq!(lookup_positions("「猫」。"), vec![1]);
    }

    #[test]
    fn skips_leading_whitespace() {
        assert_eq!(lookup_positions("  word"), vec![2]);
    }

    #[test]
    fn lists_a_word_that_follows_japanese_text_without_a_space() {
        assert_eq!(lookup_positions("猫のcat food"), vec![0, 1, 2, 6]);
    }

    #[test]
    fn keeps_a_hyphenated_word_whole() {
        assert_eq!(lookup_positions("well-known"), vec![0]);
    }

    #[test]
    fn lists_each_character_of_a_katakana_word_with_a_long_vowel_mark() {
        assert_eq!(lookup_positions("コーヒー"), vec![0, 1, 2, 3]);
    }

    #[test]
    fn keeps_a_zero_width_no_break_space_within_a_word() {
        assert_eq!(lookup_positions("cat\u{FEFF}dog"), vec![0]);
    }

    #[test]
    fn treats_a_next_line_character_as_whitespace() {
        assert_eq!(lookup_positions("cat\u{0085}dog"), vec![0, 4]);
    }

    #[test]
    fn lists_nothing_for_empty_text() {
        assert_eq!(lookup_positions(""), Vec::<usize>::new());
    }
}

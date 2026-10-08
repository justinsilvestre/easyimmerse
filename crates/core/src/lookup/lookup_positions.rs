use super::unspaced_scripts::{is_unspaced, is_unspaced_mark};
use super::word_boundary::is_word_boundary;

/// Lists the positions in `text` where a reader could start a lookup, counted in characters (Unicode scalar values).
///
/// In text that separates its words with spaces, these are the starts of words.
/// In scripts that do not, such as Japanese, Chinese, and Thai, every character is a position, since a word may begin at any of them,
/// except a combining mark such as a Thai vowel sign, which belongs to the letter before it.
/// Whitespace and punctuation are never positions.
pub fn lookup_positions(text: &str) -> Vec<usize> {
    let mut positions = Vec::new();
    let mut previous: Option<char> = None;
    for (position, character) in text.chars().enumerate() {
        if !is_word_boundary(character)
            && !is_unspaced_mark(character)
            && may_start_word(previous, character)
        {
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
    fn counts_a_character_outside_the_basic_multilingual_plane_as_one() {
        assert_eq!(lookup_positions("𠮟る"), vec![0, 1]);
    }

    #[test]
    fn lists_every_character_of_bopomofo() {
        assert_eq!(lookup_positions("ㄅㄆ"), vec![0, 1]);
    }

    #[test]
    fn lists_every_letter_of_thai_text_but_not_its_vowel_signs_and_tone_marks() {
        assert_eq!(lookup_positions("กินข้าว"), vec![0, 2, 3, 5, 6]);
    }

    #[test]
    fn lists_a_thai_vowel_written_before_its_consonant() {
        assert_eq!(lookup_positions("เขา"), vec![0, 1, 2]);
    }

    #[test]
    fn lists_every_letter_of_lao_text_but_not_its_vowel_signs() {
        assert_eq!(lookup_positions("ສະບາຍດີ"), vec![0, 1, 2, 3, 4, 5]);
    }

    #[test]
    fn lists_every_letter_of_khmer_text_but_not_its_signs() {
        assert_eq!(lookup_positions("ខ្ញុំ"), vec![0, 2]);
    }

    #[test]
    fn lists_every_letter_of_myanmar_text_but_not_its_signs() {
        assert_eq!(lookup_positions("မြန်မာ"), vec![0, 2, 4]);
    }

    #[test]
    fn skips_a_combining_mark_at_the_start_of_the_text() {
        assert_eq!(lookup_positions("\u{0E34}ก"), vec![1]);
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

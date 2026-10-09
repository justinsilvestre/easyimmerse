//! The scripts written without spaces between words, in which a word may begin at any character.
//!
//! The clients mirror these ranges through a TypeScript module generated from them.

use std::ops::RangeInclusive;

use super::kanji_results::is_kanji;

/// Reports whether a character belongs to a script written without spaces between words:
/// kanji or Chinese characters, or a character of `KANA_AND_BOPOMOFO_RANGES` or `SOUTH_EAST_ASIAN_RANGES`.
pub fn is_unspaced(character: char) -> bool {
    is_kanji(character)
        || is_in(&KANA_AND_BOPOMOFO_RANGES, character)
        || is_in(&SOUTH_EAST_ASIAN_RANGES, character)
}

/// Reports whether a character is a combining mark of a script of Line_Break class SA, such as a Thai vowel sign or tone mark.
/// A mark belongs to the letter before it, so no word begins with one.
pub fn is_unspaced_mark(character: char) -> bool {
    is_in(&SOUTH_EAST_ASIAN_MARK_RANGES, character)
}

fn is_in(ranges: &[RangeInclusive<char>], character: char) -> bool {
    ranges.iter().any(|range| range.contains(&character))
}

/// Kana, the marks written among kanji and kana, and Bopomofo, which annotates Chinese and has the ideographic Line_Break class ID.
/// The blocks are named as `Blocks.txt` of the Unicode Character Database, version 16.0.0, names them.
pub const KANA_AND_BOPOMOFO_RANGES: [RangeInclusive<char>; 10] = [
    // The iteration mark 々, the closing mark 〆 and the ideographic zero 〇.
    '\u{3005}'..='\u{3007}',
    // The vertical kana repetition marks 〱 to 〵.
    '\u{3031}'..='\u{3035}',
    // The vertical ideographic iteration mark 〻 and the masu mark 〼.
    '\u{303B}'..='\u{303C}',
    // Hiragana and Katakana.
    '\u{3040}'..='\u{30FF}',
    // Bopomofo.
    '\u{3105}'..='\u{312F}',
    // Bopomofo Extended.
    '\u{31A0}'..='\u{31BF}',
    // Katakana Phonetic Extensions.
    '\u{31F0}'..='\u{31FF}',
    // The halfwidth katakana of Halfwidth and Fullwidth Forms.
    '\u{FF66}'..='\u{FF9F}',
    // Kana Extended-B.
    '\u{1AFF0}'..='\u{1AFFF}',
    // Kana Supplement, Kana Extended-A and Small Kana Extension.
    '\u{1B000}'..='\u{1B16F}',
];

/// The characters of Line_Break class SA, "Complex Context Dependent (South East Asian)",
/// which Unicode Standard Annex #14 (Unicode Line Breaking Algorithm) assigns to Thai, Lao, Myanmar, Khmer,
/// Tai Le, New Tai Lue, Tai Tham, Myanmar Extended-A and -B, Tai Viet, and Ahom,
/// as `LineBreak.txt` of the Unicode Character Database, version 16.0.0, lists them.
pub const SOUTH_EAST_ASIAN_RANGES: [RangeInclusive<char>; 34] = [
    '\u{0E01}'..='\u{0E3A}',
    '\u{0E40}'..='\u{0E4E}',
    '\u{0E81}'..='\u{0E82}',
    '\u{0E84}'..='\u{0E84}',
    '\u{0E86}'..='\u{0E8A}',
    '\u{0E8C}'..='\u{0EA3}',
    '\u{0EA5}'..='\u{0EA5}',
    '\u{0EA7}'..='\u{0EBD}',
    '\u{0EC0}'..='\u{0EC4}',
    '\u{0EC6}'..='\u{0EC6}',
    '\u{0EC8}'..='\u{0ECE}',
    '\u{0EDC}'..='\u{0EDF}',
    '\u{1000}'..='\u{103F}',
    '\u{1050}'..='\u{108F}',
    '\u{109A}'..='\u{109F}',
    '\u{1780}'..='\u{17D3}',
    '\u{17D7}'..='\u{17D7}',
    '\u{17DC}'..='\u{17DD}',
    '\u{1950}'..='\u{196D}',
    '\u{1970}'..='\u{1974}',
    '\u{1980}'..='\u{19AB}',
    '\u{19B0}'..='\u{19C9}',
    '\u{19DE}'..='\u{19DF}',
    '\u{1A20}'..='\u{1A5E}',
    '\u{1A60}'..='\u{1A7C}',
    '\u{1AA0}'..='\u{1AAD}',
    '\u{A9E0}'..='\u{A9EF}',
    '\u{A9FA}'..='\u{A9FE}',
    '\u{AA60}'..='\u{AAC2}',
    '\u{AADB}'..='\u{AADF}',
    '\u{11700}'..='\u{1171A}',
    '\u{1171D}'..='\u{1172B}',
    '\u{1173A}'..='\u{1173B}',
    '\u{1173F}'..='\u{11746}',
];

/// The combining marks of the Line_Break class SA scripts:
/// the SA characters whose General_Category is Mn or Mc in `LineBreak.txt`, version 16.0.0.
pub const SOUTH_EAST_ASIAN_MARK_RANGES: [RangeInclusive<char>; 27] = [
    '\u{0E31}'..='\u{0E31}',
    '\u{0E34}'..='\u{0E3A}',
    '\u{0E47}'..='\u{0E4E}',
    '\u{0EB1}'..='\u{0EB1}',
    '\u{0EB4}'..='\u{0EBC}',
    '\u{0EC8}'..='\u{0ECE}',
    '\u{102B}'..='\u{103E}',
    '\u{1056}'..='\u{1059}',
    '\u{105E}'..='\u{1060}',
    '\u{1062}'..='\u{1064}',
    '\u{1067}'..='\u{106D}',
    '\u{1071}'..='\u{1074}',
    '\u{1082}'..='\u{108D}',
    '\u{108F}'..='\u{108F}',
    '\u{109A}'..='\u{109D}',
    '\u{17B4}'..='\u{17D3}',
    '\u{17DD}'..='\u{17DD}',
    '\u{1A55}'..='\u{1A5E}',
    '\u{1A60}'..='\u{1A7C}',
    '\u{A9E5}'..='\u{A9E5}',
    '\u{AA7B}'..='\u{AA7D}',
    '\u{AAB0}'..='\u{AAB0}',
    '\u{AAB2}'..='\u{AAB4}',
    '\u{AAB7}'..='\u{AAB8}',
    '\u{AABE}'..='\u{AABF}',
    '\u{AAC1}'..='\u{AAC1}',
    '\u{1171D}'..='\u{1172B}',
];

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn counts_a_kana_repetition_mark_as_unspaced() {
        assert!(is_unspaced('〱'));
    }

    #[test]
    fn counts_a_kana_supplement_letter_as_unspaced() {
        assert!(is_unspaced('\u{1B001}'));
    }

    #[test]
    fn counts_a_thai_letter_as_unspaced() {
        assert!(is_unspaced('ก'));
    }

    #[test]
    fn counts_a_latin_letter_as_spaced() {
        assert!(!is_unspaced('a'));
    }

    #[test]
    fn counts_a_thai_vowel_sign_as_a_mark() {
        assert!(is_unspaced_mark('\u{0E34}'));
    }
}

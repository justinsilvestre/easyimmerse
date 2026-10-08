//! The scripts written without spaces between words, in which a word may begin at any character.

use super::kanji_results::is_kanji;

/// Reports whether a character belongs to a script written without spaces between words.
///
/// These are kanji or Chinese characters, kana, and the marks written among them;
/// Bopomofo, which annotates Chinese and has the ideographic Line_Break class ID;
/// and the scripts of Line_Break class SA, "Complex Context Dependent (South East Asian)",
/// which Unicode Standard Annex #14 (Unicode Line Breaking Algorithm) assigns to Thai, Lao, Myanmar, Khmer,
/// Tai Le, New Tai Lue, Tai Tham, Myanmar Extended-A and -B, Tai Viet, and Ahom.
/// The SA ranges are those of `LineBreak.txt` in the Unicode Character Database, version 16.0.0.
pub fn is_unspaced(character: char) -> bool {
    is_kanji(character)
        || is_south_east_asian(character)
        || matches!(
            character,
            '\u{3005}'..='\u{3007}'
                | '\u{3040}'..='\u{30FF}'
                | '\u{3105}'..='\u{312F}'
                | '\u{31A0}'..='\u{31BF}'
                | '\u{31F0}'..='\u{31FF}'
                | '\u{FF66}'..='\u{FF9F}'
        )
}

/// Reports whether a character is a combining mark of a script of Line_Break class SA, such as a Thai vowel sign or tone mark.
/// A mark belongs to the letter before it, so no word begins with one.
/// These are the SA characters whose General_Category is Mn or Mc in `LineBreak.txt`, version 16.0.0.
pub fn is_unspaced_mark(character: char) -> bool {
    matches!(
        character,
        '\u{0E31}'
            | '\u{0E34}'..='\u{0E3A}'
            | '\u{0E47}'..='\u{0E4E}'
            | '\u{0EB1}'
            | '\u{0EB4}'..='\u{0EBC}'
            | '\u{0EC8}'..='\u{0ECE}'
            | '\u{102B}'..='\u{103E}'
            | '\u{1056}'..='\u{1059}'
            | '\u{105E}'..='\u{1060}'
            | '\u{1062}'..='\u{1064}'
            | '\u{1067}'..='\u{106D}'
            | '\u{1071}'..='\u{1074}'
            | '\u{1082}'..='\u{108D}'
            | '\u{108F}'
            | '\u{109A}'..='\u{109D}'
            | '\u{17B4}'..='\u{17D3}'
            | '\u{17DD}'
            | '\u{1A55}'..='\u{1A5E}'
            | '\u{1A60}'..='\u{1A7C}'
            | '\u{A9E5}'
            | '\u{AA7B}'..='\u{AA7D}'
            | '\u{AAB0}'
            | '\u{AAB2}'..='\u{AAB4}'
            | '\u{AAB7}'..='\u{AAB8}'
            | '\u{AABE}'..='\u{AABF}'
            | '\u{AAC1}'
            | '\u{1171D}'..='\u{1172B}'
    )
}

fn is_south_east_asian(character: char) -> bool {
    matches!(
        character,
        '\u{0E01}'..='\u{0E3A}'
            | '\u{0E40}'..='\u{0E4E}'
            | '\u{0E81}'..='\u{0E82}'
            | '\u{0E84}'
            | '\u{0E86}'..='\u{0E8A}'
            | '\u{0E8C}'..='\u{0EA3}'
            | '\u{0EA5}'
            | '\u{0EA7}'..='\u{0EBD}'
            | '\u{0EC0}'..='\u{0EC4}'
            | '\u{0EC6}'
            | '\u{0EC8}'..='\u{0ECE}'
            | '\u{0EDC}'..='\u{0EDF}'
            | '\u{1000}'..='\u{103F}'
            | '\u{1050}'..='\u{108F}'
            | '\u{109A}'..='\u{109F}'
            | '\u{1780}'..='\u{17D3}'
            | '\u{17D7}'
            | '\u{17DC}'..='\u{17DD}'
            | '\u{1950}'..='\u{196D}'
            | '\u{1970}'..='\u{1974}'
            | '\u{1980}'..='\u{19AB}'
            | '\u{19B0}'..='\u{19C9}'
            | '\u{19DE}'..='\u{19DF}'
            | '\u{1A20}'..='\u{1A5E}'
            | '\u{1A60}'..='\u{1A7C}'
            | '\u{1AA0}'..='\u{1AAD}'
            | '\u{A9E0}'..='\u{A9EF}'
            | '\u{A9FA}'..='\u{A9FE}'
            | '\u{AA60}'..='\u{AAC2}'
            | '\u{AADB}'..='\u{AADF}'
            | '\u{11700}'..='\u{1171A}'
            | '\u{1171D}'..='\u{1172B}'
            | '\u{1173A}'..='\u{1173B}'
            | '\u{1173F}'..='\u{11746}'
    )
}

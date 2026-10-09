//! Renders the constants the clients share with the server as a TypeScript module,
//! so that the clients prefetch, batch and split text exactly as the server looks it up.

use std::ops::RangeInclusive;

use easyimmerse_core::lookup::{
    KANA_AND_BOPOMOFO_RANGES, KANJI_RANGES, SOUTH_EAST_ASIAN_MARK_RANGES, SOUTH_EAST_ASIAN_RANGES,
};

use crate::routes::dictionary_batch_lookup::{MAX_TEXT_CHARACTERS, MAX_TEXTS};

fn render_module() -> String {
    let chinese_and_japanese = [KANJI_RANGES.as_slice(), &KANA_AND_BOPOMOFO_RANGES].concat();
    [
        "// Generated from the Rust constants by `crates/api/src/typescript_constants.rs`. Do not edit.\n".to_string(),
        "/** The most texts one batch lookup may hold. */".to_string(),
        format!("export const maxBatchTexts = {MAX_TEXTS};\n"),
        "/** The most characters (Unicode scalar values) one text of a batch lookup may hold. */".to_string(),
        format!("export const maxBatchTextCharacters = {MAX_TEXT_CHARACTERS};\n"),
        ranges_constant(
            "Kanji or Chinese characters, kana, the marks written among them, and Bopomofo, which are written without spaces between words.",
            "chineseAndJapaneseCharacterRanges",
            &chinese_and_japanese,
        ),
        ranges_constant(
            "The characters of the South East Asian scripts written without spaces between words, such as Thai, Lao, Myanmar and Khmer: those of Line_Break class SA.",
            "southEastAsianCharacterRanges",
            &SOUTH_EAST_ASIAN_RANGES,
        ),
        ranges_constant(
            "The combining marks of the South East Asian scripts, such as Thai vowel signs and tone marks, which belong to the letter before them.",
            "southEastAsianMarkRanges",
            &SOUTH_EAST_ASIAN_MARK_RANGES,
        ),
    ]
    .join("\n")
}

fn ranges_constant(description: &str, name: &str, ranges: &[RangeInclusive<char>]) -> String {
    let body: String = ranges.iter().map(range_in_class).collect();
    format!(
        "/**\n * {description}\n * The ranges are written for the inside of a character class of a regular expression with the `u` flag.\n */\nexport const {name} = String.raw`{body}`;\n"
    )
}

fn range_in_class(range: &RangeInclusive<char>) -> String {
    let (start, end) = (*range.start() as u32, *range.end() as u32);
    if start == end {
        format!("\\u{{{start:X}}}")
    } else {
        format!("\\u{{{start:X}}}-\\u{{{end:X}}}")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Rewrites the committed module when `EASYIMMERSE_UPDATE_CONSTANTS` is set,
    /// and otherwise checks that the committed module is current.
    #[test]
    fn the_committed_module_is_current() {
        let path = concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../packages/types/src/lookupConstants.ts"
        );
        let built = render_module();
        if std::env::var_os("EASYIMMERSE_UPDATE_CONSTANTS").is_some() {
            std::fs::write(path, built).unwrap();
        } else {
            let committed = std::fs::read_to_string(path).unwrap().replace("\r\n", "\n");
            assert_eq!(committed, built);
        }
    }

    #[test]
    fn writes_a_single_character_without_a_dash() {
        assert_eq!(range_in_class(&('\u{0E84}'..='\u{0E84}')), "\\u{E84}");
    }
}

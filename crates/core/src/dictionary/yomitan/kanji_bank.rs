//! Conversion of kanji bank and kanji meta bank rows.

use std::collections::BTreeMap;

use serde_json::Value;

use super::super::kanji_entry::{KanjiEntry, KanjiMeta};
use super::frequency::frequency;
use super::row_fields::{names_at, strings, strings_at, text_at};
use super::row_layout::RowLayout;

const MEANINGS: usize = 4;

/// Converts one kanji bank row, or returns `None` when the row has no character.
///
/// Rows of the current layout read `[character, onyomi, kunyomi, tags, meanings, stats]`.
/// Rows of the original layout read `[character, onyomi, kunyomi, tags, ...meanings]`.
pub fn kanji_entry(row: &[Value], layout: RowLayout) -> Option<KanjiEntry> {
    let (meanings, stats) = match layout {
        RowLayout::Current => (strings_at(row, MEANINGS), stats(row.get(5))),
        RowLayout::Original => (strings(row.get(MEANINGS..)?), BTreeMap::new()),
    };
    Some(KanjiEntry {
        character: text_at(row, 0)?.to_string(),
        onyomi: names_at(row, 1),
        kunyomi: names_at(row, 2),
        tags: names_at(row, 3),
        meanings,
        stats,
    })
}

/// Reads the stats object, writing numbers as text.
fn stats(value: Option<&Value>) -> BTreeMap<String, String> {
    let Some(fields) = value.and_then(Value::as_object) else {
        return BTreeMap::new();
    };
    fields
        .iter()
        .filter_map(|(name, stat)| Some((name.clone(), stat_text(stat)?)))
        .collect()
}

fn stat_text(stat: &Value) -> Option<String> {
    match stat {
        Value::String(text) => Some(text.clone()),
        Value::Number(number) => Some(number.to_string()),
        _ => None,
    }
}

pub type KanjiMetaRow = (String, String, Value);

/// Converts one kanji meta bank row, `[character, "freq", frequency]`.
/// Returns `None` for any other mode or a frequency that cannot be read.
pub fn kanji_meta((character, mode, data): KanjiMetaRow) -> Option<KanjiMeta> {
    if mode != "freq" {
        return None;
    }
    Some(KanjiMeta {
        character,
        frequency: frequency(&data)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dictionary::Frequency;
    use serde_json::json;

    fn current(row: Value) -> KanjiEntry {
        kanji_entry(row.as_array().unwrap(), RowLayout::Current).unwrap()
    }

    fn cat() -> KanjiEntry {
        current(json!(["猫", "ビョウ", "ねこ", "jouyou", ["cat"], {"strokes": "11", "grade": 8}]))
    }

    #[test]
    fn reads_the_character() {
        assert_eq!(cat().character, "猫");
    }

    #[test]
    fn reads_the_onyomi() {
        assert_eq!(cat().onyomi, vec!["ビョウ"]);
    }

    #[test]
    fn reads_the_kunyomi() {
        assert_eq!(cat().kunyomi, vec!["ねこ"]);
    }

    #[test]
    fn reads_the_tags() {
        assert_eq!(cat().tags, vec!["jouyou"]);
    }

    #[test]
    fn reads_the_meanings() {
        assert_eq!(cat().meanings, vec!["cat"]);
    }

    #[test]
    fn reads_the_stats_writing_numbers_as_text() {
        let expected = BTreeMap::from([
            ("grade".into(), "8".into()),
            ("strokes".into(), "11".into()),
        ]);
        assert_eq!(cat().stats, expected);
    }

    #[test]
    fn reads_the_trailing_meanings_of_the_original_layout() {
        let row = json!(["猫", "ビョウ", "ねこ", "", "cat", "feline"]);
        let entry = kanji_entry(row.as_array().unwrap(), RowLayout::Original).unwrap();
        assert_eq!(entry.meanings, vec!["cat", "feline"]);
    }

    #[test]
    fn rejects_a_row_without_a_character() {
        assert_eq!(kanji_entry(&[json!(1)], RowLayout::Current), None);
    }

    #[test]
    fn reads_a_kanji_frequency() {
        assert_eq!(
            kanji_meta(("猫".into(), "freq".into(), json!(1702))),
            Some(KanjiMeta {
                character: "猫".into(),
                frequency: Frequency {
                    value: Some(1702.0),
                    display: None,
                },
            })
        );
    }

    #[test]
    fn rejects_a_kanji_meta_row_of_another_mode() {
        assert_eq!(kanji_meta(("猫".into(), "pitch".into(), json!(1))), None);
    }
}

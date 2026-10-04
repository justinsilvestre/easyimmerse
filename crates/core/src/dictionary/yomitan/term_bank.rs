//! Conversion of term bank rows into term entries.

use serde_json::Value;

use super::super::term_entry::{Definition, TermEntry};
use super::glossary::definitions;
use super::row_fields::{integer_at, names_at, text_at};
use super::row_layout::RowLayout;

const GLOSSARY: usize = 5;

/// Converts one term bank row, or returns `None` when the row has no term or no glossary.
///
/// Rows of the current layout read `[term, reading, definitionTags, rules, score, glossary, sequence, termTags]`.
/// Rows of the original layout read `[term, reading, definitionTags, rules, score, ...glossary]`.
pub fn term_entry(row: &[Value], layout: RowLayout) -> Option<TermEntry> {
    let mut entry = TermEntry::new(text_at(row, 0)?, glossary(row, layout)?);
    entry.reading = text_at(row, 1)
        .filter(|reading| !reading.is_empty())
        .map(String::from);
    entry.definition_tags = names_at(row, 2);
    entry.word_classes = names_at(row, 3);
    entry.score = integer_at(row, 4).unwrap_or(0);
    if layout == RowLayout::Current {
        entry.sequence = integer_at(row, 6);
        entry.term_tags = names_at(row, 7);
    }
    Some(entry)
}

fn glossary(row: &[Value], layout: RowLayout) -> Option<Vec<Definition>> {
    match layout {
        RowLayout::Current => Some(definitions(row.get(GLOSSARY)?.as_array()?)),
        RowLayout::Original => Some(definitions(row.get(GLOSSARY..).unwrap_or_default())),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn current(row: Value) -> Option<TermEntry> {
        term_entry(row.as_array().unwrap(), RowLayout::Current)
    }

    fn cat() -> TermEntry {
        current(json!(["猫", "ねこ", "n common", "", 5, ["cat"], 12, "P"])).unwrap()
    }

    #[test]
    fn reads_the_term() {
        assert_eq!(cat().term, "猫");
    }

    #[test]
    fn reads_the_reading() {
        assert_eq!(cat().reading.as_deref(), Some("ねこ"));
    }

    #[test]
    fn treats_an_empty_reading_as_none() {
        let entry = current(json!(["cat", "", "", "", 0, ["a cat"], 1, ""])).unwrap();
        assert_eq!(entry.reading, None);
    }

    #[test]
    fn reads_the_definition_tags() {
        assert_eq!(cat().definition_tags, vec!["n", "common"]);
    }

    #[test]
    fn reads_null_definition_tags_as_none() {
        let entry = current(json!(["猫", "ねこ", null, "", 0, ["cat"], 1, ""])).unwrap();
        assert!(entry.definition_tags.is_empty());
    }

    #[test]
    fn reads_the_rules_as_word_classes() {
        let entry = current(json!(["食べる", "たべる", "", "v1", 0, ["eat"], 3, ""])).unwrap();
        assert_eq!(entry.word_classes, vec!["v1"]);
    }

    #[test]
    fn reads_the_score() {
        assert_eq!(cat().score, 5);
    }

    #[test]
    fn reads_the_glossary() {
        assert_eq!(cat().definitions, vec![Definition::text("cat")]);
    }

    #[test]
    fn reads_the_sequence() {
        assert_eq!(cat().sequence, Some(12));
    }

    #[test]
    fn reads_the_term_tags() {
        assert_eq!(cat().term_tags, vec!["P"]);
    }

    #[test]
    fn rejects_a_row_without_a_term() {
        assert_eq!(current(json!([1])), None);
    }

    #[test]
    fn rejects_a_row_without_a_glossary() {
        assert_eq!(current(json!(["猫", "ねこ", "", "", 0])), None);
    }

    #[test]
    fn reads_the_trailing_glossary_of_the_original_layout() {
        let row = json!(["猫", "ねこ", "n", "", 0, "cat", "feline"]);
        let entry = term_entry(row.as_array().unwrap(), RowLayout::Original).unwrap();
        assert_eq!(
            entry.definitions,
            vec![Definition::text("cat"), Definition::text("feline")]
        );
    }
}

//! Conversion of tag bank rows, `[name, category, order, notes, score]`, into tag definitions.

use serde::Deserialize;

use super::super::tag_definition::TagDefinition;

#[derive(Debug, Deserialize)]
pub struct TagRow(String, String, f64, String, f64);

impl From<TagRow> for TagDefinition {
    fn from(TagRow(name, category, order, notes, score): TagRow) -> Self {
        Self {
            name,
            category,
            order: order as i64,
            notes,
            score: score as i64,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn reads_a_tag_definition() {
        let row = TagRow::deserialize(json!(["n", "partOfSpeech", -3, "noun", 0])).unwrap();
        assert_eq!(
            TagDefinition::from(row),
            TagDefinition {
                name: "n".into(),
                category: "partOfSpeech".into(),
                order: -3,
                notes: "noun".into(),
                score: 0,
            }
        );
    }
}

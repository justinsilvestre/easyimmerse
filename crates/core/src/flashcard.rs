//! The flashcard model and its field presets.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

/// Returns the field names a new flashcard starts with for the given preset.
pub fn preset_field_names(preset: FieldPreset) -> Vec<&'static str> {
    match preset {
        FieldPreset::Basic => vec!["Front", "Back"],
        FieldPreset::Sentence => vec!["Sentence", "Word", "Definition", "Audio", "Image"],
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct Flashcard {
    pub fields: Vec<FlashcardField>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct FlashcardField {
    pub name: String,
    pub value: String,
}

/// A named set of fields to start a flashcard from. `Basic` is a front and a back;
/// `Sentence` holds a sentence in context with the word, its definition, audio, and an
/// image. Generation from a word in context and export formats are not implemented yet.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum FieldPreset {
    Basic,
    Sentence,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lists_a_front_and_a_back_for_the_basic_preset() {
        assert_eq!(
            preset_field_names(FieldPreset::Basic),
            vec!["Front", "Back"]
        );
    }
}

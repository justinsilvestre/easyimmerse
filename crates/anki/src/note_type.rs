use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::anki_field::AnkiField;
use crate::card_css::CARD_CSS;
use crate::card_template::card_template;
use crate::deck_spec::DeckSpec;
use crate::derived_id::note_type_id;

/// The note type (Anki "model") of a project's deck, as both the package and AnkiConnect create it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AnkiNoteType {
    /// A 31-bit number derived from the project id, stable across exports.
    pub id: u64,
    pub name: String,
    /// Field names in order. The first is the sort field and the field Anki checks for duplicates.
    pub fields: Vec<String>,
    pub templates: Vec<AnkiTemplate>,
    pub css: String,
}

/// A card template: the HTML of each side of the card, with `{{Field}}` placeholders.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AnkiTemplate {
    pub name: String,
    pub front: String,
    pub back: String,
}

/// Builds the note type of a project's deck, with one card template laid out by `spec.front_fields`.
pub fn note_type(spec: &DeckSpec) -> AnkiNoteType {
    AnkiNoteType {
        id: note_type_id(spec.project_id),
        name: format!("easyImmerse: {}", spec.project_name),
        fields: AnkiField::ALL
            .iter()
            .map(|field| field.name().to_owned())
            .collect(),
        templates: vec![card_template(spec.front_fields)],
        css: CARD_CSS.to_owned(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::deck_spec;

    #[test]
    fn names_the_fields_in_their_fixed_order() {
        assert_eq!(
            note_type(&deck_spec()).fields,
            [
                "Word",
                "Word pronunciation",
                "Definition",
                "Definition (target language)",
                "Sentence",
                "Sentence translation",
                "Sentence pronunciation",
                "Sentence audio",
                "Screenshot",
                "easyImmerse id",
            ]
        );
    }

    #[test]
    fn names_the_note_type_after_the_project() {
        assert_eq!(note_type(&deck_spec()).name, "easyImmerse: Die Verwandlung");
    }

    #[test]
    fn derives_the_id_from_the_project_id() {
        assert_eq!(note_type(&deck_spec()).id, 1_665_021_395);
    }
}

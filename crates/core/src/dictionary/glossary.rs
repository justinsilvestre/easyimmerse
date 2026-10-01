use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use ts_rs::TS;
use utoipa::openapi::RefOr;
use utoipa::openapi::schema::{ArrayBuilder, ArrayItems, ObjectBuilder, Schema, Type};
use utoipa::{PartialSchema, ToSchema};

use super::glossary_image::GlossaryImage;
use super::structured_content::StructuredContent;

/// One definition of a term, in any of the forms the Yomitan term bank v3 schema allows.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(untagged)]
#[ts(export)]
pub enum Glossary {
    /// A plain-text definition.
    Text(String),
    /// A note that the term is an inflected form of another term.
    Deinflection(Deinflection),
    Detailed(DetailedGlossary),
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(tag = "type", rename_all = "kebab-case")]
#[ts(export)]
pub enum DetailedGlossary {
    Text { text: String },
    Image(GlossaryImage),
    StructuredContent { content: StructuredContent },
}

/// The uninflected form of a term, and the inflection rules that produce the term from it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Deinflection(pub String, pub Vec<String>);

/// Describes the pair as a two-item tuple, which the derived schema cannot express.
impl PartialSchema for Deinflection {
    fn schema() -> RefOr<Schema> {
        let string = || ObjectBuilder::new().schema_type(Type::String);
        ArrayBuilder::new()
            .prefix_items([
                Schema::from(string()),
                Schema::from(ArrayBuilder::new().items(string())),
            ])
            .items(ArrayItems::False)
            .description(Some(
                "The uninflected form of a term, and the inflection rules that produce the term from it.",
            ))
            .into()
    }
}

impl ToSchema for Deinflection {}

/// Reads a JSON array of glossary items, dropping any item that does not follow the schema.
/// Returns no items when the JSON is not an array.
pub fn parse_glossary(json: &str) -> Vec<Glossary> {
    let items: Vec<&RawValue> = serde_json::from_str(json).unwrap_or_default();
    items
        .into_iter()
        .filter_map(|item| serde_json::from_str(item.get()).ok())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dictionary::structured_content::StructuredContentElement;

    fn parse_one(json: &str) -> Glossary {
        parse_glossary(&format!("[{json}]")).remove(0)
    }

    #[test]
    fn reads_a_plain_string() {
        assert_eq!(parse_one(r#""cat""#), Glossary::Text("cat".into()));
    }

    #[test]
    fn reads_a_text_item() {
        assert_eq!(
            parse_one(r#"{"type":"text","text":"cat"}"#),
            Glossary::Detailed(DetailedGlossary::Text { text: "cat".into() })
        );
    }

    #[test]
    fn reads_the_path_of_an_image_item() {
        let Glossary::Detailed(DetailedGlossary::Image(image)) =
            parse_one(r#"{"type":"image","path":"img/cat.svg","width":2}"#)
        else {
            panic!("expected an image item");
        };
        assert_eq!(image.path, "img/cat.svg");
    }

    #[test]
    fn reads_a_deinflection_item() {
        assert_eq!(
            parse_one(r#"["食べる",["past"]]"#),
            Glossary::Deinflection(Deinflection("食べる".into(), vec!["past".into()]))
        );
    }

    #[test]
    fn reads_a_structured_content_element_given_as_a_single_object() {
        let Glossary::Detailed(DetailedGlossary::StructuredContent {
            content: StructuredContent::Element(element),
        }) = parse_one(r#"{"type":"structured-content","content":{"tag":"li","content":"cat"}}"#)
        else {
            panic!("expected a structured-content element");
        };
        assert!(matches!(*element, StructuredContentElement::Li(_)));
    }

    #[test]
    fn reads_the_data_attributes_of_an_element() {
        let Glossary::Detailed(DetailedGlossary::StructuredContent {
            content: StructuredContent::Element(element),
        }) = parse_one(
            r#"{"type":"structured-content","content":{"tag":"span","data":{"content":"tag"}}}"#,
        )
        else {
            panic!("expected a structured-content element");
        };
        let StructuredContentElement::Span(span) = *element else {
            panic!("expected a span");
        };
        assert_eq!(span.data.unwrap().0["content"], "tag");
    }

    #[test]
    fn drops_an_item_with_an_unknown_type() {
        assert_eq!(parse_glossary(r#"[{"type":"video"},"cat"]"#).len(), 1);
    }

    #[test]
    fn drops_an_element_with_an_unknown_tag() {
        let json = r#"[{"type":"structured-content","content":{"tag":"script"}}]"#;
        assert!(parse_glossary(json).is_empty());
    }

    #[test]
    fn returns_nothing_for_json_that_is_not_an_array() {
        assert!(parse_glossary(r#"{"type":"text","text":"cat"}"#).is_empty());
    }

    #[test]
    fn serializes_an_element_without_its_absent_attributes() {
        let element = parse_one(r#"{"type":"structured-content","content":{"tag":"br"}}"#);
        assert_eq!(
            serde_json::to_string(&element).unwrap(),
            r#"{"type":"structured-content","content":{"tag":"br"}}"#
        );
    }
}

//! Conversion of the items of a term's glossary into definitions.

use serde::Deserialize;
use serde_json::{Map, Value};

use super::super::structured_content::{ImageElement, StructuredContent, StructuredElement};
use super::super::term_entry::Definition;
use super::glossary_text::plain_text;
use super::row_fields::strings;

/// Converts the glossary items that can be read, falling back to the plain text of those that cannot.
/// Items with neither are left out.
pub fn definitions(items: &[Value]) -> Vec<Definition> {
    items.iter().filter_map(definition).collect()
}

fn definition(item: &Value) -> Option<Definition> {
    convert(item).or_else(|| plain_text(item).map(Definition::text))
}

fn convert(item: &Value) -> Option<Definition> {
    match item {
        Value::String(text) => Some(Definition::text(text)),
        Value::Array(parts) => form_of(parts),
        Value::Object(fields) => convert_object(item, fields),
        _ => None,
    }
}

fn convert_object(item: &Value, fields: &Map<String, Value>) -> Option<Definition> {
    match fields.get("type")?.as_str()? {
        "text" => Some(Definition::text(fields.get("text")?.as_str()?)),
        "image" => image(item),
        "structured-content" => structured(fields.get("content")?),
        _ => None,
    }
}

/// Reads `[uninflected, [inflection names]]`.
fn form_of(parts: &[Value]) -> Option<Definition> {
    let [base, inflections] = parts else {
        return None;
    };
    Some(Definition::FormOf {
        base: base.as_str()?.to_string(),
        inflections: strings(inflections.as_array()?),
    })
}

fn image(item: &Value) -> Option<Definition> {
    let mut image = ImageElement::deserialize(item).ok()?;
    if image.image_rendering.is_none() && is_pixelated(item) {
        image.image_rendering = Some("pixelated".into());
    }
    let element = StructuredElement::Img(image);
    Some(structured_definition(StructuredContent::Element(Box::new(
        element,
    ))))
}

/// Reads the older boolean form of `imageRendering: "pixelated"`.
fn is_pixelated(item: &Value) -> bool {
    item.get("pixelated").and_then(Value::as_bool) == Some(true)
}

fn structured(content: &Value) -> Option<Definition> {
    let content = StructuredContent::deserialize(content).ok()?;
    Some(structured_definition(content))
}

fn structured_definition(content: StructuredContent) -> Definition {
    Definition::Structured { content }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn convert_one(item: Value) -> Vec<Definition> {
        definitions(&[item])
    }

    fn image_definition(image: ImageElement) -> Definition {
        structured_definition(StructuredContent::Element(Box::new(
            StructuredElement::Img(image),
        )))
    }

    #[test]
    fn reads_a_string_as_text() {
        assert_eq!(convert_one(json!("cat")), vec![Definition::text("cat")]);
    }

    #[test]
    fn reads_a_text_item_as_text() {
        assert_eq!(
            convert_one(json!({"type": "text", "text": "cat"})),
            vec![Definition::text("cat")]
        );
    }

    #[test]
    fn reads_an_image_item_as_an_img_element() {
        let image = ImageElement {
            path: "cat.png".into(),
            width: Some(2.0),
            ..ImageElement::default()
        };
        assert_eq!(
            convert_one(json!({"type": "image", "path": "cat.png", "width": 2})),
            vec![image_definition(image)]
        );
    }

    #[test]
    fn reads_the_old_pixelated_flag_of_an_image() {
        let image = ImageElement {
            path: "cat.png".into(),
            image_rendering: Some("pixelated".into()),
            ..ImageElement::default()
        };
        assert_eq!(
            convert_one(json!({"type": "image", "path": "cat.png", "pixelated": true})),
            vec![image_definition(image)]
        );
    }

    #[test]
    fn reads_structured_content() {
        let item = json!({"type": "structured-content", "content": ["a ", {"tag": "br"}]});
        let content = StructuredContent::deserialize(&json!(["a ", {"tag": "br"}])).unwrap();
        assert_eq!(convert_one(item), vec![structured_definition(content)]);
    }

    #[test]
    fn reads_a_form_of_item() {
        assert_eq!(
            convert_one(json!(["食べる", ["past"]])),
            vec![Definition::FormOf {
                base: "食べる".into(),
                inflections: vec!["past".into()],
            }]
        );
    }

    #[test]
    fn falls_back_to_the_text_of_unreadable_structured_content() {
        let item =
            json!({"type": "structured-content", "content": {"tag": "blink", "content": "cat"}});
        assert_eq!(convert_one(item), vec![Definition::text("cat")]);
    }

    #[test]
    fn leaves_out_an_image_without_a_path() {
        assert!(convert_one(json!({"type": "image"})).is_empty());
    }

    #[test]
    fn leaves_out_an_item_of_an_unknown_type_without_text() {
        assert!(convert_one(json!({"type": "video"})).is_empty());
    }

    #[test]
    fn leaves_out_a_number() {
        assert!(convert_one(json!(3)).is_empty());
    }
}

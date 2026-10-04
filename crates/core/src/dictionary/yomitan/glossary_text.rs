//! The plain text of a glossary item that could not be read in full.

use serde_json::Value;

/// Returns the text of a glossary object: its `text` field, or the text nodes under its `content`.
/// Ruby annotations are left out and line breaks become newlines.
pub fn plain_text(item: &Value) -> Option<String> {
    let fields = item.as_object()?;
    let mut text = String::new();
    match fields.get("text").and_then(Value::as_str) {
        Some(own_text) => text.push_str(own_text),
        None => collect_text(fields.get("content")?, &mut text),
    }
    (!text.trim().is_empty()).then_some(text)
}

fn collect_text(node: &Value, text: &mut String) {
    match node {
        Value::String(node_text) => text.push_str(node_text),
        Value::Array(nodes) => nodes.iter().for_each(|node| collect_text(node, text)),
        Value::Object(fields) => match fields.get("tag").and_then(Value::as_str) {
            Some("br") => text.push('\n'),
            Some("rt" | "rp") => {}
            _ => fields
                .get("content")
                .into_iter()
                .for_each(|content| collect_text(content, text)),
        },
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn content(node: Value) -> Value {
        json!({"type": "structured-content", "content": node})
    }

    #[test]
    fn reads_the_text_field() {
        assert_eq!(
            plain_text(&json!({"type": "x", "text": "cat"})),
            Some("cat".into())
        );
    }

    #[test]
    fn joins_nested_text_nodes() {
        let node = json!(["a ", {"tag": "span", "content": ["b", "c"]}]);
        assert_eq!(plain_text(&content(node)), Some("a bc".into()));
    }

    #[test]
    fn leaves_out_ruby_annotations() {
        let node = json!({"tag": "ruby", "content": ["猫", {"tag": "rt", "content": "ねこ"}]});
        assert_eq!(plain_text(&content(node)), Some("猫".into()));
    }

    #[test]
    fn turns_line_breaks_into_newlines() {
        let node = json!(["a", {"tag": "br"}, "b"]);
        assert_eq!(plain_text(&content(node)), Some("a\nb".into()));
    }

    #[test]
    fn has_no_text_for_blank_content() {
        assert_eq!(plain_text(&content(json!(" "))), None);
    }

    #[test]
    fn has_no_text_for_an_array() {
        assert_eq!(plain_text(&json!(["a", "b"])), None);
    }
}

use crate::dictionary::{Definition, MarkupDialect, TermEntry};

use super::byte_cursor::decode_text;
use super::fields::Field;
use super::resource_list::resource_list_html;

/// Builds a term entry from the fields of one StarDict entry.
///
/// A phonetic (`t`) or reading (`y`) field becomes the entry's reading unless an earlier one already has;
/// later ones become text definitions.
/// Binary fields and unknown types are skipped.
pub fn term_entry(word: String, fields: &[Field]) -> TermEntry {
    let mut entry = TermEntry::new(word, Vec::new());
    for field in fields.iter().filter(|field| !field.data.is_empty()) {
        add_field(&mut entry, field);
    }
    entry
}

fn add_field(entry: &mut TermEntry, field: &Field) {
    let is_reading = matches!(field.kind, b't' | b'y') && entry.reading.is_none();
    if is_reading {
        entry.reading = Some(decode_text(field.data).trim().to_string());
    } else if let Some(definition) = definition(field.kind, field.data) {
        entry.definitions.push(definition);
    }
}

fn definition(kind: u8, data: &[u8]) -> Option<Definition> {
    let text = decode_text(data);
    match kind {
        b'm' | b'l' | b'n' | b'w' | b't' | b'y' => Some(Definition::text(text)),
        b'k' => Some(Definition::text(strip_xml_tags(&text))),
        b'h' => Some(Definition::Html { html: text }),
        b'g' => Some(markup(MarkupDialect::Pango, text)),
        b'x' => Some(markup(MarkupDialect::Xdxf, text)),
        b'r' => Some(resource_list_html(&text))
            .filter(|html| !html.is_empty())
            .map(|html| Definition::Html { html }),
        _ => None,
    }
}

fn markup(dialect: MarkupDialect, markup: String) -> Definition {
    Definition::Markup { dialect, markup }
}

/// Reduces KingSoft PowerWord XML to its text, since it has no renderer of its own.
fn strip_xml_tags(xml: &str) -> String {
    let mut text = String::with_capacity(xml.len());
    let mut is_in_tag = false;
    for character in xml.chars() {
        match character {
            '<' => is_in_tag = true,
            '>' => is_in_tag = false,
            _ if !is_in_tag => text.push(character),
            _ => {}
        }
    }
    unescape_xml(&text)
}

fn unescape_xml(text: &str) -> String {
    [
        ("&lt;", "<"),
        ("&gt;", ">"),
        ("&quot;", "\""),
        ("&apos;", "'"),
        ("&amp;", "&"),
    ]
    .iter()
    .fold(text.to_string(), |text, (entity, character)| {
        text.replace(entity, character)
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn field(kind: u8, data: &str) -> Field<'_> {
        Field {
            kind,
            data: data.as_bytes(),
        }
    }

    fn definitions(fields: &[Field]) -> Vec<Definition> {
        term_entry("cat".to_string(), fields).definitions
    }

    #[test]
    fn turns_plain_text_into_a_text_definition() {
        assert_eq!(
            definitions(&[field(b'm', "a small animal")]),
            vec![Definition::text("a small animal")]
        );
    }

    #[test]
    fn turns_html_into_an_html_definition() {
        assert_eq!(
            definitions(&[field(b'h', "<b>cat</b>")]),
            vec![Definition::Html {
                html: "<b>cat</b>".to_string()
            }]
        );
    }

    #[test]
    fn turns_pango_markup_into_a_pango_definition() {
        assert_eq!(
            definitions(&[field(b'g', "<i>n.</i>")]),
            vec![markup(MarkupDialect::Pango, "<i>n.</i>".to_string())]
        );
    }

    #[test]
    fn turns_xdxf_into_an_xdxf_definition() {
        assert_eq!(
            definitions(&[field(b'x', "<dtrn>cat</dtrn>")]),
            vec![markup(MarkupDialect::Xdxf, "<dtrn>cat</dtrn>".to_string())]
        );
    }

    #[test]
    fn strips_the_tags_of_kingsoft_xml() {
        assert_eq!(
            definitions(&[field(b'k', "<CK>a &amp; b</CK>")]),
            vec![Definition::text("a & b")]
        );
    }

    #[test]
    fn turns_a_resource_list_into_html() {
        assert_eq!(
            definitions(&[field(b'r', "img:cat.png")]),
            vec![Definition::Html {
                html: r#"<img src="cat.png">"#.to_string()
            }]
        );
    }

    #[test]
    fn skips_binary_fields() {
        assert_eq!(definitions(&[field(b'W', "RIFF")]), vec![]);
    }

    #[test]
    fn skips_unknown_field_types() {
        assert_eq!(definitions(&[field(b'z', "?")]), vec![]);
    }

    #[test]
    fn uses_a_phonetic_field_as_the_reading() {
        let entry = term_entry("cat".to_string(), &[field(b't', "kæt")]);
        assert_eq!(entry.reading.as_deref(), Some("kæt"));
    }

    #[test]
    fn keeps_a_second_reading_field_as_text() {
        assert_eq!(
            definitions(&[field(b'y', "ねこ"), field(b't', "neko")]),
            vec![Definition::text("neko")]
        );
    }

    #[test]
    fn skips_empty_fields() {
        let entry = term_entry("cat".to_string(), &[field(b't', ""), field(b'y', "ねこ")]);
        assert_eq!(entry.reading.as_deref(), Some("ねこ"));
    }
}

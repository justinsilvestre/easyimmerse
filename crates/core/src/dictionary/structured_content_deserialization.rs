//! Deserialization of structured content in a single pass over the input.
//!
//! The derived form of an untagged enum, and of an enum tagged by one of its fields, first copies its whole input into a buffer.
//! Nested content is copied again at every level, so with them a deeply nested glossary takes time proportional to its size times its depth.
//! Here each node is read by the kind of JSON value it is, and an element is read into the union of every element's fields,
//! from which its tag then picks the variant. The fields may come in any order.

use std::fmt;

use serde::Deserialize;
use serde::de::value::MapAccessDeserializer;
use serde::de::{self, Deserializer, MapAccess, SeqAccess, Visitor};

use super::structured_content::{
    ContainerElement, DetailsElement, ElementData, ElementStyle, EmptyElement, ImageElement,
    LinkElement, StructuredContent, StructuredElement, TableCellElement,
};

const TAGS: &[&str] = &[
    "br", "ruby", "rt", "rp", "table", "thead", "tbody", "tfoot", "tr", "td", "th", "span", "div",
    "ol", "ul", "li", "details", "summary", "a", "img",
];

impl<'de> Deserialize<'de> for StructuredContent {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        deserializer.deserialize_any(ContentVisitor)
    }
}

impl<'de> Deserialize<'de> for StructuredElement {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        ElementFields::deserialize(deserializer)?.into_element()
    }
}

struct ContentVisitor;

impl<'de> Visitor<'de> for ContentVisitor {
    type Value = StructuredContent;

    fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
        formatter.write_str("a string, an array of nodes, or an element")
    }

    fn visit_str<E: de::Error>(self, text: &str) -> Result<Self::Value, E> {
        Ok(StructuredContent::Text(text.to_string()))
    }

    fn visit_string<E: de::Error>(self, text: String) -> Result<Self::Value, E> {
        Ok(StructuredContent::Text(text))
    }

    fn visit_seq<A: SeqAccess<'de>>(self, mut nodes: A) -> Result<Self::Value, A::Error> {
        let mut content = Vec::new();
        while let Some(node) = nodes.next_element()? {
            content.push(node);
        }
        Ok(StructuredContent::Nodes(content))
    }

    fn visit_map<A: MapAccess<'de>>(self, fields: A) -> Result<Self::Value, A::Error> {
        let element = StructuredElement::deserialize(MapAccessDeserializer::new(fields))?;
        Ok(StructuredContent::Element(Box::new(element)))
    }
}

/// Every field that any element can have. Fields that the tagged element lacks are dropped.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ElementFields {
    tag: String,
    content: Option<StructuredContent>,
    data: Option<ElementData>,
    style: Option<ElementStyle>,
    title: Option<String>,
    lang: Option<String>,
    col_span: Option<u32>,
    row_span: Option<u32>,
    open: Option<bool>,
    href: Option<String>,
    path: Option<String>,
    width: Option<f64>,
    height: Option<f64>,
    size_units: Option<String>,
    alt: Option<String>,
    description: Option<String>,
    image_rendering: Option<String>,
    appearance: Option<String>,
    background: Option<bool>,
    collapsed: Option<bool>,
    collapsible: Option<bool>,
    vertical_align: Option<String>,
    border: Option<String>,
    border_radius: Option<String>,
}

impl ElementFields {
    fn into_element<E: de::Error>(self) -> Result<StructuredElement, E> {
        use StructuredElement as Element;
        Ok(match self.tag.as_str() {
            "br" => Element::Br(EmptyElement { data: self.data }),
            "ruby" => Element::Ruby(self.container()),
            "rt" => Element::Rt(self.container()),
            "rp" => Element::Rp(self.container()),
            "table" => Element::Table(self.container()),
            "thead" => Element::Thead(self.container()),
            "tbody" => Element::Tbody(self.container()),
            "tfoot" => Element::Tfoot(self.container()),
            "tr" => Element::Tr(self.container()),
            "td" => Element::Td(self.table_cell()),
            "th" => Element::Th(self.table_cell()),
            "span" => Element::Span(self.container()),
            "div" => Element::Div(self.container()),
            "ol" => Element::Ol(self.container()),
            "ul" => Element::Ul(self.container()),
            "li" => Element::Li(self.container()),
            "details" => Element::Details(self.details()),
            "summary" => Element::Summary(self.container()),
            "a" => Element::A(self.link()?),
            "img" => Element::Img(self.image()?),
            tag => return Err(de::Error::unknown_variant(tag, TAGS)),
        })
    }

    fn container(self) -> ContainerElement {
        ContainerElement {
            content: self.content,
            data: self.data,
            style: self.style,
            title: self.title,
            lang: self.lang,
        }
    }

    fn table_cell(self) -> TableCellElement {
        TableCellElement {
            col_span: self.col_span,
            row_span: self.row_span,
            container: self.container(),
        }
    }

    fn details(self) -> DetailsElement {
        DetailsElement {
            open: self.open,
            container: self.container(),
        }
    }

    fn link<E: de::Error>(self) -> Result<LinkElement, E> {
        Ok(LinkElement {
            content: self.content,
            href: self.href.ok_or_else(|| de::Error::missing_field("href"))?,
            lang: self.lang,
        })
    }

    fn image<E: de::Error>(self) -> Result<ImageElement, E> {
        Ok(ImageElement {
            path: self.path.ok_or_else(|| de::Error::missing_field("path"))?,
            width: self.width,
            height: self.height,
            size_units: self.size_units,
            title: self.title,
            alt: self.alt,
            description: self.description,
            image_rendering: self.image_rendering,
            appearance: self.appearance,
            background: self.background,
            collapsed: self.collapsed,
            collapsible: self.collapsible,
            vertical_align: self.vertical_align,
            border: self.border,
            border_radius: self.border_radius,
            data: self.data,
        })
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    fn parse(text: &str) -> Result<StructuredContent, serde_json::Error> {
        serde_json::from_str(text)
    }

    fn element_content(element: StructuredElement) -> StructuredContent {
        StructuredContent::Element(Box::new(element))
    }

    fn span(text: &str) -> StructuredContent {
        element_content(StructuredElement::Span(ContainerElement {
            content: Some(StructuredContent::Text(text.into())),
            ..ContainerElement::default()
        }))
    }

    #[test]
    fn reads_a_string_as_text() {
        assert_eq!(
            parse(r#""cat""#).unwrap(),
            StructuredContent::Text("cat".into())
        );
    }

    #[test]
    fn reads_an_array_as_nodes() {
        assert_eq!(
            parse(r#"["a", {"tag": "br"}]"#).unwrap(),
            StructuredContent::Nodes(vec![
                StructuredContent::Text("a".into()),
                element_content(StructuredElement::Br(EmptyElement::default())),
            ])
        );
    }

    #[test]
    fn reads_an_element_whose_tag_comes_first() {
        assert_eq!(
            parse(r#"{"tag": "span", "content": "cat"}"#).unwrap(),
            span("cat")
        );
    }

    #[test]
    fn reads_an_element_whose_tag_comes_last() {
        assert_eq!(
            parse(r#"{"content": "cat", "tag": "span"}"#).unwrap(),
            span("cat")
        );
    }

    #[test]
    fn reads_nested_elements() {
        let link = StructuredElement::A(LinkElement {
            content: Some(span("cat")),
            href: "?query=cat".into(),
            lang: None,
        });
        assert_eq!(
            parse(r#"{"tag": "a", "href": "?query=cat", "content": {"tag": "span", "content": "cat"}}"#)
                .unwrap(),
            element_content(link)
        );
    }

    #[test]
    fn reads_the_fields_of_a_table_cell() {
        let cell = StructuredElement::Td(TableCellElement {
            container: ContainerElement {
                content: Some(StructuredContent::Text("1".into())),
                ..ContainerElement::default()
            },
            col_span: Some(2),
            row_span: None,
        });
        assert_eq!(
            parse(r#"{"tag": "td", "colSpan": 2, "content": "1"}"#).unwrap(),
            element_content(cell)
        );
    }

    #[test]
    fn drops_unknown_fields() {
        assert_eq!(
            parse(r#"{"tag": "span", "onclick": "x", "content": "cat"}"#).unwrap(),
            span("cat")
        );
    }

    #[test]
    fn reads_a_json_value() {
        let value = json!({"tag": "span", "content": "cat"});
        assert_eq!(StructuredContent::deserialize(&value).unwrap(), span("cat"));
    }

    #[test]
    fn reads_what_it_serializes() {
        let content = StructuredContent::Nodes(vec![span("cat"), span("dog")]);
        let text = serde_json::to_string(&content).unwrap();
        assert_eq!(parse(&text).unwrap(), content);
    }

    #[test]
    fn reads_an_image() {
        let image = StructuredElement::Img(ImageElement {
            path: "cat.png".into(),
            width: Some(2.0),
            ..ImageElement::default()
        });
        assert_eq!(
            parse(r#"{"width": 2, "tag": "img", "path": "cat.png"}"#).unwrap(),
            element_content(image)
        );
    }

    #[test]
    fn drops_the_fields_of_other_elements() {
        assert_eq!(
            parse(r#"{"tag": "span", "path": "cat.png", "content": "cat"}"#).unwrap(),
            span("cat")
        );
    }

    #[test]
    fn fails_on_a_link_without_an_href() {
        assert!(parse(r#"{"tag": "a", "content": "cat"}"#).is_err());
    }

    #[test]
    fn fails_on_an_unknown_tag() {
        assert!(parse(r#"{"tag": "blink", "content": "cat"}"#).is_err());
    }

    #[test]
    fn fails_on_an_element_without_a_tag() {
        assert!(parse(r#"{"content": "cat"}"#).is_err());
    }

    #[test]
    fn fails_on_a_number() {
        assert!(parse("3").is_err());
    }
}

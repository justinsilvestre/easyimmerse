use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::openapi::schema::{
    ArrayBuilder, ObjectBuilder, OneOfBuilder, Schema, SchemaType, Type,
};
use utoipa::openapi::{Ref, RefOr};
use utoipa::{PartialSchema, ToSchema};

use super::glossary_image::GlossaryImage;
use super::structured_content_style::{StructuredContentStyle, VerticalAlign};

/// A node of Yomitan structured content, the HTML-like markup that dictionaries use for rich definitions.
/// A node is a text node, a list of child nodes, or an element.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(untagged)]
#[ts(export)]
pub enum StructuredContent {
    Text(String),
    Children(Vec<StructuredContent>),
    Element(Box<StructuredContentElement>),
}

/// Leaves the items of a child list untyped.
/// A schema whose array contains itself becomes a TypeScript type that refers to itself,
/// which the OpenAPI type generator emits in a form TypeScript rejects.
impl PartialSchema for StructuredContent {
    fn schema() -> RefOr<Schema> {
        OneOfBuilder::new()
            .item(ObjectBuilder::new().schema_type(Type::String))
            .item(ArrayBuilder::new().items(ObjectBuilder::new().schema_type(SchemaType::AnyValue)))
            .item(StructuredContentElement::schema_reference())
            .description(Some(
                "A node of Yomitan structured content: a text node, a list of child nodes, or an HTML-like element.",
            ))
            .into()
    }
}

impl ToSchema for StructuredContent {
    fn schemas(schemas: &mut Vec<(String, RefOr<Schema>)>) {
        schemas.push((
            <StructuredContentElement as ToSchema>::name().into(),
            StructuredContentElement::schema(),
        ));
        <StructuredContentElement as ToSchema>::schemas(schemas);
    }
}

impl StructuredContentElement {
    fn schema_reference() -> Ref {
        Ref::from_schema_name(<Self as ToSchema>::name())
    }
}

/// An element of structured content, identified by its HTML tag name.
/// It renders as the HTML element of the same name.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(tag = "tag", rename_all = "lowercase")]
#[ts(export)]
pub enum StructuredContentElement {
    Br(EmptyElement),
    Ruby(ContainerElement),
    Rt(ContainerElement),
    Rp(ContainerElement),
    Table(ContainerElement),
    Thead(ContainerElement),
    Tbody(ContainerElement),
    Tfoot(ContainerElement),
    Tr(ContainerElement),
    Td(TableCellElement),
    Th(TableCellElement),
    Span(StyledElement),
    Div(StyledElement),
    Ol(StyledElement),
    Ul(StyledElement),
    Li(StyledElement),
    Details(StyledElement),
    Summary(StyledElement),
    Img(ImageElement),
    A(LinkElement),
}

/// The `data` attributes of an element.
/// Each key `k` becomes the HTML attribute `data-sc-k`, which the dictionary's stylesheet selects on.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(transparent)]
#[ts(export)]
pub struct StructuredContentData(pub BTreeMap<String, String>);

#[serde_with::skip_serializing_none]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export, optional_fields)]
pub struct EmptyElement {
    pub data: Option<StructuredContentData>,
}

#[serde_with::skip_serializing_none]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export, optional_fields)]
pub struct ContainerElement {
    #[schema(no_recursion)]
    pub content: Option<StructuredContent>,
    pub data: Option<StructuredContentData>,
    /// The language of the element, as an RFC 5646 tag.
    pub lang: Option<String>,
}

#[serde_with::skip_serializing_none]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export, optional_fields)]
pub struct TableCellElement {
    #[schema(no_recursion)]
    pub content: Option<StructuredContent>,
    pub data: Option<StructuredContentData>,
    pub col_span: Option<u32>,
    pub row_span: Option<u32>,
    pub style: Option<StructuredContentStyle>,
    pub lang: Option<String>,
}

#[serde_with::skip_serializing_none]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export, optional_fields)]
pub struct StyledElement {
    #[schema(no_recursion)]
    pub content: Option<StructuredContent>,
    pub data: Option<StructuredContentData>,
    pub style: Option<StructuredContentStyle>,
    /// Hover text.
    pub title: Option<String>,
    /// Whether a `details` element starts open.
    pub open: Option<bool>,
    pub lang: Option<String>,
}

#[serde_with::skip_serializing_none]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export, optional_fields)]
pub struct ImageElement {
    pub data: Option<StructuredContentData>,
    #[serde(flatten)]
    pub image: GlossaryImage,
    pub vertical_align: Option<VerticalAlign>,
    /// Shorthand for the border width, style, and color.
    pub border: Option<String>,
    pub border_radius: Option<String>,
    /// The units of `width` and `height`.
    pub size_units: Option<SizeUnits>,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "lowercase")]
#[ts(export)]
pub enum SizeUnits {
    Px,
    Em,
}

#[serde_with::skip_serializing_none]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export, optional_fields)]
pub struct LinkElement {
    #[schema(no_recursion)]
    pub content: Option<StructuredContent>,
    /// An `http:` or `https:` URL, or a link to a search within the dictionaries.
    /// A search link starts with `?`, as in `?query=語&wildcards=off`.
    pub href: String,
    pub lang: Option<String>,
}

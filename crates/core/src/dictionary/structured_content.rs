//! A tree of display elements drawn from a closed set of tags.
//!
//! The JSON form follows the structured content of Yomitan dictionaries, so their glossaries deserialize directly.
//! Fields outside this model are dropped on deserialization, and an unknown tag fails it.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(untagged)]
#[ts(export)]
pub enum StructuredContent {
    Text(String),
    Nodes(Vec<StructuredContent>),
    Element(Box<StructuredElement>),
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "tag", rename_all = "lowercase")]
#[ts(export)]
pub enum StructuredElement {
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
    Span(ContainerElement),
    Div(ContainerElement),
    Ol(ContainerElement),
    Ul(ContainerElement),
    Li(ContainerElement),
    Details(DetailsElement),
    Summary(ContainerElement),
    A(LinkElement),
    Img(ImageElement),
}

/// Values of the `data` attribute, which dictionaries use as hooks for their own stylesheets.
pub type ElementData = BTreeMap<String, String>;

/// CSS properties by their camel-case names. Display applies only an allowlisted subset.
pub type ElementStyle = BTreeMap<String, StyleValue>;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(untagged)]
#[ts(export)]
pub enum StyleValue {
    Number(f64),
    Text(String),
    List(Vec<String>),
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct EmptyElement {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub data: Option<ElementData>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ContainerElement {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub content: Option<StructuredContent>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub data: Option<ElementData>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub style: Option<ElementStyle>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub title: Option<String>,
    /// The language of the content, as a BCP 47 tag.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub lang: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct TableCellElement {
    #[serde(flatten)]
    pub container: ContainerElement,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub col_span: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub row_span: Option<u32>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DetailsElement {
    #[serde(flatten)]
    pub container: ContainerElement,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub open: Option<bool>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct LinkElement {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub content: Option<StructuredContent>,
    /// Either a lookup inside the app, written `?query=<term>`, or an external `http` or `https` URL.
    pub href: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub lang: Option<String>,
}

/// An image stored in the dictionary, referenced by its path within the dictionary.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ImageElement {
    pub path: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub width: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub height: Option<f64>,
    /// Whether `width` and `height` are in pixels (`px`) or in multiples of the font size (`em`).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub size_units: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub title: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub alt: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub description: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub image_rendering: Option<String>,
    /// `monochrome` asks for the image to be drawn in the current text color.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub appearance: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub background: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub collapsed: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub collapsible: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub vertical_align: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub border: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub border_radius: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub data: Option<ElementData>,
}

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

/// The inline styles a Yomitan structured-content element may carry.
/// Each field mirrors the CSS property of the same name.
#[serde_with::skip_serializing_none]
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export, optional_fields)]
pub struct StructuredContentStyle {
    pub font_style: Option<FontStyle>,
    pub font_weight: Option<FontWeight>,
    pub font_size: Option<String>,
    pub color: Option<String>,
    pub background: Option<String>,
    pub background_color: Option<String>,
    pub text_decoration_line: Option<TextDecorationLine>,
    pub text_decoration_style: Option<TextDecorationStyle>,
    pub text_decoration_color: Option<String>,
    pub border_color: Option<String>,
    pub border_style: Option<String>,
    pub border_radius: Option<String>,
    pub border_width: Option<String>,
    pub clip_path: Option<String>,
    pub vertical_align: Option<VerticalAlign>,
    pub text_align: Option<TextAlign>,
    pub text_emphasis: Option<String>,
    pub text_shadow: Option<String>,
    pub margin: Option<String>,
    pub margin_top: Option<CssLength>,
    pub margin_left: Option<CssLength>,
    pub margin_right: Option<CssLength>,
    pub margin_bottom: Option<CssLength>,
    pub padding: Option<String>,
    pub padding_top: Option<String>,
    pub padding_left: Option<String>,
    pub padding_right: Option<String>,
    pub padding_bottom: Option<String>,
    pub word_break: Option<WordBreak>,
    pub white_space: Option<String>,
    pub cursor: Option<String>,
    pub list_style_type: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "kebab-case")]
#[ts(export)]
pub enum FontStyle {
    Normal,
    Italic,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "kebab-case")]
#[ts(export)]
pub enum FontWeight {
    Normal,
    Bold,
}

/// Either one CSS `text-decoration-line` keyword or a list of them.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(untagged)]
#[ts(export)]
pub enum TextDecorationLine {
    Single(TextDecorationLineKeyword),
    Multiple(Vec<TextDecorationLineKeyword>),
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "kebab-case")]
#[ts(export)]
pub enum TextDecorationLineKeyword {
    None,
    Underline,
    Overline,
    LineThrough,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "kebab-case")]
#[ts(export)]
pub enum TextDecorationStyle {
    Solid,
    Double,
    Dotted,
    Dashed,
    Wavy,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "kebab-case")]
#[ts(export)]
pub enum VerticalAlign {
    Baseline,
    Sub,
    Super,
    TextTop,
    TextBottom,
    Middle,
    Top,
    Bottom,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "kebab-case")]
#[ts(export)]
pub enum TextAlign {
    Start,
    End,
    Left,
    Right,
    Center,
    Justify,
    JustifyAll,
    MatchParent,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "kebab-case")]
#[ts(export)]
pub enum WordBreak {
    Normal,
    BreakAll,
    KeepAll,
}

/// A CSS length given either as a number, which Yomitan reads as `em`, or as a CSS string.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(untagged)]
#[ts(export)]
pub enum CssLength {
    Number(f64),
    Text(String),
}

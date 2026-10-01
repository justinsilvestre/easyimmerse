use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

/// An image stored in the dictionary archive, with Yomitan's display hints.
///
/// `path` is the image's path inside the archive.
/// The server serves the image at `GET /dictionaries/{id}/asset?path=<path>`.
#[serde_with::skip_serializing_none]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export, optional_fields)]
pub struct GlossaryImage {
    pub path: String,
    /// The preferred width.
    /// It is in `sizeUnits` when the image is a structured-content node, and in pixels otherwise.
    pub width: Option<f64>,
    /// The preferred height, in the same units as `width`.
    pub height: Option<f64>,
    /// Hover text.
    pub title: Option<String>,
    pub alt: Option<String>,
    pub description: Option<String>,
    /// Whether the image looks pixelated when scaled up. `imageRendering` supersedes it.
    pub pixelated: Option<bool>,
    pub image_rendering: Option<ImageRendering>,
    pub appearance: Option<ImageAppearance>,
    /// Whether a background color shows behind the image. Defaults to true.
    pub background: Option<bool>,
    /// Whether the image starts collapsed.
    pub collapsed: Option<bool>,
    /// Whether the person can collapse the image.
    pub collapsible: Option<bool>,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "kebab-case")]
#[ts(export)]
pub enum ImageRendering {
    Auto,
    Pixelated,
    CrispEdges,
}

/// `monochrome` masks the opaque parts of the image with the current text color.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "kebab-case")]
#[ts(export)]
pub enum ImageAppearance {
    Auto,
    Monochrome,
}

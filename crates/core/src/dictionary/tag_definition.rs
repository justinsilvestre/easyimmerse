use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

/// The meaning of a tag that a dictionary attaches to its entries.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct TagDefinition {
    pub name: String,
    /// A grouping such as `partOfSpeech` or `frequent`, which display uses to color the tag.
    pub category: String,
    /// The position of the tag among others; lower comes first.
    pub order: i64,
    /// A longer description of the tag.
    pub notes: String,
    pub score: i64,
}

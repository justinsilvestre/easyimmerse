use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

/// Where the text of a request comes from.
///
/// The `path` variant names a file on the machine running the server. The server resolves
/// it, and only for requests authenticated with the per-launch token. The WebAssembly build
/// supports only the `inline` variant.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(tag = "kind", rename_all = "snake_case")]
#[ts(export)]
pub enum TextSource {
    Inline { text: String },
    Path { path: String },
}

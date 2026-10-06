use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

/// A particle verb whose finite verb and particle stand apart, as rufe and an in „Ich rufe dich morgen an".
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SeparatedVerb {
    pub verb: ContextWord,
    pub particle: ContextWord,
}

/// A word as written in the context of a lookup.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ContextWord {
    pub text: String,
    /// The position of the word's first character in the context, counted in characters (Unicode scalar values).
    pub start: usize,
}

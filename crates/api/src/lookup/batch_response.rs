use easyimmerse_core::lookup::{DictionaryStylesheet, KanjiResult, LookupResult};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct BatchLookupResponse {
    /// The lookups in each requested text, in the order requested.
    pub texts: Vec<TextLookups>,
    /// Every distinct term result of the lookups, each once.
    pub results: Vec<LookupResult>,
    /// Every distinct kanji result of the lookups, each once.
    pub kanji: Vec<KanjiResult>,
    /// The stylesheets of the dictionaries whose definitions appear in `results`, each once.
    pub stylesheets: Vec<DictionaryStylesheet>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct TextLookups {
    /// The positions where lookup found something, in the order they appear in the text.
    /// A position that lookup tried but found nothing at is left out.
    pub positions: Vec<PositionLookups>,
}

/// What a single lookup at one position of a text would return,
/// with each result given as its index in the batch response's lists.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PositionLookups {
    /// The position of the looked-up character in the text, counted in characters (Unicode scalar values).
    pub offset: u32,
    /// Indices into the response's `results`, best first.
    pub results: Vec<u32>,
    /// Indices into the response's `kanji`.
    pub kanji: Vec<u32>,
}

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use super::term_meta::Frequency;

/// A single kanji character with its readings and meanings.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct KanjiEntry {
    pub character: String,
    /// Readings borrowed from Chinese, written in katakana.
    pub onyomi: Vec<String>,
    /// Native Japanese readings, written in hiragana.
    pub kunyomi: Vec<String>,
    pub tags: Vec<String>,
    pub meanings: Vec<String>,
    /// Facts such as stroke count or grade, keyed by the name of the tag that labels them.
    pub stats: BTreeMap<String, String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct KanjiMeta {
    pub character: String,
    pub frequency: Frequency,
}

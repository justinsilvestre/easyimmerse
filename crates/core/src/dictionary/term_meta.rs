use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

/// Information about a term that is not a definition, such as how common it is or how it is pronounced.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct TermMeta {
    pub term: String,
    /// The reading the information applies to; `None` means every reading of the term.
    pub reading: Option<String>,
    pub data: TermMetaData,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(tag = "kind", rename_all = "camelCase")]
#[ts(export)]
pub enum TermMetaData {
    Frequency(Frequency),
    Pitch {
        pitches: Vec<PitchAccent>,
    },
    Ipa {
        transcriptions: Vec<IpaTranscription>,
    },
}

/// How common a term is. The dictionary's `FrequencyMode` says whether higher values mean more or less common.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Frequency {
    /// The number to sort by, if the dictionary gives one.
    pub value: Option<f64>,
    /// The text to show in place of the value, if the dictionary gives one.
    pub display: Option<String>,
}

/// The pitch accent of one reading of a Japanese term.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PitchAccent {
    pub position: PitchPosition,
    /// Mora positions, counted from 1, that are pronounced nasally.
    pub nasal: Vec<u32>,
    /// Mora positions, counted from 1, that are devoiced.
    pub devoice: Vec<u32>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(untagged)]
#[ts(export)]
pub enum PitchPosition {
    /// The mora after which the pitch drops, counted from 1; 0 means the pitch never drops.
    Downstep(u32),
    /// One letter per mora, `H` for high and `L` for low, optionally followed by one letter for a following particle.
    Pattern(String),
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct IpaTranscription {
    pub ipa: String,
    pub tags: Vec<String>,
}

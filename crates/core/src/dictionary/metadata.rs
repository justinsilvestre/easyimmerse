use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

/// What a dictionary says about itself, read from its index or header.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DictionaryMetadata {
    pub title: String,
    pub revision: Option<String>,
    pub format: DictionaryFormatKind,
    pub description: Option<String>,
    pub author: Option<String>,
    /// The credit that the dictionary's licence asks users of its content to show.
    pub attribution: Option<String>,
    pub url: Option<String>,
    /// The language of the headwords, as a BCP 47 tag.
    pub source_language: Option<String>,
    /// The language of the definitions, as a BCP 47 tag.
    pub target_language: Option<String>,
    pub frequency_mode: Option<FrequencyMode>,
    /// The CSS that the dictionary ships for its own content, unsanitized.
    pub stylesheet: Option<String>,
}

impl DictionaryMetadata {
    /// Creates metadata with only a title and a format.
    pub fn new(title: impl Into<String>, format: DictionaryFormatKind) -> Self {
        Self {
            title: title.into(),
            revision: None,
            format,
            description: None,
            author: None,
            attribution: None,
            url: None,
            source_language: None,
            target_language: None,
            frequency_mode: None,
            stylesheet: None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "lowercase")]
#[ts(export)]
pub enum DictionaryFormatKind {
    Yomitan,
    Stardict,
    Mdict,
    Csv,
}

impl DictionaryFormatKind {
    /// Reports whether entries of this format can carry word classes.
    /// Lookup uses this to decide whether an entry without word classes may match a deinflected form.
    pub fn has_word_classes(self) -> bool {
        matches!(self, Self::Yomitan)
    }
}

/// How the numbers in a frequency dictionary are to be read.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "kebab-case")]
#[ts(export)]
pub enum FrequencyMode {
    /// Higher numbers mean more common words.
    OccurrenceBased,
    /// Lower numbers mean more common words.
    RankBased,
}

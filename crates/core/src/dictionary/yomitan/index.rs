//! The `index.json` file, which describes the dictionary.

use std::collections::BTreeMap;

use serde::Deserialize;

use super::super::metadata::{DictionaryFormatKind, DictionaryMetadata, FrequencyMode};
use super::super::tag_definition::TagDefinition;
use super::error::YomitanError;
use super::row_layout::RowLayout;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Index {
    title: String,
    revision: Option<String>,
    format: Option<u32>,
    /// Older dictionaries state the format version under this key instead of `format`.
    version: Option<u32>,
    description: Option<String>,
    author: Option<String>,
    attribution: Option<String>,
    url: Option<String>,
    source_language: Option<String>,
    target_language: Option<String>,
    frequency_mode: Option<FrequencyMode>,
    /// Tag definitions keyed by name, which older dictionaries give here instead of in tag banks.
    #[serde(default)]
    tag_meta: BTreeMap<String, TagMeta>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(default)]
struct TagMeta {
    category: String,
    order: f64,
    notes: String,
    score: f64,
}

impl Index {
    /// Returns the row layout that the format version calls for.
    pub fn row_layout(&self) -> Result<RowLayout, YomitanError> {
        match self.format.or(self.version) {
            Some(1) => Ok(RowLayout::Original),
            Some(2 | 3) => Ok(RowLayout::Current),
            Some(other) => Err(YomitanError::UnsupportedVersion(other)),
            None => Err(YomitanError::MissingVersion),
        }
    }

    /// Takes the tag definitions out of the index.
    pub fn take_tags(&mut self) -> Vec<TagDefinition> {
        std::mem::take(&mut self.tag_meta)
            .into_iter()
            .map(|(name, meta)| meta.into_definition(name))
            .collect()
    }

    pub fn into_metadata(self, stylesheet: Option<String>) -> DictionaryMetadata {
        let mut metadata = DictionaryMetadata::new(self.title, DictionaryFormatKind::Yomitan);
        metadata.revision = self.revision;
        metadata.description = self.description;
        metadata.author = self.author;
        metadata.attribution = self.attribution;
        metadata.url = self.url;
        metadata.source_language = self.source_language;
        metadata.target_language = self.target_language;
        metadata.frequency_mode = self.frequency_mode;
        metadata.stylesheet = stylesheet;
        metadata
    }
}

impl TagMeta {
    fn into_definition(self, name: String) -> TagDefinition {
        TagDefinition {
            name,
            category: self.category,
            order: self.order as i64,
            notes: self.notes,
            score: self.score as i64,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn index(fields: serde_json::Value) -> Index {
        let mut index = json!({"title": "Sample", "format": 3});
        index
            .as_object_mut()
            .unwrap()
            .extend(fields.as_object().unwrap().clone());
        Index::deserialize(index).unwrap()
    }

    fn metadata(fields: serde_json::Value) -> DictionaryMetadata {
        index(fields).into_metadata(None)
    }

    #[test]
    fn reads_the_title() {
        assert_eq!(metadata(json!({})).title, "Sample");
    }

    #[test]
    fn reads_the_revision() {
        assert_eq!(
            metadata(json!({"revision": "r1"})).revision.as_deref(),
            Some("r1")
        );
    }

    #[test]
    fn reads_the_attribution() {
        let fields = json!({"attribution": "CC BY-SA"});
        assert_eq!(metadata(fields).attribution.as_deref(), Some("CC BY-SA"));
    }

    #[test]
    fn reads_the_source_language() {
        let fields = json!({"sourceLanguage": "ja"});
        assert_eq!(metadata(fields).source_language.as_deref(), Some("ja"));
    }

    #[test]
    fn reads_the_target_language() {
        let fields = json!({"targetLanguage": "en"});
        assert_eq!(metadata(fields).target_language.as_deref(), Some("en"));
    }

    #[test]
    fn reads_the_frequency_mode() {
        let fields = json!({"frequencyMode": "rank-based"});
        assert_eq!(
            metadata(fields).frequency_mode,
            Some(FrequencyMode::RankBased)
        );
    }

    #[test]
    fn keeps_the_stylesheet() {
        let stylesheet = index(json!({}))
            .into_metadata(Some("a {}".into()))
            .stylesheet;
        assert_eq!(stylesheet.as_deref(), Some("a {}"));
    }

    #[test]
    fn uses_the_original_layout_for_format_1() {
        let layout = index(json!({"format": 1})).row_layout().unwrap();
        assert_eq!(layout, RowLayout::Original);
    }

    #[test]
    fn uses_the_current_layout_for_format_2() {
        let layout = index(json!({"format": 2})).row_layout().unwrap();
        assert_eq!(layout, RowLayout::Current);
    }

    #[test]
    fn reads_the_older_version_key() {
        let index = Index::deserialize(json!({"title": "Sample", "version": 1})).unwrap();
        assert_eq!(index.row_layout().unwrap(), RowLayout::Original);
    }

    #[test]
    fn rejects_an_unknown_version() {
        assert!(matches!(
            index(json!({"format": 4})).row_layout(),
            Err(YomitanError::UnsupportedVersion(4))
        ));
    }

    #[test]
    fn rejects_a_missing_version() {
        let index = Index::deserialize(json!({"title": "Sample"})).unwrap();
        assert!(matches!(
            index.row_layout(),
            Err(YomitanError::MissingVersion)
        ));
    }

    #[test]
    fn reads_tag_definitions_from_tag_meta() {
        let fields = json!({"tagMeta": {"P": {"category": "popular", "order": -10, "notes": "common", "score": 10}}});
        assert_eq!(
            index(fields).take_tags(),
            vec![TagDefinition {
                name: "P".into(),
                category: "popular".into(),
                order: -10,
                notes: "common".into(),
                score: 10,
            }]
        );
    }
}

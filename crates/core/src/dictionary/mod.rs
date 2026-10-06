//! Dictionary formats and import.
//!
//! A format reads a `DictionarySource` and passes what it finds to a `DictionarySink` one item at a time.
//! Storage implements the sink to write straight to its database; `parse_dictionary` collects everything in memory instead.

mod archive;
mod archive_compression;
mod csv;
mod dictionary_media;
mod error;
mod format;
mod kanji_entry;
mod mdict;
#[cfg(test)]
mod media_collector;
mod metadata;
mod sink;
mod source;
mod stardict;
mod structured_content;
mod structured_content_deserialization;
mod tag_definition;
mod term_entry;
mod term_meta;
mod yomitan;

pub use archive::ArchiveError;
pub use csv::{
    ColumnRole, CsvError, CsvFormat, TableLayout, TablePreview, preview_table, preview_table_in,
};
pub use dictionary_media::{DictionaryMedia, media_key};
pub use error::DictionaryError;
pub use format::DictionaryFormat;
pub use kanji_entry::{KanjiEntry, KanjiMeta};
pub use mdict::{MdictError, MdictFormat};
pub use metadata::{DictionaryFormatKind, DictionaryMetadata, FrequencyMode};
pub use sink::{DictionarySink, SinkError, SinkResult};
pub use source::{DictionarySource, SourceFile, file_name};
pub use stardict::{StardictError, StardictFormat};
pub use structured_content::{
    ContainerElement, DetailsElement, ElementData, ElementStyle, EmptyElement, ImageElement,
    LinkElement, StructuredContent, StructuredElement, StyleValue, TableCellElement,
};
pub use tag_definition::TagDefinition;
pub use term_entry::{Definition, MarkupDialect, TermEntry};
pub use term_meta::{
    Frequency, IpaTranscription, PitchAccent, PitchPosition, TermMeta, TermMetaData,
};
pub use yomitan::{YomitanError, YomitanFormat};

use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Reads a dictionary into the sink with the first registered format that recognizes the source.
pub fn import_dictionary(
    source: &mut DictionarySource,
    sink: &mut dyn DictionarySink,
) -> Result<DictionaryFormatKind, DictionaryError> {
    let format = registered_formats()
        .into_iter()
        .find(|format| format.matches(source))
        .ok_or(DictionaryError::UnrecognizedFormat)?;
    format.import(source, sink)?;
    Ok(format.kind())
}

/// Reads a whole dictionary into memory. Media files are left out.
pub fn parse_dictionary(source: &mut DictionarySource) -> Result<Dictionary, DictionaryError> {
    let mut collector = DictionaryCollector::default();
    import_dictionary(source, &mut collector)?;
    collector
        .dictionary
        .ok_or(DictionaryError::UnrecognizedFormat)
}

fn registered_formats() -> Vec<Box<dyn DictionaryFormat>> {
    vec![
        Box::new(YomitanFormat),
        Box::new(StardictFormat),
        Box::new(MdictFormat),
        Box::new(CsvFormat),
    ]
}

/// The whole contents of a dictionary, apart from its media files.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Dictionary {
    pub metadata: DictionaryMetadata,
    pub entries: Vec<TermEntry>,
    pub term_meta: Vec<TermMeta>,
    pub tags: Vec<TagDefinition>,
    pub kanji_entries: Vec<KanjiEntry>,
    pub kanji_meta: Vec<KanjiMeta>,
}

#[derive(Default)]
struct DictionaryCollector {
    dictionary: Option<Dictionary>,
    /// The positions of the entries under each term, for adding alternates.
    entry_positions_by_term: HashMap<String, Vec<usize>>,
}

impl DictionaryCollector {
    fn dictionary(&mut self) -> Result<&mut Dictionary, SinkError> {
        self.dictionary
            .as_mut()
            .ok_or_else(|| SinkError("the format sent content before calling begin".into()))
    }
}

impl DictionarySink for DictionaryCollector {
    fn begin(&mut self, metadata: DictionaryMetadata) -> SinkResult {
        self.dictionary = Some(Dictionary {
            metadata,
            entries: Vec::new(),
            term_meta: Vec::new(),
            tags: Vec::new(),
            kanji_entries: Vec::new(),
            kanji_meta: Vec::new(),
        });
        Ok(())
    }

    fn term_entry(&mut self, entry: TermEntry) -> SinkResult {
        let entries = &mut self.dictionary()?.entries;
        let position = entries.len();
        let term = entry.term.clone();
        entries.push(entry);
        self.entry_positions_by_term
            .entry(term)
            .or_default()
            .push(position);
        Ok(())
    }

    fn term_alternates(&mut self, term: String, alternates: Vec<String>) -> SinkResult {
        let positions = self
            .entry_positions_by_term
            .get(&term)
            .cloned()
            .unwrap_or_default();
        let entries = &mut self.dictionary()?.entries;
        for position in positions {
            entries[position].add_alternates(alternates.iter().cloned());
        }
        Ok(())
    }

    fn term_meta(&mut self, meta: TermMeta) -> SinkResult {
        self.dictionary()?.term_meta.push(meta);
        Ok(())
    }

    fn tag(&mut self, tag: TagDefinition) -> SinkResult {
        self.dictionary()?.tags.push(tag);
        Ok(())
    }

    fn kanji_entry(&mut self, entry: KanjiEntry) -> SinkResult {
        self.dictionary()?.kanji_entries.push(entry);
        Ok(())
    }

    fn kanji_meta(&mut self, meta: KanjiMeta) -> SinkResult {
        self.dictionary()?.kanji_meta.push(meta);
        Ok(())
    }

    fn media(&mut self, _media: DictionaryMedia) -> SinkResult {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::read_fixture_bytes;

    fn fixture_source(name: &str) -> DictionarySource {
        DictionarySource::single(name, read_fixture_bytes(name)).expect("fixture should open")
    }

    #[test]
    fn parses_the_yomitan_fixture() {
        let dictionary = parse_dictionary(&mut fixture_source("sample-yomitan.zip")).unwrap();
        assert_eq!(dictionary.metadata.format, DictionaryFormatKind::Yomitan);
    }

    #[test]
    fn rejects_an_archive_no_format_recognizes() {
        assert!(matches!(
            parse_dictionary(&mut fixture_source("sample.epub")),
            Err(DictionaryError::UnrecognizedFormat)
        ));
    }

    #[test]
    fn rejects_a_corrupt_zip_archive() {
        let bytes = b"PK\x03\x04 truncated".to_vec();
        assert!(matches!(
            DictionarySource::single("broken.zip", bytes),
            Err(DictionaryError::Archive(_))
        ));
    }
}

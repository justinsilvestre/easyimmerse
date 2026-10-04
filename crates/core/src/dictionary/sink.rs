use std::error::Error;
use std::fmt;

use super::dictionary_media::DictionaryMedia;
use super::kanji_entry::{KanjiEntry, KanjiMeta};
use super::metadata::DictionaryMetadata;
use super::tag_definition::TagDefinition;
use super::term_entry::TermEntry;
use super::term_meta::TermMeta;

/// Receives the contents of a dictionary one item at a time as a format reads them,
/// so that a large dictionary never has to be held in memory whole.
///
/// A format calls `begin` once, before anything else.
pub trait DictionarySink {
    fn begin(&mut self, metadata: DictionaryMetadata) -> SinkResult;
    fn term_entry(&mut self, entry: TermEntry) -> SinkResult;
    fn term_meta(&mut self, meta: TermMeta) -> SinkResult;
    fn tag(&mut self, tag: TagDefinition) -> SinkResult;
    fn kanji_entry(&mut self, entry: KanjiEntry) -> SinkResult;
    fn kanji_meta(&mut self, meta: KanjiMeta) -> SinkResult;
    fn media(&mut self, media: DictionaryMedia) -> SinkResult;
}

pub type SinkResult = Result<(), SinkError>;

/// A failure of the sink, such as a database error, passed back through the format that called it.
#[derive(Debug)]
pub struct SinkError(pub Box<dyn Error + Send + Sync>);

impl fmt::Display for SinkError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(formatter)
    }
}

impl Error for SinkError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        Some(self.0.as_ref())
    }
}

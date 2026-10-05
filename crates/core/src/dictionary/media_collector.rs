use super::{
    DictionaryMedia, DictionaryMetadata, DictionarySink, KanjiEntry, KanjiMeta, SinkResult,
    TagDefinition, TermEntry, TermMeta,
};

/// A sink for tests that keeps only the media it receives.
#[derive(Default)]
pub struct MediaCollector {
    pub media: Vec<DictionaryMedia>,
}

impl MediaCollector {
    /// Lists the path and media type of each file received.
    pub fn described(&self) -> Vec<(String, String)> {
        self.media
            .iter()
            .map(|media| (media.path.clone(), media.media_type.clone()))
            .collect()
    }
}

impl DictionarySink for MediaCollector {
    fn begin(&mut self, _: DictionaryMetadata) -> SinkResult {
        Ok(())
    }

    fn term_entry(&mut self, _: TermEntry) -> SinkResult {
        Ok(())
    }

    fn term_alternates(&mut self, _: String, _: Vec<String>) -> SinkResult {
        Ok(())
    }

    fn term_meta(&mut self, _: TermMeta) -> SinkResult {
        Ok(())
    }

    fn tag(&mut self, _: TagDefinition) -> SinkResult {
        Ok(())
    }

    fn kanji_entry(&mut self, _: KanjiEntry) -> SinkResult {
        Ok(())
    }

    fn kanji_meta(&mut self, _: KanjiMeta) -> SinkResult {
        Ok(())
    }

    fn media(&mut self, media: DictionaryMedia) -> SinkResult {
        self.media.push(media);
        Ok(())
    }
}

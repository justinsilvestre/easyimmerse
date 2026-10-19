use easyimmerse_core::dictionary::{
    DictionaryMedia, DictionaryMetadata, DictionarySink, KanjiEntry, KanjiMeta, SinkResult,
    TagDefinition, TermEntry, TermMeta,
};

use crate::import_jobs::{SharedProgress, lock};
use crate::routes::dictionary_imports::ImportProgress;

/// Passes everything to the sink it wraps and counts each item the sink accepted,
/// so that a client can watch an import advance.
pub struct ImportProgressSink<'a> {
    inner: &'a mut dyn DictionarySink,
    progress: SharedProgress,
}

impl<'a> ImportProgressSink<'a> {
    pub fn new(inner: &'a mut dyn DictionarySink, progress: SharedProgress) -> Self {
        Self { inner, progress }
    }

    fn count(
        &self,
        result: SinkResult,
        counter: fn(&mut ImportProgress) -> &mut u64,
    ) -> SinkResult {
        result?;
        *counter(&mut lock(&self.progress)) += 1;
        Ok(())
    }
}

impl DictionarySink for ImportProgressSink<'_> {
    fn begin(&mut self, metadata: DictionaryMetadata) -> SinkResult {
        self.inner.begin(metadata)
    }

    fn term_entry(&mut self, entry: TermEntry) -> SinkResult {
        let result = self.inner.term_entry(entry);
        self.count(result, |progress| &mut progress.entries)
    }

    fn term_alternates(&mut self, term: String, alternates: Vec<String>) -> SinkResult {
        self.inner.term_alternates(term, alternates)
    }

    fn term_meta(&mut self, meta: TermMeta) -> SinkResult {
        let result = self.inner.term_meta(meta);
        self.count(result, |progress| &mut progress.term_meta)
    }

    fn tag(&mut self, tag: TagDefinition) -> SinkResult {
        let result = self.inner.tag(tag);
        self.count(result, |progress| &mut progress.tags)
    }

    fn kanji_entry(&mut self, entry: KanjiEntry) -> SinkResult {
        let result = self.inner.kanji_entry(entry);
        self.count(result, |progress| &mut progress.kanji)
    }

    fn kanji_meta(&mut self, meta: KanjiMeta) -> SinkResult {
        let result = self.inner.kanji_meta(meta);
        self.count(result, |progress| &mut progress.kanji_meta)
    }

    fn media(&mut self, media: DictionaryMedia) -> SinkResult {
        let result = self.inner.media(media);
        self.count(result, |progress| &mut progress.media)
    }

    fn progressed(&mut self, done: u64, total: u64) {
        self.inner.progressed(done, total);
        if let Some(percent) = done.saturating_mul(100).checked_div(total) {
            lock(&self.progress).percent = Some(percent.min(100) as u8);
        }
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use easyimmerse_core::dictionary::{DictionaryFormatKind, SinkError};

    use super::*;

    /// Accepts everything, or refuses everything when built with `accepts: false`.
    struct FixedSink {
        accepts: bool,
    }

    impl FixedSink {
        fn answer(&self) -> SinkResult {
            if self.accepts {
                Ok(())
            } else {
                Err(SinkError("refused".into()))
            }
        }
    }

    impl DictionarySink for FixedSink {
        fn begin(&mut self, _: DictionaryMetadata) -> SinkResult {
            self.answer()
        }
        fn term_entry(&mut self, _: TermEntry) -> SinkResult {
            self.answer()
        }
        fn term_alternates(&mut self, _: String, _: Vec<String>) -> SinkResult {
            self.answer()
        }
        fn term_meta(&mut self, _: TermMeta) -> SinkResult {
            self.answer()
        }
        fn tag(&mut self, _: TagDefinition) -> SinkResult {
            self.answer()
        }
        fn kanji_entry(&mut self, _: KanjiEntry) -> SinkResult {
            self.answer()
        }
        fn kanji_meta(&mut self, _: KanjiMeta) -> SinkResult {
            self.answer()
        }
        fn media(&mut self, _: DictionaryMedia) -> SinkResult {
            self.answer()
        }
    }

    fn entries_counted_by(accepts: bool) -> u64 {
        let progress = SharedProgress::default();
        let mut inner = FixedSink { accepts };
        let mut sink = ImportProgressSink::new(&mut inner, Arc::clone(&progress));
        let _ = sink.begin(DictionaryMetadata::new("Words", DictionaryFormatKind::Csv));
        let _ = sink.term_entry(TermEntry::new("Hund", Vec::new()));
        let _ = sink.term_entry(TermEntry::new("Katze", Vec::new()));
        lock(&progress).entries
    }

    fn percent_after(done: u64, total: u64) -> Option<u8> {
        let progress = SharedProgress::default();
        let mut inner = FixedSink { accepts: true };
        ImportProgressSink::new(&mut inner, Arc::clone(&progress)).progressed(done, total);
        lock(&progress).percent
    }

    #[test]
    fn gives_the_share_read_as_a_percentage() {
        assert_eq!(percent_after(1, 3), Some(33));
    }

    #[test]
    fn gives_no_percentage_for_an_empty_total() {
        assert_eq!(percent_after(0, 0), None);
    }

    #[test]
    fn counts_each_entry_the_sink_accepted() {
        assert_eq!(entries_counted_by(true), 2);
    }

    #[test]
    fn leaves_out_an_entry_the_sink_refused() {
        assert_eq!(entries_counted_by(false), 0);
    }
}

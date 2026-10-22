//! One import of a Yomitan dictionary, which reports how much of its banks and media it has read.

use super::super::error::DictionaryError;
use super::super::sink::DictionarySink;
use super::super::source::DictionarySource;

/// The source being read, the sink being written to, and how far the import has read.
pub struct YomitanImport<'a> {
    pub source: &'a mut DictionarySource,
    pub sink: &'a mut dyn DictionarySink,
    pub progress: ReadProgress,
}

/// How many bytes of the banks and media files have been read, out of their total uncompressed size.
pub struct ReadProgress {
    read: u64,
    total: u64,
}

impl ReadProgress {
    /// Tells the sink how much has been read, counting the bytes read so far of the file being read.
    pub fn report_within_file(&self, sink: &mut dyn DictionarySink, bytes_into_file: u64) {
        sink.progressed(self.read + bytes_into_file, self.total);
    }
}

impl<'a> YomitanImport<'a> {
    /// Starts an import whose progress is measured against the named files.
    pub fn new(
        source: &'a mut DictionarySource,
        sink: &'a mut dyn DictionarySink,
        names: &[String],
    ) -> Result<Self, DictionaryError> {
        let mut total = 0;
        for name in names {
            total += source.size(name)?;
        }
        Ok(Self {
            source,
            sink,
            progress: ReadProgress { read: 0, total },
        })
    }

    /// Counts a file as read and tells the sink how much has been read so far.
    pub fn file_read(&mut self, name: &str) -> Result<(), DictionaryError> {
        self.progress.read += self.source.size(name)?;
        self.progress.report_within_file(self.sink, 0);
        Ok(())
    }
}

//! One import of a Yomitan dictionary, which reports how much of its banks and media it has read.

use super::super::error::DictionaryError;
use super::super::sink::DictionarySink;
use super::super::source::DictionarySource;

/// The source being read, the sink being written to, and how many bytes of the banks and media files have been read
/// out of their total uncompressed size.
pub struct YomitanImport<'a> {
    pub source: &'a mut DictionarySource,
    pub sink: &'a mut dyn DictionarySink,
    read: u64,
    total: u64,
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
            read: 0,
            total,
        })
    }

    /// Counts a file as read and tells the sink how much has been read so far.
    pub fn file_read(&mut self, name: &str) -> Result<(), DictionaryError> {
        self.read += self.source.size(name)?;
        self.sink.progressed(self.read, self.total);
        Ok(())
    }
}

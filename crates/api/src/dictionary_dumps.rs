//! Dictionaries written as NDJSON dumps, one `DictionaryDumpLine` per line, and read back into an import.
//! A remote serves and receives them, and a built-in server sends and fetches them while syncing.

use std::io::{self, BufRead, Read};
use std::sync::Arc;

use easyimmerse_core::dictionary::{
    DictionaryDumpLine, DictionaryError, DictionaryMetadata, DictionarySink, DumpLineCollector,
    SinkError,
};
use easyimmerse_storage::{DictionaryDump, DictionaryId, OwnerId, Storage, StorageError};

/// The longest line a dump may hold, which bounds the memory one media file takes while it is read.
const MAX_LINE_BYTES: u64 = 64 * 1024 * 1024;

/// Writes a stored dictionary as NDJSON, one page of rows at a time.
pub struct DumpChunks {
    storage: Arc<Storage>,
    dump: DictionaryDump,
    stage: Stage,
}

enum Stage {
    Begin,
    Content,
    End,
    Done,
}

impl DumpChunks {
    /// Begins the dump of a dictionary of the owner; another owner's dictionary is not found.
    pub fn start(
        storage: Arc<Storage>,
        owner: &OwnerId,
        id: &DictionaryId,
    ) -> Result<Self, StorageError> {
        let dump = storage.start_dictionary_dump(owner, id)?;
        Ok(Self {
            storage,
            dump,
            stage: Stage::Begin,
        })
    }

    /// The next lines of the dump, or None once its last line has been given.
    pub fn next_chunk(&mut self) -> Result<Option<Vec<u8>>, StorageError> {
        let lines = match self.stage {
            Stage::Begin => {
                self.stage = Stage::Content;
                vec![DictionaryDumpLine::Begin {
                    metadata: self.dump.metadata.clone(),
                    imported_at: self.dump.imported_at,
                }]
            }
            Stage::Content => {
                let mut collector = DumpLineCollector::default();
                let has_more = self
                    .storage
                    .continue_dictionary_dump(&mut self.dump, &mut collector)?;
                if !has_more {
                    self.stage = Stage::End;
                }
                collector.lines
            }
            Stage::End => {
                self.stage = Stage::Done;
                vec![DictionaryDumpLine::End]
            }
            Stage::Done => return Ok(None),
        };
        let mut chunk = Vec::new();
        for line in lines {
            serde_json::to_writer(&mut chunk, &line)?;
            chunk.push(b'\n');
        }
        Ok(Some(chunk))
    }
}

/// Reads a dump as a byte stream, as an upload body needs it.
pub struct DumpReader {
    chunks: DumpChunks,
    chunk: Vec<u8>,
    position: usize,
}

impl DumpReader {
    pub fn new(chunks: DumpChunks) -> Self {
        Self {
            chunks,
            chunk: Vec::new(),
            position: 0,
        }
    }
}

impl Read for DumpReader {
    fn read(&mut self, buffer: &mut [u8]) -> io::Result<usize> {
        while self.position == self.chunk.len() {
            match self.chunks.next_chunk().map_err(io::Error::other)? {
                Some(chunk) => {
                    self.chunk = chunk;
                    self.position = 0;
                }
                None => return Ok(0),
            }
        }
        let count = buffer.len().min(self.chunk.len() - self.position);
        buffer[..count].copy_from_slice(&self.chunk[self.position..self.position + count]);
        self.position += count;
        Ok(count)
    }
}

/// Why a dump could not be imported.
#[derive(Debug)]
pub enum DumpImportError {
    /// The dump is not a whole, well-formed dump; the message says why.
    BadDump(String),
    Storage(StorageError),
}

/// Feeds the lines of a dump to an import, after its first line has told the dictionary's metadata and import time.
pub struct DumpFeed<R> {
    reader: R,
    metadata: Option<DictionaryMetadata>,
    pub imported_at: u64,
    bad_dump: Option<String>,
}

impl<R: BufRead> DumpFeed<R> {
    /// Reads the `Begin` line that opens every dump.
    pub fn open(mut reader: R) -> Result<Self, DumpImportError> {
        match next_line(&mut reader).map_err(DumpImportError::BadDump)? {
            Some(DictionaryDumpLine::Begin {
                metadata,
                imported_at,
            }) => Ok(Self {
                reader,
                metadata: Some(metadata),
                imported_at,
                bad_dump: None,
            }),
            _ => Err(DumpImportError::BadDump(
                "a dump begins with its metadata".to_string(),
            )),
        }
    }

    /// Passes the metadata and every content line to the sink, up to the `End` line.
    pub fn feed(&mut self, sink: &mut dyn DictionarySink) -> Result<(), DictionaryError> {
        if let Some(metadata) = self.metadata.take() {
            sink.begin(metadata)?;
        }
        loop {
            let line = match next_line(&mut self.reader) {
                Ok(Some(line)) => line,
                Ok(None) => return Err(self.refuse("the dump ends before its last line")),
                Err(message) => return Err(self.refuse(&message)),
            };
            match line {
                DictionaryDumpLine::End => return Ok(()),
                DictionaryDumpLine::Begin { .. } => {
                    return Err(self.refuse("a dump holds one dictionary"));
                }
                content => content.feed(sink)?,
            }
        }
    }

    /// Tells what an import that read this feed came to, naming a malformed dump as such.
    pub fn finish<T>(self, stored: Result<T, StorageError>) -> Result<T, DumpImportError> {
        match (stored, self.bad_dump) {
            (Ok(value), _) => Ok(value),
            (Err(_), Some(message)) => Err(DumpImportError::BadDump(message)),
            (Err(error), None) => Err(DumpImportError::Storage(error)),
        }
    }

    fn refuse(&mut self, message: &str) -> DictionaryError {
        self.bad_dump = Some(message.to_string());
        DictionaryError::Sink(SinkError(message.to_string().into()))
    }
}

/// Reads the next non-empty line as a dump line; None at the end of the input.
fn next_line(reader: &mut impl BufRead) -> Result<Option<DictionaryDumpLine>, String> {
    let mut bytes = Vec::new();
    loop {
        bytes.clear();
        let read = reader
            .by_ref()
            .take(MAX_LINE_BYTES + 1)
            .read_until(b'\n', &mut bytes)
            .map_err(|error| format!("the dump could not be read: {error}"))?;
        if read == 0 {
            return Ok(None);
        }
        if bytes.len() as u64 > MAX_LINE_BYTES {
            return Err("a line of the dump is longer than 64 MiB".to_string());
        }
        if bytes.iter().all(u8::is_ascii_whitespace) {
            continue;
        }
        return serde_json::from_slice(&bytes)
            .map(Some)
            .map_err(|error| format!("a line of the dump is malformed: {error}"));
    }
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::dictionary::{DictionaryFormatKind, TermEntry};

    use super::*;

    fn dump_of(lines: &[DictionaryDumpLine]) -> Vec<u8> {
        let mut bytes = Vec::new();
        for line in lines {
            serde_json::to_writer(&mut bytes, line).unwrap();
            bytes.push(b'\n');
        }
        bytes
    }

    fn begin() -> DictionaryDumpLine {
        DictionaryDumpLine::Begin {
            metadata: DictionaryMetadata::new("Sample", DictionaryFormatKind::Yomitan),
            imported_at: 7,
        }
    }

    fn entry() -> DictionaryDumpLine {
        DictionaryDumpLine::TermEntry {
            entry: TermEntry::new("Hund", Vec::new()),
        }
    }

    fn fed(bytes: &[u8]) -> (Result<(), DictionaryError>, DumpLineCollector) {
        let mut feed = DumpFeed::open(bytes).ok().unwrap();
        let mut collector = DumpLineCollector::default();
        (feed.feed(&mut collector), collector)
    }

    #[test]
    fn reads_the_import_time_from_the_first_line() {
        let bytes = dump_of(&[begin(), DictionaryDumpLine::End]);
        assert_eq!(DumpFeed::open(&bytes[..]).ok().unwrap().imported_at, 7);
    }

    #[test]
    fn refuses_a_dump_that_does_not_begin_with_metadata() {
        let bytes = dump_of(&[entry()]);
        assert!(matches!(
            DumpFeed::open(&bytes[..]),
            Err(DumpImportError::BadDump(_))
        ));
    }

    #[test]
    fn feeds_the_content_lines() {
        let bytes = dump_of(&[begin(), entry(), DictionaryDumpLine::End]);
        assert_eq!(fed(&bytes).1.lines, vec![entry()]);
    }

    #[test]
    fn refuses_a_dump_cut_short() {
        let bytes = dump_of(&[begin(), entry()]);
        assert!(fed(&bytes).0.is_err());
    }

    #[test]
    fn names_a_dump_cut_short_as_a_bad_dump() {
        let bytes = dump_of(&[begin(), entry()]);
        let mut feed = DumpFeed::open(&bytes[..]).ok().unwrap();
        let result = feed
            .feed(&mut DumpLineCollector::default())
            .map_err(StorageError::from);
        assert!(matches!(
            feed.finish(result),
            Err(DumpImportError::BadDump(_))
        ));
    }

    #[test]
    fn skips_empty_lines() {
        let mut bytes = dump_of(&[begin()]);
        bytes.extend_from_slice(b"\n\n");
        bytes.extend(dump_of(&[entry(), DictionaryDumpLine::End]));
        assert_eq!(fed(&bytes).1.lines, vec![entry()]);
    }
}

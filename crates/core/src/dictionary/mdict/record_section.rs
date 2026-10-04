use std::io::Read;

use super::block::{BlockSize, decode_block};
use super::byte_cursor::{ByteCursor, read_stream_bytes};
use super::error::MdictError;
use super::header::FormatVersion;

/// Reads records from the record section in order, decompressing one block at a time.
///
/// Records are addressed by offsets into the concatenation of all decompressed blocks.
/// Only the blocks that hold the current record are kept in memory.
pub struct RecordReader<R> {
    reader: R,
    block_sizes: std::vec::IntoIter<BlockSize>,
    total_size: u64,
    buffer: Vec<u8>,
    buffer_start: u64,
}

impl<R: Read> RecordReader<R> {
    /// Reads the record summary and block index that follow the key section.
    pub fn open(mut reader: R, version: FormatVersion) -> Result<Self, MdictError> {
        let width = version.number_width();
        let summary = read_stream_bytes(&mut reader, (width * 4) as u64, "record summary")?;
        let mut cursor = ByteCursor::new(&summary, "record summary");
        let block_count = cursor.read_size(width)?;
        cursor.read_number(width)?;
        let index_size = cursor.read_number(width)?;
        let index = read_stream_bytes(&mut reader, index_size, "record block index")?;
        let block_sizes = parse_block_index(&index, block_count, width)?;
        Ok(Self {
            reader,
            total_size: block_sizes.iter().map(|size| size.decompressed).sum(),
            block_sizes: block_sizes.into_iter(),
            buffer: Vec::new(),
            buffer_start: 0,
        })
    }

    /// The length of all record data, at which the last record ends.
    pub fn total_size(&self) -> u64 {
        self.total_size
    }

    /// Returns the bytes from `start` to `end`. Each call must start at or after the previous call's start.
    pub fn read(&mut self, start: u64, end: u64) -> Result<&[u8], MdictError> {
        if start < self.buffer_start || start > end || end > self.total_size {
            return Err(MdictError::Malformed("record offsets"));
        }
        while self.buffer_start + (self.buffer.len() as u64) < end {
            self.load_next_block(start)?;
        }
        let from = (start - self.buffer_start) as usize;
        let to = (end - self.buffer_start) as usize;
        Ok(&self.buffer[from..to])
    }

    /// Drops the buffered bytes before `keep_from` and appends the next decompressed block.
    fn load_next_block(&mut self, keep_from: u64) -> Result<(), MdictError> {
        let size = self
            .block_sizes
            .next()
            .ok_or(MdictError::Truncated("record blocks"))?;
        let buffer_end = self.buffer_start + self.buffer.len() as u64;
        let dropped = keep_from.min(buffer_end) - self.buffer_start;
        self.buffer.drain(..dropped as usize);
        self.buffer_start += dropped;
        let stored = read_stream_bytes(&mut self.reader, size.stored, "record blocks")?;
        self.buffer
            .extend(decode_block(&stored, size.decompressed)?);
        Ok(())
    }
}

fn parse_block_index(
    bytes: &[u8],
    block_count: usize,
    width: usize,
) -> Result<Vec<BlockSize>, MdictError> {
    let mut cursor = ByteCursor::new(bytes, "record block index");
    (0..block_count)
        .map(|_| {
            Ok(BlockSize {
                stored: cursor.read_number(width)?,
                decompressed: cursor.read_number(width)?,
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dictionary::mdict::header::read_header;
    use crate::dictionary::mdict::key_section::read_keys;
    use crate::dictionary::mdict::test_writer::TestFile;
    use crate::dictionary::mdict::text_encoding::TextEncoding;

    const ENTRIES: &[(&str, &str)] = &[("apple", "red fruit"), ("banana", "yellow fruit")];

    /// Opens the record section of a test file whose records hold `ENTRIES` plus a NUL each.
    fn records_of(file: TestFile) -> RecordReader<std::io::Cursor<Vec<u8>>> {
        let mut reader = std::io::Cursor::new(file.write());
        let header = read_header(&mut reader).unwrap();
        read_keys(&mut reader, &header, TextEncoding::from_label("").unwrap()).unwrap();
        RecordReader::open(reader, header.version).unwrap()
    }

    #[test]
    fn reads_a_record() {
        let mut records = records_of(TestFile::new(ENTRIES));
        assert_eq!(records.read(10, 22).unwrap(), b"yellow fruit");
    }

    #[test]
    fn reads_a_record_that_spans_two_blocks() {
        let file = TestFile {
            record_block_size: 6,
            ..TestFile::new(ENTRIES)
        };
        let mut records = records_of(file);
        assert_eq!(records.read(10, 22).unwrap(), b"yellow fruit");
    }

    #[test]
    fn reads_version_1_records() {
        let file = TestFile {
            version: FormatVersion::V1,
            ..TestFile::new(ENTRIES)
        };
        let mut records = records_of(file);
        assert_eq!(records.read(0, 9).unwrap(), b"red fruit");
    }

    #[test]
    fn rejects_a_record_before_one_already_read() {
        let file = TestFile {
            record_block_size: 6,
            ..TestFile::new(ENTRIES)
        };
        let mut records = records_of(file);
        records.read(10, 22).unwrap();
        assert!(matches!(
            records.read(0, 9),
            Err(MdictError::Malformed("record offsets"))
        ));
    }

    #[test]
    fn reports_the_total_size_of_the_records() {
        assert_eq!(records_of(TestFile::new(ENTRIES)).total_size(), 23);
    }
}

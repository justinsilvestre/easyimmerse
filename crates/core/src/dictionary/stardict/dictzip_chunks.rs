use std::io;
use std::ops::Range;

use flate2::{Decompress, FlushDecompress};

/// A dictzip file read one chunk at a time.
///
/// Dictzip is gzip whose header lists the compressed size of each chunk of the data,
/// and whose compressor resets at every chunk, so that any chunk can be inflated on its own.
/// Chunks decompressed for one read are kept while the next read needs them, so reading in data order inflates each chunk once.
pub struct DictzipChunks {
    bytes: Vec<u8>,
    chunk_length: usize,
    /// The range of each chunk's compressed data within `bytes`.
    chunk_ranges: Vec<Range<usize>>,
    data_length: usize,
    /// The index of the first chunk held in `held`.
    held_first: usize,
    held: Vec<u8>,
}

const GZIP_HEADER_LENGTH: usize = 10;
const GZIP_TRAILER_LENGTH: usize = 8;
const FLAG_HEADER_CRC: u8 = 0x02;
const FLAG_EXTRA: u8 = 0x04;
const FLAG_NAME: u8 = 0x08;
const FLAG_COMMENT: u8 = 0x10;
const RANDOM_ACCESS_FIELD: &[u8] = b"RA";

impl DictzipChunks {
    /// Reads the chunk table of a dictzip file.
    /// Returns the bytes back when they are not a single-member gzip file with a chunk table.
    pub fn parse(bytes: Vec<u8>) -> Result<Self, Vec<u8>> {
        match parse_layout(&bytes) {
            Some(layout) => Ok(Self {
                bytes,
                chunk_length: layout.chunk_length,
                chunk_ranges: layout.chunk_ranges,
                data_length: layout.data_length,
                held_first: 0,
                held: Vec::new(),
            }),
            None => Err(bytes),
        }
    }

    pub fn chunk_count(&self) -> usize {
        self.chunk_ranges.len()
    }

    /// Returns the compressed file.
    pub fn into_bytes(self) -> Vec<u8> {
        self.bytes
    }

    /// Counts how many chunks reading the ranges in order would inflate, without inflating any.
    pub fn count_inflations(&self, ranges: impl IntoIterator<Item = Range<usize>>) -> usize {
        let mut count = 0;
        let mut held: Option<Range<usize>> = None;
        for range in ranges.into_iter().filter(|range| !range.is_empty()) {
            let needed = self.chunks_of(&range);
            held = Some(match held {
                Some(held) if held.contains(&needed.start) => {
                    count += needed.end.saturating_sub(held.end);
                    needed.start..needed.end.max(held.end)
                }
                _ => {
                    count += needed.len();
                    needed
                }
            });
        }
        count
    }

    /// Returns the decompressed bytes in the range, or nothing when the range lies beyond the data.
    pub fn read(&mut self, range: Range<usize>) -> io::Result<Option<&[u8]>> {
        if range.start > range.end || range.end > self.data_length {
            return Ok(None);
        }
        if range.is_empty() {
            return Ok(Some(&[]));
        }
        self.hold(self.chunks_of(&range))?;
        let offset = self.held_first * self.chunk_length;
        Ok(Some(&self.held[range.start - offset..range.end - offset]))
    }

    /// Returns the indexes of the chunks that hold a range of the data, which must not be empty.
    fn chunks_of(&self, range: &Range<usize>) -> Range<usize> {
        range.start / self.chunk_length..(range.end - 1) / self.chunk_length + 1
    }

    /// Makes `held` cover the chunks, keeping the held chunks that are still needed.
    /// Drops the held chunks before them, and drops every held chunk when they do not start among the held ones.
    fn hold(&mut self, needed: Range<usize>) -> io::Result<()> {
        let held_end = self.held_first + self.held.len().div_ceil(self.chunk_length);
        let first_missing = if (self.held_first..held_end).contains(&needed.start) {
            self.held
                .drain(..(needed.start - self.held_first) * self.chunk_length);
            held_end
        } else {
            self.held.clear();
            needed.start
        };
        self.held_first = needed.start;
        for index in first_missing..needed.end {
            let chunk = self.inflate(index)?;
            self.held.extend(chunk);
        }
        Ok(())
    }

    fn inflate(&self, index: usize) -> io::Result<Vec<u8>> {
        let expected = self
            .chunk_length
            .min(self.data_length - index * self.chunk_length);
        let compressed = &self.bytes[self.chunk_ranges[index].clone()];
        let mut chunk = Vec::with_capacity(expected);
        Decompress::new(false)
            .decompress_vec(compressed, &mut chunk, FlushDecompress::Sync)
            .map_err(io::Error::other)?;
        if chunk.len() == expected {
            Ok(chunk)
        } else {
            Err(io::Error::new(
                io::ErrorKind::InvalidData,
                format!("dictzip chunk {index} is malformed"),
            ))
        }
    }
}

struct Layout {
    chunk_length: usize,
    chunk_ranges: Vec<Range<usize>>,
    data_length: usize,
}

/// Reads the gzip header fields in order, as RFC 1952 lays them out, and the chunk table in the extra field.
fn parse_layout(bytes: &[u8]) -> Option<Layout> {
    let header = bytes.get(..GZIP_HEADER_LENGTH)?;
    let flags = header[3];
    if header[..3] != [0x1f, 0x8b, 8] || flags & FLAG_EXTRA == 0 {
        return None;
    }
    let extra_length = usize::from(read_u16(bytes, GZIP_HEADER_LENGTH)?);
    let extra_start = GZIP_HEADER_LENGTH + 2;
    let extra = bytes.get(extra_start..extra_start + extra_length)?;
    let (chunk_length, compressed_sizes) = find_chunk_table(extra)?;
    let mut position = extra_start + extra_length;
    for flag in [FLAG_NAME, FLAG_COMMENT] {
        if flags & flag != 0 {
            position += bytes.get(position..)?.iter().position(|&byte| byte == 0)? + 1;
        }
    }
    if flags & FLAG_HEADER_CRC != 0 {
        position += 2;
    }
    let chunk_ranges = chunk_ranges(position, &compressed_sizes);
    let data_end = chunk_ranges.last()?.end;
    if chunk_length == 0 || data_end + GZIP_TRAILER_LENGTH != bytes.len() {
        return None;
    }
    let data_length = read_u32(bytes, data_end + 4)? as usize;
    let chunk_count = chunk_ranges.len();
    let is_consistent =
        data_length > (chunk_count - 1) * chunk_length && data_length <= chunk_count * chunk_length;
    is_consistent.then_some(Layout {
        chunk_length,
        chunk_ranges,
        data_length,
    })
}

/// Finds the `RA` subfield among the extra field's subfields and reads its chunk length and compressed chunk sizes.
fn find_chunk_table(extra: &[u8]) -> Option<(usize, Vec<usize>)> {
    let mut position = 0;
    while position + 4 <= extra.len() {
        let length = usize::from(read_u16(extra, position + 2)?);
        let data = extra.get(position + 4..position + 4 + length)?;
        if &extra[position..position + 2] == RANDOM_ACCESS_FIELD {
            return read_chunk_table(data);
        }
        position += 4 + length;
    }
    None
}

/// Reads a version 1 chunk table: the chunk length, the chunk count, and the compressed size of each chunk.
fn read_chunk_table(data: &[u8]) -> Option<(usize, Vec<usize>)> {
    if read_u16(data, 0)? != 1 {
        return None;
    }
    let chunk_length = usize::from(read_u16(data, 2)?);
    let chunk_count = usize::from(read_u16(data, 4)?);
    let sizes = (0..chunk_count)
        .map(|index| read_u16(data, 6 + index * 2).map(usize::from))
        .collect::<Option<Vec<_>>>()?;
    Some((chunk_length, sizes))
}

fn chunk_ranges(start: usize, compressed_sizes: &[usize]) -> Vec<Range<usize>> {
    let mut position = start;
    compressed_sizes
        .iter()
        .map(|size| {
            let range = position..position + size;
            position += size;
            range
        })
        .collect()
}

fn read_u16(bytes: &[u8], position: usize) -> Option<u16> {
    let pair = bytes.get(position..position + 2)?;
    Some(u16::from_le_bytes([pair[0], pair[1]]))
}

fn read_u32(bytes: &[u8], position: usize) -> Option<u32> {
    let quad = bytes.get(position..position + 4)?;
    Some(u32::from_le_bytes([quad[0], quad[1], quad[2], quad[3]]))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dictionary::stardict::dictzip::decompressed;
    use crate::test_support::read_fixture_bytes;

    /// The fixture's data file, which uses chunks of 64 bytes.
    fn fixture_chunks() -> DictzipChunks {
        DictzipChunks::parse(read_fixture_bytes("sample-stardict/sample.dict.dz")).unwrap()
    }

    fn read(chunks: &mut DictzipChunks, range: Range<usize>) -> Vec<u8> {
        chunks.read(range).unwrap().unwrap().to_vec()
    }

    #[test]
    fn reads_the_start_of_the_data() {
        assert_eq!(read(&mut fixture_chunks(), 0..15), b"mA round fruit.");
    }

    #[test]
    fn reads_a_range_that_spans_chunks() {
        let bytes = read_fixture_bytes("sample-stardict/sample.dict.dz");
        let whole = decompressed("sample.dict.dz", bytes).unwrap();
        assert_eq!(read(&mut fixture_chunks(), 60..140), whole[60..140]);
    }

    #[test]
    fn reads_the_last_chunk() {
        let bytes = read_fixture_bytes("sample-stardict/sample.dict.dz");
        let whole = decompressed("sample.dict.dz", bytes).unwrap();
        let length = whole.len();
        assert_eq!(
            read(&mut fixture_chunks(), length - 10..length),
            whole[length - 10..]
        );
    }

    #[test]
    fn reads_a_range_before_the_one_read_last() {
        let mut chunks = fixture_chunks();
        read(&mut chunks, 130..140);
        assert_eq!(read(&mut chunks, 0..15), b"mA round fruit.");
    }

    #[test]
    fn reads_nothing_beyond_the_data() {
        let mut chunks = fixture_chunks();
        let end = chunks.data_length;
        assert!(chunks.read(end - 1..end + 1).unwrap().is_none());
    }

    #[test]
    fn counts_each_chunk_once_for_reads_in_data_order() {
        assert_eq!(
            fixture_chunks().count_inflations([0..15, 15..80, 80..140]),
            3
        );
    }

    #[test]
    fn counts_a_chunk_again_after_reading_past_it() {
        assert_eq!(
            fixture_chunks().count_inflations([0..15, 130..140, 0..15]),
            3
        );
    }

    #[test]
    fn declines_a_gzip_file_without_a_chunk_table() {
        let bytes = read_fixture_bytes("sample-stardict-sametypesequence/phonetic.idx.gz");
        assert!(DictzipChunks::parse(bytes).is_err());
    }

    #[test]
    fn rejects_a_corrupt_chunk() {
        let mut bytes = read_fixture_bytes("sample-stardict/sample.dict.dz");
        let first_chunk = parse_layout(&bytes).unwrap().chunk_ranges[0].clone();
        bytes[first_chunk].fill(0xff);
        let mut chunks = DictzipChunks::parse(bytes).unwrap();
        assert!(chunks.read(0..15).is_err());
    }
}

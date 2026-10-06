use std::ops::Range;

use crate::dictionary::{DictionaryError, DictionarySource};

use super::dictzip::{decompressed, is_gzip};
use super::dictzip_chunks::DictzipChunks;
use super::error::StardictError;

/// A data file from which entries are read by offset and size: the `.dict` of a dictionary or the `res.rdic` of its resources.
///
/// A dictzip file is decompressed one chunk at a time when the reads follow the order of the data closely enough
/// that each chunk is inflated about once, as they do in most dictionaries.
/// Otherwise, and for any other file, the data is decompressed whole.
pub struct DictData {
    name: String,
    content: Content,
}

enum Content {
    Whole(Vec<u8>),
    Chunked(DictzipChunks),
}

/// How many times each chunk may be inflated on average before decompressing the whole file is preferred.
const MAX_INFLATIONS_PER_CHUNK: usize = 2;

impl DictData {
    /// Opens a data file, given the ranges that will be read from it in order.
    pub fn open(
        source: &mut DictionarySource,
        name: &str,
        ranges: impl IntoIterator<Item = Range<usize>>,
    ) -> Result<Self, DictionaryError> {
        let bytes = source.read(name)?;
        let content = if is_gzip(&bytes) {
            match DictzipChunks::parse(bytes) {
                Ok(chunks) if is_cheap_to_read(&chunks, ranges) => Content::Chunked(chunks),
                Ok(chunks) => Content::Whole(decompressed(name, chunks.into_bytes())?),
                Err(bytes) => Content::Whole(decompressed(name, bytes)?),
            }
        } else {
            Content::Whole(bytes)
        };
        Ok(Self {
            name: name.to_string(),
            content,
        })
    }

    /// Returns the bytes in the range, or nothing when the range lies beyond the data.
    pub fn read(&mut self, range: Range<usize>) -> Result<Option<&[u8]>, StardictError> {
        match &mut self.content {
            Content::Whole(bytes) => Ok(bytes.get(range)),
            Content::Chunked(chunks) => {
                chunks
                    .read(range)
                    .map_err(|source| StardictError::Decompress {
                        name: self.name.clone(),
                        source,
                    })
            }
        }
    }
}

fn is_cheap_to_read(
    chunks: &DictzipChunks,
    ranges: impl IntoIterator<Item = Range<usize>>,
) -> bool {
    chunks.count_inflations(ranges) <= chunks.chunk_count() * MAX_INFLATIONS_PER_CHUNK
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::read_fixture_bytes;

    const DICTZIP_NAME: &str = "sample.dict.dz";

    fn open(ranges: Vec<Range<usize>>) -> DictData {
        let bytes = read_fixture_bytes("sample-stardict/sample.dict.dz");
        let mut source = DictionarySource::single(DICTZIP_NAME, bytes).unwrap();
        DictData::open(&mut source, DICTZIP_NAME, ranges).unwrap()
    }

    #[test]
    fn reads_a_dictzip_file_chunk_by_chunk_when_the_reads_follow_the_data() {
        let data = open(vec![0..15, 15..80, 80..140]);
        assert!(matches!(data.content, Content::Chunked(_)));
    }

    #[test]
    fn decompresses_a_dictzip_file_whole_when_the_reads_jump_about() {
        let jumps = (0..20).flat_map(|_| [0..15, 200..210]).collect();
        let data = open(jumps);
        assert!(matches!(data.content, Content::Whole(_)));
    }

    #[test]
    fn reads_the_same_bytes_either_way() {
        let mut chunked = open(vec![0..15, 15..30]);
        let mut whole = open((0..20).flat_map(|_| [0..15, 200..210]).collect());
        assert_eq!(
            chunked.read(60..140).unwrap().map(<[u8]>::to_vec),
            whole.read(60..140).unwrap().map(<[u8]>::to_vec)
        );
    }

    #[test]
    fn reads_an_uncompressed_file() {
        let mut source = DictionarySource::single("a.dict", b"mcat\0".to_vec()).unwrap();
        let mut data = DictData::open(&mut source, "a.dict", std::iter::once(0..5)).unwrap();
        assert_eq!(data.read(1..4).unwrap(), Some(&b"cat"[..]));
    }
}

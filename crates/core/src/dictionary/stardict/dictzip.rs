use std::io::{self, Read};

use flate2::read::MultiGzDecoder;

use crate::dictionary::{DictionaryError, DictionarySource};

use super::error::StardictError;

const GZIP_SIGNATURE: &[u8] = b"\x1f\x8b";

/// Reads a file whole, decompressing it when it is gzip-compressed.
///
/// This covers `.idx.gz` files, and dictzip files such as `.idx.dz`: dictzip is gzip with a chunk table for random access,
/// so any gzip decoder reads it whole.
pub fn read_decompressed(
    source: &mut DictionarySource,
    name: &str,
) -> Result<Vec<u8>, DictionaryError> {
    let bytes = source.read(name)?;
    if is_gzip(&bytes) {
        Ok(decompressed(name, bytes)?)
    } else {
        Ok(bytes)
    }
}

pub fn is_gzip(bytes: &[u8]) -> bool {
    bytes.starts_with(GZIP_SIGNATURE)
}

/// Decompresses a gzip file whole.
pub fn decompressed(name: &str, bytes: Vec<u8>) -> Result<Vec<u8>, StardictError> {
    gunzip(&bytes).map_err(|source| StardictError::Decompress {
        name: name.to_string(),
        source,
    })
}

fn gunzip(bytes: &[u8]) -> io::Result<Vec<u8>> {
    let mut decompressed = Vec::new();
    MultiGzDecoder::new(bytes).read_to_end(&mut decompressed)?;
    Ok(decompressed)
}

#[cfg(test)]
mod tests {
    use std::io::Write;

    use flate2::Compression;
    use flate2::write::GzEncoder;

    use super::*;
    use crate::test_support::read_fixture_bytes;

    fn read(name: &str, bytes: Vec<u8>) -> Result<Vec<u8>, DictionaryError> {
        let mut source = DictionarySource::single(name, bytes).unwrap();
        read_decompressed(&mut source, name)
    }

    #[test]
    fn decompresses_a_dictzip_file() {
        let bytes = read_fixture_bytes("sample-stardict/sample.dict.dz");
        assert!(
            read("sample.dict.dz", bytes)
                .unwrap()
                .starts_with(b"mA round fruit.")
        );
    }

    #[test]
    fn decompresses_a_gzip_file() {
        let bytes = read_fixture_bytes("sample-stardict-sametypesequence/phonetic.idx.gz");
        assert!(
            read("phonetic.idx.gz", bytes)
                .unwrap()
                .starts_with(b"hello\0")
        );
    }

    #[test]
    fn reads_an_uncompressed_file_as_it_is() {
        assert_eq!(read("a.dict", b"mcat\0".to_vec()).unwrap(), b"mcat\0");
    }

    /// Compresses more than one tar header's worth of data and breaks the checksum at the end,
    /// so that the damage shows only when the whole file is read.
    fn gzip_with_a_wrong_checksum() -> Vec<u8> {
        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        encoder.write_all(&[b'm'; 1024]).unwrap();
        let mut bytes = encoder.finish().unwrap();
        let checksum_start = bytes.len() - 8;
        bytes[checksum_start] ^= 0xff;
        bytes
    }

    #[test]
    fn rejects_a_gzip_file_with_a_wrong_checksum() {
        assert!(matches!(
            read("a.dict.dz", gzip_with_a_wrong_checksum()),
            Err(DictionaryError::Stardict(StardictError::Decompress { .. }))
        ));
    }
}

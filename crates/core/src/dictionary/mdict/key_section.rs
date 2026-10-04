use std::io::Read;

use super::block::decode_block;
use super::byte_cursor::{ByteCursor, read_stream_bytes};
use super::error::MdictError;
use super::header::{FormatVersion, Header};
use super::key_info::parse_key_info;
use super::key_info_cipher::decrypt_key_info;
use super::text_encoding::TextEncoding;

/// A key and the offset of its record within the concatenated, decompressed record blocks.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct KeyEntry {
    pub offset: u64,
    pub key: String,
}

struct KeySummary {
    block_count: usize,
    info_decompressed_size: u64,
    info_size: u64,
    blocks_size: u64,
}

/// Reads the key section that follows the header: a summary, the key block index, and the key blocks.
pub fn read_keys(
    reader: &mut impl Read,
    header: &Header,
    encoding: TextEncoding,
) -> Result<Vec<KeyEntry>, MdictError> {
    let summary = read_summary(reader, header.version)?;
    let info = read_key_info(reader, header, &summary)?;
    let sizes = parse_key_info(&info, summary.block_count, header.version, encoding)?;
    let blocks = read_stream_bytes(reader, summary.blocks_size, "key blocks")?;
    let mut cursor = ByteCursor::new(&blocks, "key blocks");
    let mut keys = Vec::new();
    for size in sizes {
        let block = decode_block(cursor.take_stated(size.stored)?, size.decompressed)?;
        parse_key_block(&block, header.version, encoding, &mut keys)?;
    }
    Ok(keys)
}

/// Reads the summary. Version 2.0 adds the decompressed size of the index and a checksum.
fn read_summary(reader: &mut impl Read, version: FormatVersion) -> Result<KeySummary, MdictError> {
    let width = version.number_width();
    let field_count = if version == FormatVersion::V2 { 5 } else { 4 };
    let bytes = read_stream_bytes(reader, (width * field_count) as u64, "key summary")?;
    if version == FormatVersion::V2 {
        check_summary(reader, &bytes)?;
    }
    let mut cursor = ByteCursor::new(&bytes, "key summary");
    let block_count = cursor.read_size(width)?;
    cursor.read_number(width)?;
    let info_decompressed_size = match version {
        FormatVersion::V1 => 0,
        FormatVersion::V2 => cursor.read_number(width)?,
    };
    Ok(KeySummary {
        block_count,
        info_decompressed_size,
        info_size: cursor.read_number(width)?,
        blocks_size: cursor.read_number(width)?,
    })
}

fn check_summary(reader: &mut impl Read, bytes: &[u8]) -> Result<(), MdictError> {
    let checksum = read_stream_bytes(reader, 4, "key summary")?;
    if checksum == adler2::adler32_slice(bytes).to_be_bytes() {
        Ok(())
    } else {
        Err(MdictError::Checksum("key summary"))
    }
}

/// Reads the key block index, which version 2.0 compresses and may obfuscate, and version 1.2 stores as it is.
fn read_key_info(
    reader: &mut impl Read,
    header: &Header,
    summary: &KeySummary,
) -> Result<Vec<u8>, MdictError> {
    let stored = read_stream_bytes(reader, summary.info_size, "key block index")?;
    match header.version {
        FormatVersion::V1 => Ok(stored),
        FormatVersion::V2 if header.key_info_encrypted => {
            decode_block(&decrypt_key_info(&stored)?, summary.info_decompressed_size)
        }
        FormatVersion::V2 => decode_block(&stored, summary.info_decompressed_size),
    }
}

/// Parses a decoded key block: pairs of a record offset and a NUL-terminated key.
fn parse_key_block(
    block: &[u8],
    version: FormatVersion,
    encoding: TextEncoding,
    keys: &mut Vec<KeyEntry>,
) -> Result<(), MdictError> {
    let mut cursor = ByteCursor::new(block, "key block");
    while !cursor.is_empty() {
        let offset = cursor.read_number(version.number_width())?;
        let length = encoding
            .nul_position(cursor.remaining())
            .ok_or(MdictError::Malformed("key block"))?;
        let key = encoding.decode(cursor.take(length)?);
        cursor.take(encoding.unit_width())?;
        keys.push(KeyEntry { offset, key });
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dictionary::mdict::header::read_header;
    use crate::dictionary::mdict::test_writer::TestFile;

    fn keys_of(file: &TestFile) -> Vec<String> {
        let bytes = file.write();
        let mut reader = bytes.as_slice();
        let header = read_header(&mut reader).unwrap();
        let encoding = TextEncoding::from_label(&file.encoding).unwrap();
        let keys = read_keys(&mut reader, &header, encoding).unwrap();
        keys.into_iter().map(|entry| entry.key).collect()
    }

    fn sample() -> TestFile {
        TestFile::new(&[("apple", "red"), ("banana", "yellow"), ("cherry", "dark")])
    }

    #[test]
    fn reads_keys_across_several_blocks() {
        let file = TestFile {
            keys_per_block: 2,
            ..sample()
        };
        assert_eq!(keys_of(&file), ["apple", "banana", "cherry"]);
    }

    #[test]
    fn reads_version_1_keys() {
        let file = TestFile {
            version: FormatVersion::V1,
            ..sample()
        };
        assert_eq!(keys_of(&file), ["apple", "banana", "cherry"]);
    }

    #[test]
    fn reads_keys_behind_an_encrypted_index() {
        let file = TestFile {
            encrypt_key_info: true,
            ..sample()
        };
        assert_eq!(keys_of(&file), ["apple", "banana", "cherry"]);
    }

    #[test]
    fn reads_utf16_keys() {
        let file = TestFile {
            encoding: "UTF-16".into(),
            ..sample()
        };
        assert_eq!(keys_of(&file), ["apple", "banana", "cherry"]);
    }

    #[test]
    fn rejects_a_key_summary_whose_checksum_differs() {
        let file = TestFile {
            corrupt_key_summary: true,
            ..sample()
        };
        let bytes = file.write();
        let mut reader = bytes.as_slice();
        let header = read_header(&mut reader).unwrap();
        assert!(matches!(
            read_keys(&mut reader, &header, TextEncoding::UTF_16LE),
            Err(MdictError::Checksum("key summary"))
        ));
    }
}

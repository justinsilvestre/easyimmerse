use super::block::BlockSize;
use super::byte_cursor::ByteCursor;
use super::error::MdictError;
use super::header::FormatVersion;
use super::text_encoding::TextEncoding;

const SECTION: &str = "key block index";

/// Parses the decoded key block index into the sizes of the key blocks.
///
/// Each item holds an entry count, the block's first and last keys, its stored size and its decompressed size.
/// Version 2.0 writes 2-byte key lengths and a NUL after each key; version 1.2 writes 1-byte lengths and no NUL.
pub fn parse_key_info(
    bytes: &[u8],
    block_count: usize,
    version: FormatVersion,
    encoding: TextEncoding,
) -> Result<Vec<BlockSize>, MdictError> {
    let mut cursor = ByteCursor::new(bytes, SECTION);
    let width = version.number_width();
    let mut sizes = Vec::new();
    for _ in 0..block_count {
        cursor.read_number(width)?;
        skip_key(&mut cursor, version, encoding)?;
        skip_key(&mut cursor, version, encoding)?;
        sizes.push(BlockSize {
            stored: cursor.read_number(width)?,
            decompressed: cursor.read_number(width)?,
        });
    }
    Ok(sizes)
}

fn skip_key(
    cursor: &mut ByteCursor,
    version: FormatVersion,
    encoding: TextEncoding,
) -> Result<(), MdictError> {
    let units = match version {
        FormatVersion::V1 => cursor.read_size(1)?,
        FormatVersion::V2 => cursor.read_size(2)? + 1,
    };
    cursor.take(units * encoding.unit_width())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dictionary::mdict::test_writer::encode_key_info_item;

    const SIZE: BlockSize = BlockSize {
        stored: 30,
        decompressed: 40,
    };

    fn parse(version: FormatVersion, encoding: TextEncoding) -> Vec<BlockSize> {
        let first = encoding.encode("apple");
        let last = encoding.encode("banana");
        let item = encode_key_info_item(
            version,
            encoding,
            2,
            (first.as_slice(), last.as_slice()),
            SIZE,
        );
        parse_key_info(&item, 1, version, encoding).unwrap()
    }

    #[test]
    fn reads_version_2_block_sizes() {
        let utf8 = TextEncoding::from_label("UTF-8").unwrap();
        assert_eq!(parse(FormatVersion::V2, utf8), [SIZE]);
    }

    #[test]
    fn reads_version_1_block_sizes() {
        let utf8 = TextEncoding::from_label("UTF-8").unwrap();
        assert_eq!(parse(FormatVersion::V1, utf8), [SIZE]);
    }

    #[test]
    fn counts_utf16_key_lengths_in_code_units() {
        assert_eq!(parse(FormatVersion::V2, TextEncoding::UTF_16LE), [SIZE]);
    }

    #[test]
    fn rejects_an_index_with_fewer_items_than_stated() {
        assert!(matches!(
            parse_key_info(&[], 1, FormatVersion::V2, TextEncoding::UTF_16LE),
            Err(MdictError::Truncated(SECTION))
        ));
    }
}

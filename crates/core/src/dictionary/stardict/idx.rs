use super::byte_cursor::{ByteCursor, decode_text};

/// One record of a `.idx` file: a headword and where its entry lies in the `.dict` data.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IdxRecord {
    pub word: String,
    pub offset: u64,
    pub size: u32,
}

/// The width of the offsets in a `.idx` file, set by the `idxoffsetbits` key of the `.ifo`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OffsetBits {
    ThirtyTwo,
    SixtyFour,
}

/// Parses every record of a `.idx` file, in file order.
/// Returns `None` when the file ends in the middle of a record.
pub fn parse_idx(bytes: &[u8], offset_bits: OffsetBits) -> Option<Vec<IdxRecord>> {
    let mut cursor = ByteCursor::new(bytes);
    let mut records = Vec::new();
    while !cursor.is_empty() {
        records.push(read_record(&mut cursor, offset_bits)?);
    }
    Some(records)
}

fn read_record(cursor: &mut ByteCursor, offset_bits: OffsetBits) -> Option<IdxRecord> {
    let word = decode_text(cursor.take_until_nul());
    let offset = match offset_bits {
        OffsetBits::ThirtyTwo => u64::from(cursor.take_u32()?),
        OffsetBits::SixtyFour => cursor.take_u64()?,
    };
    let size = cursor.take_u32()?;
    Some(IdxRecord { word, offset, size })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn record(word: &str, offset: u64, size: u32) -> IdxRecord {
        IdxRecord {
            word: word.to_string(),
            offset,
            size,
        }
    }

    #[test]
    fn parses_records_with_32_bit_offsets() {
        let bytes = b"cat\0\0\0\0\x05\0\0\0\x03dog\0\0\0\0\x08\0\0\0\x04";
        assert_eq!(
            parse_idx(bytes, OffsetBits::ThirtyTwo),
            Some(vec![record("cat", 5, 3), record("dog", 8, 4)])
        );
    }

    #[test]
    fn parses_records_with_64_bit_offsets() {
        let bytes = b"cat\0\0\0\0\x01\0\0\0\x05\0\0\0\x03";
        assert_eq!(
            parse_idx(bytes, OffsetBits::SixtyFour),
            Some(vec![record("cat", (1 << 32) + 5, 3)])
        );
    }

    #[test]
    fn rejects_a_truncated_record() {
        assert_eq!(parse_idx(b"cat\0\0\0\0\x05\0", OffsetBits::ThirtyTwo), None);
    }
}

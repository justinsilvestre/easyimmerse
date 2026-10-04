use super::byte_cursor::{ByteCursor, decode_text};

/// One record of a `.syn` file: another headword for the `.idx` record at the given position.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SynRecord {
    pub word: String,
    pub index: usize,
}

/// Parses every record of a `.syn` file.
/// Returns `None` when the file ends in the middle of a record.
pub fn parse_syn(bytes: &[u8]) -> Option<Vec<SynRecord>> {
    let mut cursor = ByteCursor::new(bytes);
    let mut records = Vec::new();
    while !cursor.is_empty() {
        let word = decode_text(cursor.take_until_nul());
        let index = usize::try_from(cursor.take_u32()?).ok()?;
        records.push(SynRecord { word, index });
    }
    Some(records)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_synonyms_with_their_index_positions() {
        assert_eq!(
            parse_syn(b"kitty\0\0\0\0\x02"),
            Some(vec![SynRecord {
                word: "kitty".to_string(),
                index: 2
            }])
        );
    }

    #[test]
    fn rejects_a_truncated_record() {
        assert_eq!(parse_syn(b"kitty\0\0\0"), None);
    }
}

//! Glossaries are stored in compressed blocks of consecutive entries.
//! Glossary JSON compresses poorly one entry at a time but well in groups,
//! because neighboring entries repeat the same structure.

use std::io::{Read, Write};

use flate2::Compression;
use flate2::read::DeflateDecoder;
use flate2::write::DeflateEncoder;
use rayon::prelude::*;
use serde_json::value::RawValue;

use crate::error::StorageError;

/// How many consecutive entries share one block.
pub const ENTRIES_PER_BLOCK: usize = 32;

/// Compresses the glossary JSON of consecutive entries into blocks of `ENTRIES_PER_BLOCK`.
/// Entry `n` goes into block `n / ENTRIES_PER_BLOCK` at slot `n % ENTRIES_PER_BLOCK`.
pub fn encode_glossary_blocks(glossaries: &[&str]) -> Result<Vec<Vec<u8>>, StorageError> {
    glossaries
        .par_chunks(ENTRIES_PER_BLOCK)
        .map(encode_block)
        .collect()
}

/// Stores a block as the deflated JSON array of its glossary arrays.
fn encode_block(glossaries: &[&str]) -> Result<Vec<u8>, StorageError> {
    let json = format!("[{}]", glossaries.join(","));
    let mut encoder = DeflateEncoder::new(Vec::new(), Compression::fast());
    encoder.write_all(json.as_bytes()).map_err(corrupt)?;
    encoder.finish().map_err(corrupt)
}

/// Returns the glossary JSON stored at a slot of an encoded block.
pub fn decode_glossary(block: &[u8], slot: usize) -> Result<String, StorageError> {
    let mut json = String::new();
    DeflateDecoder::new(block)
        .read_to_string(&mut json)
        .map_err(corrupt)?;
    let glossaries: Vec<&RawValue> = serde_json::from_str(&json)?;
    glossaries
        .get(slot)
        .map(|glossary| glossary.get().to_string())
        .ok_or_else(|| StorageError::CorruptGlossary(format!("no glossary at slot {slot}")))
}

fn corrupt(error: std::io::Error) -> StorageError {
    StorageError::CorruptGlossary(error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn glossaries(count: usize) -> Vec<String> {
        (0..count)
            .map(|n| format!("[\"definition {n}\"]"))
            .collect()
    }

    fn encode(count: usize) -> Vec<Vec<u8>> {
        let glossaries = glossaries(count);
        let borrowed: Vec<&str> = glossaries.iter().map(String::as_str).collect();
        encode_glossary_blocks(&borrowed).unwrap()
    }

    #[test]
    fn groups_entries_into_blocks() {
        assert_eq!(encode(ENTRIES_PER_BLOCK + 1).len(), 2);
    }

    #[test]
    fn decodes_the_glossary_at_a_slot() {
        let blocks = encode(ENTRIES_PER_BLOCK + 1);
        assert_eq!(
            decode_glossary(&blocks[0], 3).unwrap(),
            r#"["definition 3"]"#
        );
    }

    #[test]
    fn decodes_a_glossary_from_a_later_block() {
        let blocks = encode(ENTRIES_PER_BLOCK + 1);
        assert_eq!(
            decode_glossary(&blocks[1], 0).unwrap(),
            r#"["definition 32"]"#
        );
    }

    #[test]
    fn fails_for_a_slot_past_the_end_of_the_block() {
        assert!(decode_glossary(&encode(2)[0], 2).is_err());
    }
}

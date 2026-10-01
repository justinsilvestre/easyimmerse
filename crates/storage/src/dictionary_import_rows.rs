use easyimmerse_core::dictionary::DictionaryAsset;
use rusqlite::{Connection, params};

use crate::dictionaries::DictionaryId;
use crate::dictionary_terms_table::terms_table;
use crate::error::StorageError;
use crate::glossary_block::ENTRIES_PER_BLOCK;

/// One term row, with its tags already encoded as JSON.
pub struct TermRecord<'a> {
    term: &'a str,
    reading: Option<&'a str>,
    tags_json: String,
}

impl<'a> TermRecord<'a> {
    pub fn new(
        term: &'a str,
        reading: Option<&'a str>,
        tags: &[String],
    ) -> Result<Self, StorageError> {
        Ok(Self {
            term,
            reading,
            tags_json: serde_json::to_string(tags)?,
        })
    }
}

pub fn insert_assets(
    conn: &Connection,
    id: &DictionaryId,
    assets: &[DictionaryAsset],
) -> Result<(), StorageError> {
    let mut statement = conn.prepare(
        "INSERT OR REPLACE INTO dictionary_assets (dictionary_id, path, media_type, bytes)
         VALUES (?1, ?2, ?3, ?4)",
    )?;
    for asset in assets {
        statement.execute(params![id.0, asset.path, asset.media_type, asset.bytes])?;
    }
    Ok(())
}

/// Stores encoded glossary blocks, the first of which has the number `first_block`.
pub fn insert_blocks(
    conn: &Connection,
    id: &DictionaryId,
    first_block: usize,
    blocks: &[Vec<u8>],
) -> Result<(), StorageError> {
    let mut statement = conn.prepare_cached(
        "INSERT INTO dictionary_glossary_blocks (dictionary_id, block, glossaries)
         VALUES (?1, ?2, ?3)",
    )?;
    for (offset, block) in blocks.iter().enumerate() {
        statement.execute(params![id.0, (first_block + offset) as u64, block])?;
    }
    Ok(())
}

/// Stores term rows, the first of which is entry number `first_entry` of the dictionary.
pub fn insert_terms(
    conn: &Connection,
    id: &DictionaryId,
    first_entry: usize,
    terms: &[TermRecord],
) -> Result<(), StorageError> {
    let mut statement = conn.prepare_cached(&format!(
        "INSERT INTO {} (term, reading, tags_json, block, slot) VALUES (?1, ?2, ?3, ?4, ?5)",
        terms_table(id)?
    ))?;
    for (offset, record) in terms.iter().enumerate() {
        let position = first_entry + offset;
        statement.execute(params![
            record.term,
            record.reading,
            record.tags_json,
            (position / ENTRIES_PER_BLOCK) as u64,
            (position % ENTRIES_PER_BLOCK) as u64
        ])?;
    }
    Ok(())
}

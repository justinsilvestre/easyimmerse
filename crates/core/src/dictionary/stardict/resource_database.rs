use std::collections::HashSet;

use crate::dictionary::{DictionaryError, DictionaryMedia, DictionarySink, DictionarySource};

use super::dict_data::DictData;
use super::dictzip::read_decompressed;
use super::error::StardictError;
use super::idx::{IdxRecord, parse_idx};
use super::ifo::read_storage_offset_bits;
use super::media::media_type;

/// The files of a packed resource database, which StarDict reads in place of a `res/` directory.
///
/// `res.rifo` describes the database, `res.ridx` lists each file's path, offset, and size in the same layout as a `.idx`,
/// and `res.rdic` holds the files one after another. `res.ridx` may be gzip-compressed and `res.rdic` dictzip-compressed.
#[derive(Debug, PartialEq, Eq)]
pub struct ResourceDatabase {
    pub rifo: String,
    pub ridx: String,
    pub rdic: String,
}

/// Passes each file of the database to the sink under its path within the database, and returns the paths.
pub fn import_resource_database(
    source: &mut DictionarySource,
    database: &ResourceDatabase,
    sink: &mut dyn DictionarySink,
) -> Result<HashSet<String>, DictionaryError> {
    let records = read_records(source, database)?;
    let ranges = records.iter().filter_map(IdxRecord::range);
    let mut data = DictData::open(source, &database.rdic, ranges)?;
    let mut paths = HashSet::new();
    for record in records {
        let bytes = match record.range() {
            Some(range) => data.read(range)?,
            None => None,
        };
        let bytes = bytes.ok_or_else(|| StardictError::EntryOutOfBounds(record.word.clone()))?;
        sink.media(DictionaryMedia {
            media_type: media_type(&record.word).to_string(),
            bytes: bytes.to_vec(),
            path: record.word.clone(),
        })?;
        paths.insert(record.word);
    }
    Ok(paths)
}

fn read_records(
    source: &mut DictionarySource,
    database: &ResourceDatabase,
) -> Result<Vec<IdxRecord>, DictionaryError> {
    let offset_bits = read_storage_offset_bits(&source.read(&database.rifo)?)?;
    let index = read_decompressed(source, &database.ridx)?;
    parse_idx(&index, offset_bits)
        .ok_or_else(|| StardictError::MalformedFile(database.ridx.clone()).into())
}

use crate::dictionary::{DictionaryError, DictionarySink, DictionarySource, TermEntry};

use super::conversion::term_entry;
use super::dict_data::DictData;
use super::dictzip::read_decompressed;
use super::error::StardictError;
use super::fields::split_fields;
use super::files::StardictFiles;
use super::headword_groups::HeadwordGroups;
use super::idx::{IdxRecord, parse_idx};
use super::ifo::Ifo;
use super::syn::{SynRecord, parse_syn};

/// Passes the dictionary's entries to the sink in index order, one per distinct block of data,
/// with the other headwords and synonyms for that block as alternates.
pub fn import_entries(
    source: &mut DictionarySource,
    files: &StardictFiles,
    ifo: &Ifo,
    sink: &mut dyn DictionarySink,
) -> Result<(), DictionaryError> {
    let records = read_index(source, files, ifo)?;
    let mut groups = HeadwordGroups::new(&records, read_synonyms(source, files)?);
    let entry_ranges = records
        .iter()
        .enumerate()
        .filter(|(index, _)| groups.is_first_of_group(*index))
        .filter_map(|(_, record)| record.range());
    let mut data = DictData::open(source, &files.dict, entry_ranges)?;
    for (index, record) in records.into_iter().enumerate() {
        if groups.is_first_of_group(index) {
            let mut entry = read_entry(&mut data, record, ifo.same_type_sequence())?;
            entry.alternates = groups.take_alternates(index);
            sink.term_entry(entry)?;
        }
    }
    Ok(())
}

fn read_index(
    source: &mut DictionarySource,
    files: &StardictFiles,
    ifo: &Ifo,
) -> Result<Vec<IdxRecord>, DictionaryError> {
    let bytes = read_decompressed(source, &files.idx)?;
    parse_idx(&bytes, ifo.offset_bits)
        .ok_or_else(|| StardictError::MalformedFile(files.idx.clone()).into())
}

fn read_synonyms(
    source: &mut DictionarySource,
    files: &StardictFiles,
) -> Result<Vec<SynRecord>, DictionaryError> {
    let Some(name) = &files.syn else {
        return Ok(Vec::new());
    };
    let bytes = read_decompressed(source, name)?;
    parse_syn(&bytes).ok_or_else(|| StardictError::MalformedFile(name.clone()).into())
}

fn read_entry(
    data: &mut DictData,
    record: IdxRecord,
    same_type_sequence: Option<&[u8]>,
) -> Result<TermEntry, StardictError> {
    let bytes = match record.range() {
        Some(range) => data.read(range)?,
        None => None,
    };
    let Some(bytes) = bytes else {
        return Err(StardictError::EntryOutOfBounds(record.word));
    };
    match split_fields(bytes, same_type_sequence) {
        Some(fields) => Ok(term_entry(record.word, &fields)),
        None => Err(StardictError::MalformedEntry(record.word)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn record(offset: u64, size: u32) -> IdxRecord {
        IdxRecord {
            word: "cat".to_string(),
            offset,
            size,
        }
    }

    fn data(bytes: &[u8]) -> DictData {
        let mut source = DictionarySource::single("a.dict", bytes.to_vec()).unwrap();
        DictData::open(&mut source, "a.dict", []).unwrap()
    }

    #[test]
    fn reads_an_entry_from_its_offset_and_size() {
        let entry = read_entry(&mut data(b"xxmcat\0"), record(2, 5), None).unwrap();
        assert_eq!(
            entry.definitions,
            vec![crate::dictionary::Definition::text("cat")]
        );
    }

    #[test]
    fn rejects_an_entry_beyond_the_data() {
        assert!(matches!(
            read_entry(&mut data(b"mcat\0"), record(2, 5), None),
            Err(StardictError::EntryOutOfBounds(_))
        ));
    }
}

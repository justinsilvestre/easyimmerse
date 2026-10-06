use std::io::Read;

use super::error::MdictError;
use super::header::{Header, read_header};
use super::key_section::{KeyEntry, read_keys};
use super::record_section::RecordReader;
use super::text_encoding::TextEncoding;

/// Whether a file holds entries (`.mdx`) or resources (`.mdd`), whose keys are always UTF-16LE.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FileKind {
    Entries,
    Resources,
}

/// The keys that share one record, which starts at `offset`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RecordGroup {
    pub offset: u64,
    pub keys: Vec<String>,
}

/// An opened MDict file, with its keys read and its records ready to stream.
pub struct MdictFile<R> {
    pub header: Header,
    pub encoding: TextEncoding,
    groups: Vec<RecordGroup>,
    records: RecordReader<R>,
}

impl<R: Read> MdictFile<R> {
    pub fn open(mut reader: R, kind: FileKind) -> Result<Self, MdictError> {
        let header = read_header(&mut reader)?;
        let encoding = match kind {
            FileKind::Entries => {
                TextEncoding::from_label(header.attributes.get("Encoding").unwrap_or(""))?
            }
            FileKind::Resources => TextEncoding::UTF_16LE,
        };
        let keys = read_keys(&mut reader, &header, encoding)?;
        let records = RecordReader::open(reader, header.version)?;
        Ok(Self {
            header,
            encoding,
            groups: group_by_offset(keys),
            records,
        })
    }

    /// Passes each record, in file order, to `visit` with the keys that point at it.
    /// A record ends where the next one starts, or at the end of the record data.
    pub fn for_each_record<E: From<MdictError>>(
        mut self,
        mut visit: impl FnMut(&RecordGroup, &[u8]) -> Result<(), E>,
    ) -> Result<(), E> {
        for (index, group) in self.groups.iter().enumerate() {
            let end = self
                .groups
                .get(index + 1)
                .map_or(self.records.total_size(), |next| next.offset);
            visit(group, self.records.read(group.offset, end)?)?;
        }
        Ok(())
    }
}

/// Orders keys by record offset, keeping file order among keys that share a record.
fn group_by_offset(mut keys: Vec<KeyEntry>) -> Vec<RecordGroup> {
    keys.sort_by_key(|entry| entry.offset);
    let mut groups: Vec<RecordGroup> = Vec::new();
    for KeyEntry { offset, key } in keys {
        match groups.last_mut() {
            Some(group) if group.offset == offset => group.keys.push(key),
            _ => groups.push(RecordGroup {
                offset,
                keys: vec![key],
            }),
        }
    }
    groups
}

#[cfg(test)]
mod tests {
    use super::*;

    fn key(offset: u64, key: &str) -> KeyEntry {
        KeyEntry {
            offset,
            key: key.into(),
        }
    }

    #[test]
    fn groups_keys_that_share_a_record() {
        let groups = group_by_offset(vec![key(5, "b"), key(0, "a"), key(5, "c")]);
        let expected = vec![
            RecordGroup {
                offset: 0,
                keys: vec!["a".into()],
            },
            RecordGroup {
                offset: 5,
                keys: vec!["b".into(), "c".into()],
            },
        ];
        assert_eq!(groups, expected);
    }
}

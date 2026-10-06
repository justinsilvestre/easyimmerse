use std::io::{Cursor, Read};

use zip::ZipArchive;

use super::archive::unpack_archive;
use super::csv::TableLayout;
use super::error::DictionaryError;

/// The files of a dictionary as the user supplied them.
///
/// Archives among the files are opened, and their members are listed alongside the loose files.
/// Zip members stay compressed until a format reads them, so that a large archive is never unpacked whole.
/// Tar archives, plain or compressed with gzip, bzip2, xz, or zstd, are unpacked into loose files when the source is created,
/// and so is a lone bzip2-compressed file.
/// Archives are recognized by their contents rather than their names.
pub struct DictionarySource {
    loose_files: Vec<SourceFile>,
    zip_archives: Vec<ZipArchive<Cursor<Vec<u8>>>>,
    names: Vec<(String, Location)>,
    table_layout: Option<TableLayout>,
}

/// A file supplied by the user, named as it was on their disk or within an archive.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SourceFile {
    pub name: String,
    pub bytes: Vec<u8>,
}

enum Location {
    Loose(usize),
    Zipped { archive: usize, index: usize },
}

const ZIP_SIGNATURE: &[u8] = b"PK\x03\x04";

impl DictionarySource {
    pub fn new(files: Vec<SourceFile>) -> Result<Self, DictionaryError> {
        let mut source = Self {
            loose_files: Vec::new(),
            zip_archives: Vec::new(),
            names: Vec::new(),
            table_layout: None,
        };
        for file in files {
            source.add(file)?;
        }
        Ok(source)
    }

    pub fn single(name: impl Into<String>, bytes: Vec<u8>) -> Result<Self, DictionaryError> {
        Self::new(vec![SourceFile {
            name: name.into(),
            bytes,
        }])
    }

    /// Sets what each column of a table holds, in place of the detected layout.
    /// Formats other than tables ignore it.
    pub fn with_table_layout(mut self, layout: Option<TableLayout>) -> Self {
        self.table_layout = layout;
        self
    }

    pub fn table_layout(&self) -> Option<&TableLayout> {
        self.table_layout.as_ref()
    }

    fn add(&mut self, file: SourceFile) -> Result<(), DictionaryError> {
        if file.bytes.starts_with(ZIP_SIGNATURE) {
            return self.add_zip_archive(file.bytes);
        }
        match unpack_archive(&file)? {
            Some(members) => members
                .into_iter()
                .for_each(|member| self.add_loose_file(member)),
            None => self.add_loose_file(file),
        }
        Ok(())
    }

    fn add_loose_file(&mut self, file: SourceFile) {
        let location = Location::Loose(self.loose_files.len());
        self.names.push((file.name.clone(), location));
        self.loose_files.push(file);
    }

    fn add_zip_archive(&mut self, bytes: Vec<u8>) -> Result<(), DictionaryError> {
        let archive = ZipArchive::new(Cursor::new(bytes))?;
        let archive_index = self.zip_archives.len();
        for (index, name) in archive.file_names().enumerate() {
            if !name.ends_with('/') {
                let location = Location::Zipped {
                    archive: archive_index,
                    index,
                };
                self.names.push((name.to_string(), location));
            }
        }
        self.zip_archives.push(archive);
        Ok(())
    }

    /// Lists the full names of every file, including those inside archives.
    pub fn names(&self) -> impl Iterator<Item = &str> {
        self.names.iter().map(|(name, _)| name.as_str())
    }

    /// Returns the full name of the first file whose name, without its directories, satisfies the predicate.
    pub fn find(&self, predicate: impl Fn(&str) -> bool) -> Option<&str> {
        self.names().find(|name| predicate(file_name(name)))
    }

    /// Opens a file for reading by its full name, decompressing an archive member as it is read.
    pub fn open(&mut self, name: &str) -> Result<Box<dyn Read + '_>, DictionaryError> {
        let location = self
            .names
            .iter()
            .find(|(candidate, _)| candidate == name)
            .map(|(_, location)| location)
            .ok_or_else(|| DictionaryError::MissingFile(name.to_string()))?;
        match *location {
            Location::Loose(index) => Ok(Box::new(self.loose_files[index].bytes.as_slice())),
            Location::Zipped { archive, index } => {
                Ok(Box::new(self.zip_archives[archive].by_index(index)?))
            }
        }
    }

    /// Reads a whole file by its full name.
    pub fn read(&mut self, name: &str) -> Result<Vec<u8>, DictionaryError> {
        let mut bytes = Vec::new();
        self.open(name)?
            .read_to_end(&mut bytes)
            .map_err(|error| DictionaryError::Read(name.to_string(), error))?;
        Ok(bytes)
    }
}

/// Returns the last component of a path within a source.
pub fn file_name(name: &str) -> &str {
    name.rsplit(['/', '\\']).next().unwrap_or(name)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::read_fixture_bytes;

    fn fixture_source() -> DictionarySource {
        DictionarySource::single(
            "sample-yomitan.zip",
            read_fixture_bytes("sample-yomitan.zip"),
        )
        .unwrap()
    }

    #[test]
    fn lists_the_members_of_a_zip_archive() {
        assert!(fixture_source().names().any(|name| name == "index.json"));
    }

    #[test]
    fn lists_the_members_of_a_gzip_compressed_tar_archive() {
        let source = DictionarySource::single(
            "sample-stardict.tar.gz",
            read_fixture_bytes("sample-stardict.tar.gz"),
        )
        .unwrap();
        assert!(
            source
                .names()
                .any(|name| name == "sample-stardict/sample.ifo")
        );
    }

    #[test]
    fn keeps_a_file_that_is_not_an_archive_as_it_is() {
        let source = DictionarySource::single("words.csv", b"cat,neko".to_vec()).unwrap();
        assert_eq!(source.names().collect::<Vec<_>>(), vec!["words.csv"]);
    }

    #[test]
    fn reads_a_loose_file() {
        let mut source = DictionarySource::single("words.csv", b"cat,neko".to_vec()).unwrap();
        assert_eq!(source.read("words.csv").unwrap(), b"cat,neko");
    }

    #[test]
    fn reads_a_zip_member() {
        let mut source = fixture_source();
        assert!(source.read("index.json").unwrap().starts_with(b"{"));
    }

    #[test]
    fn finds_a_file_by_the_last_component_of_its_name() {
        let source = DictionarySource::single("dict/words.csv", b"".to_vec()).unwrap();
        assert_eq!(
            source.find(|name| name == "words.csv"),
            Some("dict/words.csv")
        );
    }

    #[test]
    fn fails_to_read_a_missing_file() {
        assert!(matches!(
            fixture_source().read("missing.json"),
            Err(DictionaryError::MissingFile(_))
        ));
    }
}

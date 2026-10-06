use crate::dictionary::{DictionarySource, file_name};

use super::error::StardictError;
use super::resource_database::ResourceDatabase;

/// The full names of the files that make up one StarDict dictionary within a source.
#[derive(Debug, PartialEq, Eq)]
pub struct StardictFiles {
    pub ifo: String,
    pub idx: String,
    pub dict: String,
    pub syn: Option<String>,
    pub stylesheet: Option<String>,
    /// The prefix of the names of files in the `res/` directory beside the `.ifo`.
    pub resource_prefix: String,
    /// The packed resource database beside the `.ifo`, which StarDict prefers to the `res/` directory.
    pub resource_database: Option<ResourceDatabase>,
}

const IDX_EXTENSIONS: [&str; 3] = [".idx", ".idx.gz", ".idx.dz"];
const DICT_EXTENSIONS: [&str; 3] = [".dict", ".dict.dz", ".dict.gz"];
const SYN_EXTENSIONS: [&str; 3] = [".syn", ".syn.gz", ".syn.dz"];
const RIDX_EXTENSIONS: [&str; 2] = [".ridx", ".ridx.gz"];
const RDIC_EXTENSIONS: [&str; 2] = [".rdic", ".rdic.dz"];

/// Reports whether a file name, without its directories, is that of a StarDict `.ifo` file.
pub fn is_ifo_name(name: &str) -> bool {
    name.ends_with(".ifo")
}

impl StardictFiles {
    /// Finds the first `.ifo` file in the source and the files that share its base name.
    pub fn locate(source: &DictionarySource) -> Result<Self, StardictError> {
        let ifo = source.find(is_ifo_name).ok_or(StardictError::MissingIfo)?;
        let base = ifo.trim_end_matches(".ifo");
        if has_file(source, &format!("{base}.tdx")) {
            return Err(StardictError::TreeDictionary);
        }
        let missing = |kind| StardictError::MissingCompanion {
            ifo: ifo.to_string(),
            kind,
        };
        Ok(Self {
            idx: find_companion(source, base, &IDX_EXTENSIONS)
                .ok_or_else(|| missing("index (.idx)"))?,
            dict: find_companion(source, base, &DICT_EXTENSIONS)
                .ok_or_else(|| missing("data (.dict)"))?,
            syn: find_companion(source, base, &SYN_EXTENSIONS),
            stylesheet: find_companion(source, base, &[".css"]),
            resource_prefix: format!("{}res/", directory_of(ifo)),
            resource_database: find_resource_database(source, directory_of(ifo))?,
            ifo: ifo.to_string(),
        })
    }

    /// Returns the base name of the `.ifo` file, which serves as a title when the dictionary names none.
    pub fn base_name(&self) -> &str {
        file_name(&self.ifo).trim_end_matches(".ifo")
    }
}

/// Finds the files of a resource database in the directory, requiring all three once `res.rifo` is present.
fn find_resource_database(
    source: &DictionarySource,
    directory: &str,
) -> Result<Option<ResourceDatabase>, StardictError> {
    let base = format!("{directory}res");
    let Some(rifo) = find_companion(source, &base, &[".rifo"]) else {
        return Ok(None);
    };
    let missing = |kind| StardictError::MissingCompanion {
        ifo: rifo.clone(),
        kind,
    };
    Ok(Some(ResourceDatabase {
        ridx: find_companion(source, &base, &RIDX_EXTENSIONS)
            .ok_or_else(|| missing("resource index (res.ridx)"))?,
        rdic: find_companion(source, &base, &RDIC_EXTENSIONS)
            .ok_or_else(|| missing("resource data (res.rdic)"))?,
        rifo,
    }))
}

fn find_companion(source: &DictionarySource, base: &str, extensions: &[&str]) -> Option<String> {
    extensions
        .iter()
        .map(|extension| format!("{base}{extension}"))
        .find(|name| has_file(source, name))
}

fn has_file(source: &DictionarySource, name: &str) -> bool {
    source.names().any(|candidate| candidate == name)
}

fn directory_of(name: &str) -> &str {
    &name[..name.len() - file_name(name).len()]
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dictionary::SourceFile;

    fn source(names: &[&str]) -> DictionarySource {
        let files = names
            .iter()
            .map(|name| SourceFile {
                name: name.to_string(),
                bytes: Vec::new(),
            })
            .collect();
        DictionarySource::new(files).unwrap()
    }

    fn locate(names: &[&str]) -> Result<StardictFiles, StardictError> {
        StardictFiles::locate(&source(names))
    }

    #[test]
    fn finds_a_compressed_index_and_dictzip_data() {
        let files = locate(&["d/a.ifo", "d/a.idx.gz", "d/a.dict.dz"]).unwrap();
        assert_eq!(
            (files.idx.as_str(), files.dict.as_str()),
            ("d/a.idx.gz", "d/a.dict.dz")
        );
    }

    #[test]
    fn finds_the_synonym_file() {
        let files = locate(&["a.ifo", "a.idx", "a.dict", "a.syn"]).unwrap();
        assert_eq!(files.syn.as_deref(), Some("a.syn"));
    }

    #[test]
    fn places_the_resources_beside_the_ifo() {
        let files = locate(&["d/a.ifo", "d/a.idx", "d/a.dict"]).unwrap();
        assert_eq!(files.resource_prefix, "d/res/");
    }

    #[test]
    fn names_the_dictionary_after_the_ifo() {
        let files = locate(&["d/a.ifo", "d/a.idx", "d/a.dict"]).unwrap();
        assert_eq!(files.base_name(), "a");
    }

    #[test]
    fn finds_a_resource_database_beside_the_ifo() {
        let names = [
            "d/a.ifo",
            "d/a.idx",
            "d/a.dict",
            "d/res.rifo",
            "d/res.ridx.gz",
            "d/res.rdic.dz",
        ];
        let expected = ResourceDatabase {
            rifo: "d/res.rifo".into(),
            ridx: "d/res.ridx.gz".into(),
            rdic: "d/res.rdic.dz".into(),
        };
        assert_eq!(locate(&names).unwrap().resource_database, Some(expected));
    }

    #[test]
    fn requires_every_file_of_a_resource_database() {
        assert!(matches!(
            locate(&["a.ifo", "a.idx", "a.dict", "res.rifo", "res.ridx"]),
            Err(StardictError::MissingCompanion { .. })
        ));
    }

    #[test]
    fn requires_an_index() {
        assert!(matches!(
            locate(&["a.ifo", "a.dict"]),
            Err(StardictError::MissingCompanion { .. })
        ));
    }

    #[test]
    fn rejects_a_tree_dictionary() {
        assert!(matches!(
            locate(&["a.ifo", "a.tdx", "a.dict"]),
            Err(StardictError::TreeDictionary)
        ));
    }
}

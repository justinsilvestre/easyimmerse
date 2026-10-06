use crate::dictionary::{DictionarySource, SourceFile};

/// Builds a source of loose files from names and text contents.
pub fn source_of(files: &[(&str, &str)]) -> DictionarySource {
    let files = files
        .iter()
        .map(|(name, text)| SourceFile {
            name: name.to_string(),
            bytes: text.as_bytes().to_vec(),
        })
        .collect();
    DictionarySource::new(files).expect("loose files always form a source")
}

use thiserror::Error;

#[derive(Debug, Error)]
pub enum DictionaryError {
    #[error("could not open the dictionary archive: {0}")]
    Archive(#[from] zip::result::ZipError),
    #[error("no registered dictionary format recognizes the archive")]
    UnrecognizedFormat,
    #[error("the entry {name:?} is not valid JSON: {source}")]
    Json {
        name: String,
        source: serde_json::Error,
    },
    #[error("unsupported Yomitan dictionary format version {0}")]
    UnsupportedVersion(u32),
}

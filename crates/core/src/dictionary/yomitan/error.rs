use thiserror::Error;

#[derive(Debug, Error)]
pub enum YomitanError {
    #[error("the file {name:?} is not valid JSON: {source}")]
    Json {
        name: String,
        source: serde_json::Error,
    },
    #[error("the dictionary index states no format version")]
    MissingVersion,
    #[error("unsupported Yomitan dictionary format version {0}")]
    UnsupportedVersion(u32),
    #[error("row {row} of {name:?} is malformed")]
    MalformedRow { name: String, row: usize },
}

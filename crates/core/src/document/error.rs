use thiserror::Error;

#[derive(Debug, Error)]
pub enum DocumentError {
    #[error("the text is not valid UTF-8")]
    InvalidUtf8,
    #[error("could not open the EPUB archive: {0}")]
    Archive(#[from] zip::result::ZipError),
    #[error("the EPUB archive has no entry {0:?}")]
    MissingEntry(String),
    #[error("could not read the EPUB entry {name:?}: {source}")]
    UnreadableEntry {
        name: String,
        source: std::io::Error,
    },
    #[error("invalid XML: {0}")]
    Xml(#[from] roxmltree::Error),
    #[error("META-INF/container.xml names no rootfile")]
    MissingRootfile,
    #[error("the spine references an unknown manifest item {0:?}")]
    UnknownSpineItem(String),
}

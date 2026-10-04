use std::io;

use thiserror::Error;

#[derive(Debug, Error)]
pub enum StardictError {
    #[error("the dictionary has no StarDict .ifo file")]
    MissingIfo,
    #[error("the .ifo file does not begin with the StarDict header")]
    NotAnIfo,
    #[error("StarDict tree dictionaries (.tdx) are not supported")]
    TreeDictionary,
    #[error("StarDict version {0:?} is not supported")]
    UnsupportedVersion(String),
    #[error("StarDict dictionaries of type {0:?} are not supported")]
    UnsupportedDictType(String),
    #[error("idxoffsetbits must be 32 or 64, not {0:?}")]
    InvalidOffsetBits(String),
    #[error("the dictionary has no {kind} file to go with {ifo:?}")]
    MissingCompanion { ifo: String, kind: &'static str },
    #[error("could not decompress {name:?}: {source}")]
    Decompress { name: String, source: io::Error },
    #[error("the file {0:?} is truncated or malformed")]
    MalformedFile(String),
    #[error("the entry for {0:?} lies outside the data file")]
    EntryOutOfBounds(String),
    #[error("the entry for {0:?} is truncated")]
    MalformedEntry(String),
}

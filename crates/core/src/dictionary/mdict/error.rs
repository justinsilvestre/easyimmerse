use thiserror::Error;

#[derive(Debug, Error)]
pub enum MdictError {
    #[error("the {0} ends before it is complete")]
    Truncated(&'static str),
    #[error("could not read the MDict file: {0}")]
    Read(std::io::Error),
    #[error("the {0} does not match its checksum")]
    Checksum(&'static str),
    #[error("the {0} is malformed")]
    Malformed(&'static str),
    #[error("the header does not state an MDict format version")]
    MissingVersion,
    #[error("MDict format version {0} is not supported; versions 1.2 and 2.0 are")]
    UnsupportedVersion(String),
    #[error("the dictionary is locked to a registration code, which easyImmerse cannot use yet")]
    RegistrationRequired,
    #[error("the text encoding {0:?} is unknown")]
    UnknownEncoding(String),
    #[error("the block compression method {0} is unknown")]
    UnknownCompression(u8),
    #[error("a block could not be decompressed: {0}")]
    Decompression(String),
    #[error("a block holds {actual} bytes after decompression instead of {expected}")]
    BlockSize { expected: u64, actual: u64 },
    #[error("a block claims {0} bytes, more than a dictionary block can hold")]
    BlockTooLarge(u64),
}

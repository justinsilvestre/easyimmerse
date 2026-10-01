use thiserror::Error;

#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum Fmp4Error {
    #[error("the {0} box is shorter than its header or its fields require")]
    TruncatedBox(String),
    #[error("the data has no {0} box")]
    MissingBox(String),
}

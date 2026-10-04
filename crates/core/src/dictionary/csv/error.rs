use thiserror::Error;

#[derive(Debug, Error)]
pub enum CsvError {
    #[error("the dictionary has no CSV, TSV or text file")]
    NoTableFile,
    #[error("{0:?} does not look like a table with a term and a definition on each row")]
    NotTabular(String),
    #[error("none of the named columns holds the term")]
    NoTermColumn,
    #[error("could not read a row of the table: {0}")]
    Row(#[from] csv::Error),
}

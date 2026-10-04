use thiserror::Error;

use super::archive::ArchiveError;
use super::csv::CsvError;
use super::mdict::MdictError;
use super::sink::SinkError;
use super::stardict::StardictError;
use super::yomitan::YomitanError;

#[derive(Debug, Error)]
pub enum DictionaryError {
    #[error("could not open the dictionary archive: {0}")]
    Archive(#[from] zip::result::ZipError),
    #[error(transparent)]
    Unpack(#[from] ArchiveError),
    #[error("the dictionary has no file named {0:?}")]
    MissingFile(String),
    #[error("could not read {0:?} from the dictionary: {1}")]
    Read(String, std::io::Error),
    #[error("no supported dictionary format recognizes these files")]
    UnrecognizedFormat,
    #[error("could not store the dictionary: {0}")]
    Sink(#[from] SinkError),
    #[error(transparent)]
    Yomitan(#[from] YomitanError),
    #[error(transparent)]
    Csv(#[from] CsvError),
    #[error(transparent)]
    Stardict(#[from] StardictError),
    #[error(transparent)]
    Mdict(#[from] MdictError),
}

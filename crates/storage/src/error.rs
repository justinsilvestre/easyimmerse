use easyimmerse_core::dictionary::{DictionaryError, SinkError};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum StorageError {
    #[error("database error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("could not migrate the database: {0}")]
    Migration(#[from] rusqlite_migration::Error),
    #[error("stored JSON is malformed: {0}")]
    Json(#[from] serde_json::Error),
    #[error("could not compress or decompress stored data: {0}")]
    Compression(#[from] std::io::Error),
    #[error("the database lock was poisoned by a panic")]
    LockPoisoned,
    /// The dictionary files could not be read.
    #[error(transparent)]
    Dictionary(DictionaryError),
    #[error("the dictionary format sent content before its metadata")]
    ImportOutOfOrder,
    #[error("“{0}” is already in your dictionaries. Remove it first to import it again.")]
    DictionaryAlreadyImported(String),
    #[error("no dictionary has the id {0:?}")]
    DictionaryNotFound(String),
    #[error("the dictionary {dictionary_id:?} has no file at {path:?}")]
    DictionaryMediaNotFound { dictionary_id: String, path: String },
    #[error("no project has the id {0:?}")]
    ProjectNotFound(String),
    #[error("no media file has the id {0:?}")]
    MediaFileNotFound(String),
    #[error("no flashcard has the id {0:?}")]
    FlashcardNotFound(String),
    #[error("the flashcard id {0:?} belongs to another project")]
    FlashcardIdTaken(String),
    #[error("no subtitle track has the id {0:?}")]
    SubtitleTrackNotFound(String),
    #[error("no alignment has the id {0:?}")]
    AlignmentNotFound(String),
    #[error("the media file {0:?} cannot be aligned or paired with itself")]
    PairedWithItself(String),
    #[error("an account already has the email address {0:?}")]
    EmailTaken(String),
    #[error("no account has the id {0:?}")]
    UserNotFound(String),
    #[error("no session of the account has the id {0:?}")]
    SessionNotFound(String),
    #[error("the account {0:?} is the last administrator, and the server must keep one")]
    LastAdministrator(String),
    #[error("the project has no review answer with the id {0:?}")]
    ReviewAnswerNotFound(String),
    #[error(
        "the review answer {0:?} is not the project's latest, and only the latest can be undone"
    )]
    ReviewAnswerNotLatest(String),
    #[error(transparent)]
    Scheduling(#[from] easyimmerse_srs::SrsError),
    #[error("the table {0:?} does not sync")]
    UnknownSyncTable(String),
    #[error("a synced row of {table} lacks the column {column}")]
    SyncColumnMissing { table: String, column: String },
    #[error("a synced row of {table} holds a list or an object in the column {column}")]
    SyncValueUnsupported { table: String, column: String },
    #[error("the owner is not linked to that remote")]
    RemoteNotLinked,
    #[error("this device is already linked to a server; unlink it first")]
    AlreadyLinked,
}

impl From<DictionaryError> for StorageError {
    /// Recovers a storage error that the importer passed back through the format as a sink error.
    fn from(error: DictionaryError) -> Self {
        match error {
            DictionaryError::Sink(SinkError(inner)) => match inner.downcast::<StorageError>() {
                Ok(storage_error) => *storage_error,
                Err(other) => Self::Dictionary(DictionaryError::Sink(SinkError(other))),
            },
            other => Self::Dictionary(other),
        }
    }
}

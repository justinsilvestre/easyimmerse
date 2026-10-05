use thiserror::Error;

#[derive(Debug, Error)]
pub enum StorageError {
    #[error("database error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("could not migrate the database: {0}")]
    Migration(#[from] rusqlite_migration::Error),
    #[error("stored JSON is malformed: {0}")]
    Json(#[from] serde_json::Error),
    #[error("the database lock was poisoned by a panic")]
    LockPoisoned,
    #[error("no dictionary has the id {0:?}")]
    DictionaryNotFound(String),
    #[error("no project has the id {0:?}")]
    ProjectNotFound(String),
    #[error("no media file has the id {0:?}")]
    MediaFileNotFound(String),
    #[error("no flashcard has the id {0:?}")]
    FlashcardNotFound(String),
    #[error("no subtitle track has the id {0:?}")]
    SubtitleTrackNotFound(String),
}

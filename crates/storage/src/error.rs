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
    #[error("the project has no media file with the id {0:?}")]
    MediaNotFound(String),
    #[error("the project has no flashcard with the id {0:?}")]
    FlashcardNotFound(String),
    #[error("the media file has no subtitle track with the id {0:?}")]
    SubtitleTrackNotFound(String),
}

/// Turns a statement that changed no rows into the given not-found error.
pub fn require_changed_row(changed: usize, missing: StorageError) -> Result<(), StorageError> {
    if changed == 0 { Err(missing) } else { Ok(()) }
}

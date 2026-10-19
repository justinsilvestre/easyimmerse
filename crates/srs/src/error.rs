use thiserror::Error;

#[derive(Debug, Error)]
pub enum SrsError {
    #[error("FSRS could not schedule the card: {0}")]
    Fsrs(#[from] fsrs::FSRSError),
}

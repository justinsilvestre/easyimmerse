//! Writing a request body to a file as it arrives, so that a large upload never sits in memory whole.

use std::fs::File;
use std::io::{self, Seek, SeekFrom, Write};

use axum::body::{Body, Bytes};
use futures_util::StreamExt;
use tokio::sync::mpsc;

/// Why a body did not reach its file.
#[derive(Debug)]
pub enum BodyFileError {
    /// The body broke off, or was larger than the router allows.
    Body(String),
    /// The body was larger than the most this upload may take.
    TooLarge,
    Io(io::Error),
}

/// Writes the body into the file, at most `limit` bytes when a limit is given, and returns the file rewound
/// to its start with the number of bytes written. The file is written on the blocking pool.
pub async fn write_body_to_file(
    body: Body,
    file: File,
    limit: Option<u64>,
) -> Result<(File, u64), BodyFileError> {
    let (sender, receiver) = mpsc::channel::<Bytes>(8);
    let writer = tokio::task::spawn_blocking(move || write_chunks(file, receiver, limit));
    let mut stream = body.into_data_stream();
    let mut failure = None;
    while let Some(chunk) = stream.next().await {
        match chunk {
            Ok(chunk) => {
                if sender.send(chunk).await.is_err() {
                    break;
                }
            }
            Err(error) => {
                failure = Some(BodyFileError::Body(error.to_string()));
                break;
            }
        }
    }
    drop(sender);
    let written = writer
        .await
        .map_err(|error| BodyFileError::Io(io::Error::other(error)))?;
    match failure {
        Some(failure) => Err(failure),
        None => written,
    }
}

fn write_chunks(
    mut file: File,
    mut receiver: mpsc::Receiver<Bytes>,
    limit: Option<u64>,
) -> Result<(File, u64), BodyFileError> {
    let mut written: u64 = 0;
    while let Some(chunk) = receiver.blocking_recv() {
        written += chunk.len() as u64;
        if limit.is_some_and(|limit| written > limit) {
            return Err(BodyFileError::TooLarge);
        }
        file.write_all(&chunk).map_err(BodyFileError::Io)?;
    }
    file.flush().map_err(BodyFileError::Io)?;
    file.seek(SeekFrom::Start(0)).map_err(BodyFileError::Io)?;
    Ok((file, written))
}

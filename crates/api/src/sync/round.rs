//! One round of syncing: pull, dictionary uploads, push, media uploads.

use easyimmerse_storage::{StorageError, StoredRemote};

use super::SyncEngine;
use super::dictionary_transfer::{fetch_dictionaries, upload_dictionaries};
use super::media_transfer::{remove_stored_copies, upload_media};
use super::pull::pull;
use super::push::push;
use super::remote_client::{RemoteClient, RemoteError};

/// Why a round stopped. Every step can be repeated, so the next round starts over safely.
#[derive(Debug)]
pub enum RoundError {
    Remote(RemoteError),
    Storage(StorageError),
    /// A file this server needed for a transfer could not be written or read.
    Local(std::io::Error),
    /// The remote refused to keep a media copy, for lack of room. Everything else of the round went through.
    MediaRefused(RemoteError),
}

impl From<RemoteError> for RoundError {
    fn from(error: RemoteError) -> Self {
        RoundError::Remote(error)
    }
}

impl From<StorageError> for RoundError {
    fn from(error: StorageError) -> Self {
        RoundError::Storage(error)
    }
}

impl RoundError {
    /// The code and message that a failed link reports.
    pub fn code_and_message(&self) -> (String, String) {
        match self {
            RoundError::Remote(RemoteError::Refused { code, message, .. }) => {
                (code.clone(), message.clone())
            }
            RoundError::Remote(RemoteError::Protocol(message)) => {
                ("remote_protocol".to_string(), message.clone())
            }
            RoundError::Remote(RemoteError::Unreachable(message)) => {
                ("remote_unreachable".to_string(), message.clone())
            }
            RoundError::Remote(RemoteError::LoggedOut) => (
                "remote_logged_out".to_string(),
                "the remote ended this device's session".to_string(),
            ),
            RoundError::Storage(error) => ("storage".to_string(), error.to_string()),
            RoundError::Local(error) => ("local_file".to_string(), error.to_string()),
            RoundError::MediaRefused(error) => RoundError::Remote(error.clone()).code_and_message(),
        }
    }
}

/// Runs one round with the remote, blocking. The writer lock is taken only between requests, never across one.
pub fn run_round(engine: &SyncEngine, remote: &StoredRemote) -> Result<(), RoundError> {
    let client = RemoteClient::new(&remote.server_url, remote.session_token.clone());
    let pulled = pull(engine, &client, remote)?;
    remove_stored_copies(engine);
    fetch_dictionaries(engine, &client, remote, &pulled.dictionaries_to_fetch)?;
    upload_dictionaries(engine, &client, remote)?;
    push(engine, &client, remote)?;
    upload_media(engine, &client, remote)?;
    Ok(())
}

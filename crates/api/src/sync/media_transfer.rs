//! Moving media bytes to the remote for the media files whose person chose to keep a copy there.

use easyimmerse_storage::StoredRemote;

use super::SyncEngine;
use super::remote_client::RemoteClient;
use super::round::RoundError;

/// Uploads each chosen media file that the remote holds no copy of, reporting progress as the link's transfer.
/// Not done yet.
pub fn upload_media(
    _engine: &SyncEngine,
    _client: &RemoteClient,
    _remote: &StoredRemote,
) -> Result<(), RoundError> {
    Ok(())
}

/// Removes the files of stored media copies that a pull made unnecessary. This server keeps no copies yet.
pub fn remove_stored_copies(_file_names: &[String]) {}

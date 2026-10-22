//! Moving whole dictionaries between this server and the remote, since their content tables do not sync row by row.

use easyimmerse_storage::{PulledRow, StoredRemote};

use super::SyncEngine;
use super::remote_client::RemoteClient;
use super::round::RoundError;

/// Downloads the content of each pulled dictionary that this server lacks, imports it under the same id,
/// and settles its inbox row. Not done yet: the rows stay in the inbox, so nothing is lost meanwhile.
pub fn fetch_dictionaries(
    _engine: &SyncEngine,
    _client: &RemoteClient,
    _remote: &StoredRemote,
    _dictionaries: &[PulledRow],
) -> Result<(), RoundError> {
    Ok(())
}

/// Uploads the content of each local dictionary that the remote has no copy of, before the push sends its row.
/// Not done yet: the push sends the dictionary's row alone.
pub fn upload_dictionaries(
    _engine: &SyncEngine,
    _client: &RemoteClient,
    _remote: &StoredRemote,
) -> Result<(), RoundError> {
    Ok(())
}

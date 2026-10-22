//! Moving whole dictionaries between this server and the remote, since their content tables do not sync row by row.

use std::io::{self, BufReader, Seek, SeekFrom};

use easyimmerse_storage::{PulledRow, StorageError, StoredRemote, SyncTable};

use super::SyncEngine;
use super::remote_client::{RemoteClient, RemoteError};
use super::remote_transfers::DictionaryUpload;
use super::round::RoundError;
use crate::dictionary_dumps::{DumpChunks, DumpFeed, DumpImportError, DumpReader};

/// Downloads the content of each pulled dictionary that this server lacks, imports it under the same id,
/// and settles its inbox row. A dictionary that cannot be fetched now stays in the inbox for the next round.
pub fn fetch_dictionaries(
    engine: &SyncEngine,
    client: &RemoteClient,
    remote: &StoredRemote,
    dictionaries: &[PulledRow],
) -> Result<(), RoundError> {
    let mut is_any_stored = false;
    for row in dictionaries {
        is_any_stored |= fetch_dictionary(engine, client, remote, row)?;
    }
    if is_any_stored {
        engine.note_pulled_rows();
    }
    Ok(())
}

/// Fetches and stores one dictionary, and tells whether it was stored.
fn fetch_dictionary(
    engine: &SyncEngine,
    client: &RemoteClient,
    remote: &StoredRemote,
    row: &PulledRow,
) -> Result<bool, RoundError> {
    let mut download = match client.download_dictionary(&row.key) {
        Ok(download) => download,
        // The remote deleted it meanwhile; its tombstone arrives with the next pull.
        Err(RemoteError::Refused { status: 404, .. }) => return Ok(false),
        Err(error) => return Err(error.into()),
    };
    // The dump is kept in a file first, so that the import holds the writer only while it stores the rows.
    let mut file = tempfile::tempfile().map_err(RoundError::Local)?;
    io::copy(&mut download, &mut file)
        .map_err(|error| RoundError::Remote(RemoteError::Unreachable(error.to_string())))?;
    file.seek(SeekFrom::Start(0)).map_err(RoundError::Local)?;
    let stored = DumpFeed::open(BufReader::new(file)).and_then(|mut feed| {
        let imported_at = feed.imported_at;
        let stored = engine
            .storage
            .store_pulled_dictionary(remote, row, imported_at, |sink| feed.feed(sink));
        feed.finish(stored)
    });
    match stored {
        Ok(()) => Ok(true),
        // The person imported the same dictionary here under another id; that copy is kept.
        Err(DumpImportError::Storage(
            StorageError::DictionaryAlreadyImported(_) | StorageError::DictionaryExists(_),
        )) => {
            engine.storage.settle_pulled_dictionary(remote, row)?;
            Ok(false)
        }
        Err(DumpImportError::BadDump(message)) => {
            tracing::warn!(
                "the remote's dictionary {} is not a whole dump: {message}",
                row.key
            );
            Ok(false)
        }
        Err(DumpImportError::Storage(error)) => Err(error.into()),
    }
}

/// Uploads the content of each local dictionary that the remote has no copy of, before the push sends its row.
/// Once the remote holds it, this server records the remote's time, so the push leaves the row out as already there.
pub fn upload_dictionaries(
    engine: &SyncEngine,
    client: &RemoteClient,
    remote: &StoredRemote,
) -> Result<(), RoundError> {
    let owner = &remote.owner_id;
    for (id, updated_at_ms) in engine.storage.dictionaries_to_upload(owner, &remote.id)? {
        let chunks = match DumpChunks::start(engine.storage.clone(), owner, &id) {
            Ok(chunks) => chunks,
            Err(StorageError::DictionaryNotFound(_)) => continue,
            Err(error) => return Err(error.into()),
        };
        match client.upload_dictionary(&id.0, DumpReader::new(chunks))? {
            DictionaryUpload::Stored { updated_at_ms } => {
                engine
                    .storage
                    .record_uploaded_dictionary(owner, &remote.id, &id, updated_at_ms)?;
            }
            DictionaryUpload::AlreadyThere => {
                engine.storage.record_sync_base(
                    &remote.id,
                    SyncTable::Dictionaries,
                    &id.0,
                    updated_at_ms,
                )?;
            }
        }
    }
    Ok(())
}

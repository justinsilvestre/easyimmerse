//! Moving media bytes between this server and the remote: uploads of the media files whose person chose to keep
//! a copy there, and, on request, downloads of the remote's copy to this device.

use std::fs::File;
use std::io::{self, Read};
use std::path::{Path, PathBuf};

use easyimmerse_core::media_copy::StoredCopy;
use easyimmerse_core::media_file::{MediaFile, MediaFileSource};
use easyimmerse_core::sync::MediaTransfer;
use easyimmerse_storage::{NewMediaCopy, Storage, StorageError, StoredRemote};

use super::SyncEngine;
use super::remote_client::{RemoteClient, RemoteError};
use super::round::RoundError;
use crate::media_copy_files::release_copy_files;
use crate::now_ms::now_ms;

/// Uploads each chosen media file that the remote holds no copy of and whose bytes this server can read,
/// reporting progress as the link's transfer. A file the remote refuses for lack of room is left for a later round,
/// and the round then ends as failed with `quota_exceeded`, once every other file has had its turn.
pub fn upload_media(
    engine: &SyncEngine,
    client: &RemoteClient,
    remote: &StoredRemote,
) -> Result<(), RoundError> {
    let media_files = engine
        .storage
        .list_media_files_to_upload(&remote.owner_id, &remote.id)?;
    let mut refusal = None;
    for media_file in media_files {
        let Some(path) = readable_bytes(engine, &media_file)? else {
            continue;
        };
        let uploaded = upload_one(engine, client, &media_file, &path);
        engine.set_transfer(None);
        match uploaded {
            Ok(size_bytes) => {
                engine
                    .storage
                    .record_remote_copy(&remote.id, &media_file.id, size_bytes)?;
            }
            Err(RoundError::Remote(
                error @ RemoteError::Refused {
                    status: 413 | 404, ..
                },
            )) => {
                // A 404 means the media file has not reached the remote yet; the next round tries again.
                if let RemoteError::Refused { status: 413, .. } = error {
                    refusal = Some(error);
                }
            }
            Err(error) => return Err(error),
        }
    }
    match refusal {
        Some(error) => Err(RoundError::MediaRefused(error)),
        None => Ok(()),
    }
}

fn upload_one(
    engine: &SyncEngine,
    client: &RemoteClient,
    media_file: &MediaFile,
    path: &Path,
) -> Result<u64, RoundError> {
    let file = File::open(path).map_err(RoundError::Local)?;
    let total_bytes = file.metadata().map_err(RoundError::Local)?.len();
    engine.set_transfer(Some(MediaTransfer {
        media_file_id: media_file.id.clone(),
        name: media_file.name.clone(),
        sent_bytes: 0,
        total_bytes,
    }));
    let mut reader = ProgressReader { file, engine };
    let project_id = &media_file.project_id.0;
    client.upload_stored_copy(project_id, &media_file.id.0, &mut reader, total_bytes)?;
    Ok(total_bytes)
}

/// The file holding the media file's bytes here: its source path when that exists, else this server's own copy.
fn readable_bytes(
    engine: &SyncEngine,
    media_file: &MediaFile,
) -> Result<Option<PathBuf>, RoundError> {
    if let MediaFileSource::Path { path } = &media_file.source
        && Path::new(path).is_file()
    {
        return Ok(Some(PathBuf::from(path)));
    }
    let Some(dir) = &engine.uploads_dir else {
        return Ok(None);
    };
    let copy = engine.storage.get_media_copy(&media_file.id)?;
    Ok(copy
        .map(|copy| dir.join(copy.file_name))
        .filter(|path| path.is_file()))
}

/// Reads a file to upload and counts what it has read as sent.
struct ProgressReader<'a> {
    file: File,
    engine: &'a SyncEngine,
}

impl Read for ProgressReader<'_> {
    fn read(&mut self, buffer: &mut [u8]) -> io::Result<usize> {
        let count = self.file.read(buffer)?;
        self.engine.add_sent_bytes(count as u64);
        Ok(count)
    }
}

/// Deletes the files of the copies that a pull made unnecessary, such as those whose choice was turned off elsewhere.
pub fn remove_stored_copies(engine: &SyncEngine) {
    if let Some(dir) = &engine.uploads_dir {
        release_copy_files(&engine.storage, dir);
    }
}

/// Why a stored copy could not be fetched from the remote.
#[derive(Debug)]
pub enum FetchError {
    /// The remote logged this device out earlier.
    NoToken,
    /// The remote keeps no copy of the media file.
    NoCopy,
    Remote(RemoteError),
    Storage(StorageError),
    Local(io::Error),
}

/// Downloads the remote's copy of the media file into `dir` under `file_name`, and records it as this server's copy.
pub fn fetch_stored_copy(
    storage: &Storage,
    remote: &StoredRemote,
    media_file: &MediaFile,
    dir: &Path,
    file_name: &str,
) -> Result<StoredCopy, FetchError> {
    let token = remote.session_token.clone().ok_or(FetchError::NoToken)?;
    let client = RemoteClient::new(&remote.server_url, Some(token));
    let project_id = &media_file.project_id.0;
    let mut download = match client.download_stored_copy(project_id, &media_file.id.0) {
        Ok(download) => download,
        Err(RemoteError::Refused { status: 404, .. }) => return Err(FetchError::NoCopy),
        Err(RemoteError::LoggedOut) => {
            storage
                .forget_sync_session_token(&remote.id)
                .map_err(FetchError::Storage)?;
            return Err(FetchError::Remote(RemoteError::LoggedOut));
        }
        Err(error) => return Err(FetchError::Remote(error)),
    };
    let path = dir.join(file_name);
    let stored = write_download(&mut download, &path).and_then(|size_bytes| {
        let copy = NewMediaCopy {
            media_file_id: media_file.id.clone(),
            file_name: file_name.to_string(),
            size_bytes,
            stored_at_ms: now_ms(),
            quota_bytes: None,
        };
        storage
            .record_media_copy(&copy)
            .map_err(FetchError::Storage)
    });
    if stored.is_err() {
        let _ = std::fs::remove_file(&path);
    }
    stored
}

fn write_download(download: &mut impl Read, path: &Path) -> Result<u64, FetchError> {
    let mut file = File::create(path).map_err(FetchError::Local)?;
    io::copy(download, &mut file)
        .map_err(|error| FetchError::Remote(RemoteError::Unreachable(error.to_string())))
}

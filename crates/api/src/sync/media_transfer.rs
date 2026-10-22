//! Moving media bytes between this server and the remote: uploads of the media files whose person chose to keep
//! a copy there, and, on request, downloads of the remote's copy to this device.

use std::fs::File;
use std::io::{self, Read};
use std::path::{Path, PathBuf};

use easyimmerse_core::media_copy::{StorageStatus, StoredCopy};
use easyimmerse_core::media_file::{MediaFile, MediaFileSource};
use easyimmerse_core::sync::{MediaTransfer, RefusedUpload};
use easyimmerse_storage::{NewMediaCopy, Storage, StorageError, StoredRemote};

use super::SyncEngine;
use super::remote_client::{RemoteClient, RemoteError};
use super::round::RoundError;
use crate::media_copy_files::release_copy_files;
use crate::now_ms::now_ms;

/// Uploads each chosen media file that the remote holds no copy of and whose bytes this server can read,
/// reporting progress as the link's transfer. A file the remote has no room for or will not keep is skipped,
/// and the first such file is reported as the link's refused upload, so that it never holds back the rest of the round.
pub fn upload_media(
    engine: &SyncEngine,
    client: &RemoteClient,
    remote: &StoredRemote,
) -> Result<(), RoundError> {
    let mut refusal = None;
    let uploaded = upload_each(engine, client, remote, &mut refusal);
    engine.set_refused_upload(refusal);
    uploaded
}

fn upload_each(
    engine: &SyncEngine,
    client: &RemoteClient,
    remote: &StoredRemote,
    refusal: &mut Option<RefusedUpload>,
) -> Result<(), RoundError> {
    let media_files = engine
        .storage
        .list_media_files_to_upload(&remote.owner_id, &remote.id)?;
    if media_files.is_empty() {
        return Ok(());
    }
    let mut room = Room::of(&client.storage_status()?);
    for media_file in media_files {
        let Some(path) = readable_bytes(engine, &media_file)? else {
            continue;
        };
        let size_bytes = std::fs::metadata(&path).map_err(RoundError::Local)?.len();
        if let Some((code, message)) = room.refusal_of(size_bytes) {
            refusal.get_or_insert_with(|| refused(&media_file, code, message));
            continue;
        }
        let uploaded = upload_one(engine, client, &media_file, &path);
        engine.set_transfer(None);
        match uploaded {
            Ok(size_bytes) => {
                engine
                    .storage
                    .record_remote_copy(&remote.id, &media_file.id, size_bytes)?;
                room.take(size_bytes);
            }
            // A 404 means the media file has not reached the remote yet; the next round tries again.
            Err(RoundError::Remote(RemoteError::Refused { status: 404, .. })) => {}
            Err(RoundError::Remote(RemoteError::Refused {
                status: 400..500,
                code,
                message,
                ..
            })) => {
                refusal.get_or_insert_with(|| refused(&media_file, code, message));
            }
            Err(error) => return Err(error),
        }
    }
    Ok(())
}

fn refused(media_file: &MediaFile, code: String, message: String) -> RefusedUpload {
    RefusedUpload {
        media_file_id: media_file.id.clone(),
        name: media_file.name.clone(),
        code,
        message,
    }
}

/// How many more bytes of copies the remote will keep for the account.
#[derive(Debug, PartialEq)]
enum Room {
    Unlimited,
    Left(u64),
    /// The account's quota is zero, as on a remote without an uploads directory.
    NoCopies,
}

impl Room {
    fn of(status: &StorageStatus) -> Self {
        match status.quota_bytes {
            None => Room::Unlimited,
            Some(0) => Room::NoCopies,
            Some(quota) => Room::Left(quota.saturating_sub(status.used_bytes)),
        }
    }

    /// The code and message of a refusal to keep a copy of this size, or None when it fits.
    fn refusal_of(&self, size_bytes: u64) -> Option<(String, String)> {
        match self {
            Room::NoCopies => Some((
                "uploads_unavailable".to_string(),
                "the remote keeps no copies of media files for this account".to_string(),
            )),
            Room::Left(room) if size_bytes > *room => Some((
                "quota_exceeded".to_string(),
                format!("the copy takes {size_bytes} bytes, and only {room} bytes are free"),
            )),
            _ => None,
        }
    }

    fn take(&mut self, size_bytes: u64) {
        if let Room::Left(room) = self {
            *room = room.saturating_sub(size_bytes);
        }
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

#[cfg(test)]
mod tests {
    use super::*;

    fn status(quota_bytes: Option<u64>, used_bytes: u64) -> StorageStatus {
        StorageStatus {
            quota_bytes,
            used_bytes,
            copies: Vec::new(),
        }
    }

    fn code_of_refusal(room: &Room, size_bytes: u64) -> Option<String> {
        room.refusal_of(size_bytes).map(|(code, _)| code)
    }

    #[test]
    fn the_room_is_the_quota_less_what_copies_take() {
        assert_eq!(Room::of(&status(Some(100), 30)), Room::Left(70));
    }

    #[test]
    fn the_room_is_unlimited_without_a_quota() {
        assert_eq!(Room::of(&status(None, 30)), Room::Unlimited);
    }

    #[test]
    fn the_room_is_empty_when_copies_take_more_than_the_quota() {
        assert_eq!(Room::of(&status(Some(100), 130)), Room::Left(0));
    }

    #[test]
    fn a_quota_of_zero_means_the_remote_keeps_no_copies() {
        assert_eq!(Room::of(&status(Some(0), 0)), Room::NoCopies);
    }

    #[test]
    fn a_copy_that_fills_the_room_exactly_fits() {
        assert_eq!(code_of_refusal(&Room::Left(70), 70), None);
    }

    #[test]
    fn a_copy_larger_than_the_room_is_refused_for_lack_of_room() {
        assert_eq!(
            code_of_refusal(&Room::Left(70), 71).as_deref(),
            Some("quota_exceeded")
        );
    }

    #[test]
    fn any_copy_fits_without_a_quota() {
        assert_eq!(code_of_refusal(&Room::Unlimited, u64::MAX), None);
    }

    #[test]
    fn every_copy_is_refused_where_the_remote_keeps_none() {
        assert_eq!(
            code_of_refusal(&Room::NoCopies, 1).as_deref(),
            Some("uploads_unavailable")
        );
    }

    #[test]
    fn an_upload_takes_its_size_from_the_room() {
        let mut room = Room::Left(70);
        room.take(30);
        assert_eq!(room, Room::Left(40));
    }
}

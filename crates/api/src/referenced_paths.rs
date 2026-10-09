//! The local files that media files and subtitle tracks still point at, which must survive
//! any cleanup of the files a media-source plugin fetched.

use std::path::{Path, PathBuf};

use easyimmerse_storage::{Storage, StorageError};

/// Every local path that a media file or a subtitle track names.
/// Call it in the same storage operation as the removal that precedes a cleanup.
pub(crate) fn list_referenced_paths(storage: &Storage) -> Result<Vec<String>, StorageError> {
    let mut paths = storage.list_referenced_source_paths()?;
    paths.extend(storage.list_subtitle_source_paths()?);
    Ok(paths)
}

/// The canonical forms of `paths`, without the paths that no longer exist.
/// Comparing canonical forms catches two spellings of the same file.
pub(crate) fn canonicalize_paths(paths: &[String]) -> Vec<PathBuf> {
    paths
        .iter()
        .filter_map(|path| Path::new(path).canonicalize().ok())
        .collect()
}

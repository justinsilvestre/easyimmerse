//! Removing cache files in two steps: a quick rename out of the cache, then the slow deletion.

use std::io::ErrorKind;
use std::path::{Path, PathBuf};

use crate::cache_disk::remove_path;
use crate::key::ConversionKey;

const TRASH_DIR: &str = "conversions-trash";

/// Paths to remove together, all inside the entry named by `key` when it has one.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Removal {
    pub key: Option<ConversionKey>,
    pub paths: Vec<PathBuf>,
}

/// A directory beside the cache entries that receives files before they are deleted.
/// Moving a path into it is a single rename, so it can happen while other work waits.
pub struct CacheTrash {
    dir: PathBuf,
    moved: u64,
}

impl CacheTrash {
    /// Creates an empty trash directory in `cache_dir`, deleting anything an earlier removal left there.
    pub fn open(cache_dir: &Path) -> std::io::Result<Self> {
        let dir = cache_dir.join(TRASH_DIR);
        remove_path(&dir)?;
        std::fs::create_dir_all(&dir)?;
        Ok(CacheTrash { dir, moved: 0 })
    }

    /// Moves a file or directory into the trash. Does nothing when the path does not exist.
    pub fn move_in(&mut self, path: &Path) -> std::io::Result<()> {
        self.moved += 1;
        match std::fs::rename(path, self.dir.join(self.moved.to_string())) {
            Err(error) if error.kind() != ErrorKind::NotFound => Err(error),
            _ => Ok(()),
        }
    }

    /// Deletes everything moved into the trash.
    pub fn empty(self) -> std::io::Result<()> {
        remove_path(&self.dir)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn moves_a_directory_out_of_its_place() {
        let cache = tempfile::tempdir().expect("temp dir");
        let entry = cache.path().join("entry");
        std::fs::create_dir(&entry).expect("create entry");
        let mut trash = CacheTrash::open(cache.path()).expect("open trash");
        trash.move_in(&entry).expect("move");
        assert!(!entry.exists());
    }

    #[test]
    fn deletes_what_it_received_when_emptied() {
        let cache = tempfile::tempdir().expect("temp dir");
        std::fs::write(cache.path().join("seg-0.m4s"), [0; 10]).expect("write segment");
        let mut trash = CacheTrash::open(cache.path()).expect("open trash");
        trash
            .move_in(&cache.path().join("seg-0.m4s"))
            .expect("move");
        trash.empty().expect("empty");
        assert!(!cache.path().join(TRASH_DIR).exists());
    }

    #[test]
    fn ignores_a_missing_path() {
        let cache = tempfile::tempdir().expect("temp dir");
        let mut trash = CacheTrash::open(cache.path()).expect("open trash");
        assert!(trash.move_in(&cache.path().join("missing")).is_ok());
    }
}

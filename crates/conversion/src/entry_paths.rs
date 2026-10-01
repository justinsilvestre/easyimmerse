//! The files of one cache entry: `<cache_dir>/conversions/<key>/`.

use std::path::{Path, PathBuf};

use easyimmerse_media::{INIT_SEGMENT_URI, segment_uri};

use crate::key::ConversionKey;

const CONVERSIONS_DIR: &str = "conversions";
const MANIFEST_NAME: &str = "manifest.json";
const RUN_DIR_PREFIX: &str = "run-";
const TEMPORARY_EXTENSION: &str = ".tmp";

/// The paths of a cache entry's manifest, init segment, media segments, and run directories.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EntryPaths {
    pub dir: PathBuf,
}

impl EntryPaths {
    pub fn new(cache_dir: &Path, key: &ConversionKey) -> Self {
        EntryPaths {
            dir: conversions_dir(cache_dir).join(key.as_str()),
        }
    }

    pub fn manifest(&self) -> PathBuf {
        self.dir.join(MANIFEST_NAME)
    }

    pub fn init_segment(&self) -> PathBuf {
        self.dir.join(INIT_SEGMENT_URI)
    }

    /// The cached media segment, named as the playlist refers to it.
    pub fn segment(&self, index: u32) -> PathBuf {
        self.dir.join(segment_uri(index))
    }

    /// The directory where one ffmpeg run writes its output before the segments move into the entry.
    pub fn run_dir(&self, run_number: u64) -> PathBuf {
        self.dir.join(format!("{RUN_DIR_PREFIX}{run_number}"))
    }
}

/// The directory that holds every cache entry.
pub fn conversions_dir(cache_dir: &Path) -> PathBuf {
    cache_dir.join(CONVERSIONS_DIR)
}

/// Tells whether a file or directory inside an entry holds unfinished output: a run directory or a file being written.
pub fn is_temporary(file_name: &str) -> bool {
    file_name.starts_with(RUN_DIR_PREFIX) || file_name.ends_with(TEMPORARY_EXTENSION)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn paths() -> EntryPaths {
        let key = ConversionKey::parse(&"0".repeat(64)).expect("valid key");
        EntryPaths::new(Path::new("/cache"), &key)
    }

    #[test]
    fn places_the_entry_under_the_conversions_directory() {
        let expected = format!("/cache/conversions/{}", "0".repeat(64));
        assert_eq!(paths().dir, PathBuf::from(expected));
    }

    #[test]
    fn names_segments_as_the_playlist_does() {
        assert_eq!(paths().segment(7), paths().dir.join("seg-7.m4s"));
    }

    #[test]
    fn numbers_run_directories() {
        assert_eq!(paths().run_dir(3), paths().dir.join("run-3"));
    }

    #[test]
    fn treats_a_run_directory_as_temporary() {
        assert!(is_temporary("run-3"));
    }

    #[test]
    fn treats_a_manifest_being_written_as_temporary() {
        assert!(is_temporary("manifest.json.tmp"));
    }

    #[test]
    fn keeps_a_cached_segment() {
        assert!(!is_temporary("seg-7.m4s"));
    }
}

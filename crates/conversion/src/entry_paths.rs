//! The files of one cache entry: `<cache_dir>/conversions/<key>/`.

use std::path::{Path, PathBuf};

use easyimmerse_media::{INIT_SEGMENT_URI, segment_uri};

use crate::key::ConversionKey;

const CONVERSIONS_DIR: &str = "conversions";
const MANIFEST_NAME: &str = "manifest.json";

/// The paths of a cache entry's manifest, init segment, media segments, and run directories.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EntryPaths {
    pub dir: PathBuf,
}

impl EntryPaths {
    pub fn new(cache_dir: &Path, key: &ConversionKey) -> Self {
        EntryPaths {
            dir: cache_dir.join(CONVERSIONS_DIR).join(key.as_str()),
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
        self.dir.join(format!("run-{run_number}"))
    }
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
}

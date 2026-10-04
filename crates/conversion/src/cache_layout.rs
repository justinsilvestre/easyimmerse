//! Where the cache keeps things on disk:
//!
//! ```text
//! <cache_dir>/conversions/<key>/manifest.json   what the entry holds
//! <cache_dir>/conversions/<key>/init.mp4        the init segment
//! <cache_dir>/conversions/<key>/s00042.m4s      one media segment per planned index
//! <cache_dir>/conversions/<key>/run/            where the active ffmpeg run writes
//! <cache_dir>/trash/                            entries being removed
//! ```

use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::error::ConversionError;
use crate::key::ConversionKey;

const CONVERSIONS_DIR_NAME: &str = "conversions";
const TRASH_DIR_NAME: &str = "trash";
const RUN_DIR_NAME: &str = "run";

#[derive(Debug, Clone)]
pub struct CacheLayout {
    root: PathBuf,
}

impl CacheLayout {
    pub fn new(cache_dir: PathBuf) -> Self {
        Self { root: cache_dir }
    }

    pub fn create(&self) -> Result<(), ConversionError> {
        for dir in [self.conversions_dir(), self.trash_dir()] {
            std::fs::create_dir_all(&dir).map_err(ConversionError::cache_io(&dir))?;
        }
        Ok(())
    }

    pub fn conversions_dir(&self) -> PathBuf {
        self.root.join(CONVERSIONS_DIR_NAME)
    }

    pub fn trash_dir(&self) -> PathBuf {
        self.root.join(TRASH_DIR_NAME)
    }

    pub fn entry_dir(&self, key: &ConversionKey) -> PathBuf {
        self.conversions_dir().join(key.as_str())
    }

    pub fn run_dir(entry_dir: &Path) -> PathBuf {
        entry_dir.join(RUN_DIR_NAME)
    }

    /// Every directory under `conversions/` whose name is a well-formed key.
    pub fn list_entries(&self) -> Result<Vec<(ConversionKey, PathBuf)>, ConversionError> {
        let dir = self.conversions_dir();
        let entries = std::fs::read_dir(&dir).map_err(ConversionError::cache_io(&dir))?;
        let mut listed = Vec::new();
        for entry in entries {
            let entry = entry.map_err(ConversionError::cache_io(&dir))?;
            if let Some(key) = ConversionKey::parse(&entry.file_name().to_string_lossy()) {
                listed.push((key, entry.path()));
            }
        }
        listed.sort_by(|left, right| left.0.as_str().cmp(right.0.as_str()));
        Ok(listed)
    }

    /// Moves an entry into the trash directory and deletes it from there, so that a crash in
    /// the middle leaves no half-removed entry under `conversions/`.
    pub fn remove_entry(&self, key: &ConversionKey) -> Result<(), ConversionError> {
        let entry_dir = self.entry_dir(key);
        if !entry_dir.exists() {
            return Ok(());
        }
        let trashed = self.trash_dir().join(format!("{key}-{}", unique_suffix()));
        std::fs::rename(&entry_dir, &trashed).map_err(ConversionError::cache_io(&entry_dir))?;
        std::fs::remove_dir_all(&trashed).map_err(ConversionError::cache_io(&trashed))
    }

    pub fn empty_trash(&self) -> Result<(), ConversionError> {
        let trash = self.trash_dir();
        let entries = std::fs::read_dir(&trash).map_err(ConversionError::cache_io(&trash))?;
        for entry in entries {
            let path = entry.map_err(ConversionError::cache_io(&trash))?.path();
            std::fs::remove_dir_all(&path).map_err(ConversionError::cache_io(&path))?;
        }
        Ok(())
    }

    /// The bytes of every file under `conversions/`.
    pub fn usage_bytes(&self) -> Result<u64, ConversionError> {
        directory_size(&self.conversions_dir())
    }
}

/// The bytes of every regular file below the directory, counting a missing directory as empty.
pub fn directory_size(dir: &Path) -> Result<u64, ConversionError> {
    let entries = match std::fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(0),
        Err(error) => return Err(ConversionError::cache_io(dir)(error)),
    };
    let mut total = 0;
    for entry in entries {
        let entry = entry.map_err(ConversionError::cache_io(dir))?;
        let metadata = entry.metadata().map_err(ConversionError::cache_io(dir))?;
        total += if metadata.is_dir() {
            directory_size(&entry.path())?
        } else {
            metadata.len()
        };
    }
    Ok(total)
}

fn unique_suffix() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |elapsed| elapsed.as_nanos())
}

#[cfg(test)]
mod tests {
    use tempfile::TempDir;

    use super::*;

    fn key(digit: char) -> ConversionKey {
        ConversionKey::parse(&digit.to_string().repeat(64)).expect("key")
    }

    fn layout() -> (TempDir, CacheLayout) {
        let dir = TempDir::new().expect("temp dir");
        let layout = CacheLayout::new(dir.path().to_path_buf());
        layout.create().expect("create");
        (dir, layout)
    }

    fn add_entry(layout: &CacheLayout, key: &ConversionKey, bytes: usize) {
        let dir = layout.entry_dir(key);
        std::fs::create_dir_all(&dir).expect("mkdir");
        std::fs::write(dir.join("s00000.m4s"), vec![0; bytes]).expect("write");
    }

    #[test]
    fn lists_entries_with_well_formed_keys_only() {
        let (_dir, layout) = layout();
        add_entry(&layout, &key('a'), 1);
        std::fs::create_dir(layout.conversions_dir().join("stray")).expect("mkdir");
        let keys: Vec<ConversionKey> = layout
            .list_entries()
            .expect("list")
            .into_iter()
            .map(|(key, _)| key)
            .collect();
        assert_eq!(keys, [key('a')]);
    }

    #[test]
    fn sums_the_size_of_every_entry() {
        let (_dir, layout) = layout();
        add_entry(&layout, &key('a'), 10);
        add_entry(&layout, &key('b'), 5);
        assert_eq!(layout.usage_bytes().expect("usage"), 15);
    }

    #[test]
    fn removes_an_entry_through_the_trash() {
        let (_dir, layout) = layout();
        add_entry(&layout, &key('a'), 1);
        layout.remove_entry(&key('a')).expect("remove");
        assert!(!layout.entry_dir(&key('a')).exists());
    }

    #[test]
    fn leaves_the_trash_empty_after_a_removal() {
        let (_dir, layout) = layout();
        add_entry(&layout, &key('a'), 1);
        layout.remove_entry(&key('a')).expect("remove");
        assert_eq!(
            std::fs::read_dir(layout.trash_dir()).expect("dir").count(),
            0
        );
    }

    #[test]
    fn removing_a_missing_entry_succeeds() {
        let (_dir, layout) = layout();
        assert!(layout.remove_entry(&key('a')).is_ok());
    }
}

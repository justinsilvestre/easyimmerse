//! The cache entries found on disk.

use std::io::ErrorKind;
use std::path::{Path, PathBuf};

use crate::entry_paths::{EntryPaths, conversions_dir};
use crate::key::ConversionKey;
use crate::manifest::Manifest;

/// An item in the conversions directory, with its key and manifest when they can be read.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StoredEntry {
    pub path: PathBuf,
    pub key: Option<ConversionKey>,
    pub manifest: Option<Manifest>,
}

/// Lists the items in the conversions directory. Returns nothing when the directory does not exist.
pub fn list_stored_entries(cache_dir: &Path) -> std::io::Result<Vec<StoredEntry>> {
    let items = match std::fs::read_dir(conversions_dir(cache_dir)) {
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(Vec::new()),
        items => items?,
    };
    let mut entries = Vec::new();
    for item in items {
        let item = item?;
        let key = item.file_name().to_str().and_then(ConversionKey::parse);
        let manifest = key.as_ref().and_then(|key| read_manifest(cache_dir, key));
        entries.push(StoredEntry {
            path: item.path(),
            key,
            manifest,
        });
    }
    Ok(entries)
}

/// Reads an entry's manifest, or returns `None` when it is missing or unreadable.
fn read_manifest(cache_dir: &Path, key: &ConversionKey) -> Option<Manifest> {
    let bytes = std::fs::read(EntryPaths::new(cache_dir, key).manifest()).ok()?;
    serde_json::from_slice(&bytes).ok()
}

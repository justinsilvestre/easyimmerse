//! What identifies a media file's contents without reading them: its path, size and
//! modification time.

use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

use serde::{Deserialize, Serialize};

use crate::error::ConversionError;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct SourceIdentity {
    pub path: PathBuf,
    pub size: u64,
    /// The modification time in milliseconds since the Unix epoch.
    pub modified_ms: u64,
}

impl SourceIdentity {
    /// Reads the file's metadata. This blocks briefly on the file system.
    pub fn read(path: &Path) -> Result<Self, ConversionError> {
        let metadata =
            std::fs::metadata(path).map_err(|source| ConversionError::SourceUnreadable {
                path: path.to_path_buf(),
                source,
            })?;
        let modified_ms = metadata
            .modified()
            .ok()
            .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
            .map_or(0, |elapsed| {
                u64::try_from(elapsed.as_millis()).unwrap_or(u64::MAX)
            });
        Ok(Self {
            path: path.to_path_buf(),
            size: metadata.len(),
            modified_ms,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixture(name: &str) -> PathBuf {
        Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../fixtures")
            .join(name)
    }

    #[test]
    fn reads_the_file_size() {
        let identity = SourceIdentity::read(&fixture("sample.srt")).expect("identity");
        assert_eq!(identity.size, 244);
    }

    #[test]
    fn reports_a_missing_file_as_unreadable() {
        let result = SourceIdentity::read(&fixture("missing.mkv"));
        assert!(matches!(
            result,
            Err(ConversionError::SourceUnreadable { .. })
        ));
    }
}

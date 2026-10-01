//! The `manifest.json` file that describes a cache entry.

use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use easyimmerse_media::playback::ConversionPlan;
use easyimmerse_media::{SegmentPlan, TrackInfo};
use serde::{Deserialize, Serialize};
use thiserror::Error;

/// What a cache entry converts and when it was last used. Times are milliseconds since the Unix epoch.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Manifest {
    pub source_path: PathBuf,
    pub source_size: u64,
    pub source_modified_ms: u64,
    pub plan: ConversionPlan,
    /// The source's video track, when the plan includes one.
    pub video_track: Option<TrackInfo>,
    pub segment_plan: SegmentPlan,
    pub created_ms: u64,
    /// Updated whenever the entry is registered again or its playlist is read, so that the least recently used entries can be found.
    pub last_access_ms: u64,
}

#[derive(Debug, Error)]
pub enum ManifestError {
    #[error("failed to read or write the manifest: {0}")]
    Io(#[from] std::io::Error),
    #[error("the manifest is not valid: {0}")]
    Json(#[from] serde_json::Error),
}

/// Reads a manifest, or returns `None` when the file does not exist.
pub async fn read_manifest(path: &Path) -> Result<Option<Manifest>, ManifestError> {
    match tokio::fs::read(path).await {
        Ok(bytes) => Ok(Some(serde_json::from_slice(&bytes)?)),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.into()),
    }
}

/// Writes a manifest to a temporary file and renames it into place, so that a reader never sees a partial file.
pub async fn write_manifest(path: &Path, manifest: &Manifest) -> Result<(), ManifestError> {
    let temporary = path.with_extension("json.tmp");
    tokio::fs::write(&temporary, serde_json::to_vec_pretty(manifest)?).await?;
    tokio::fs::rename(&temporary, path).await?;
    Ok(())
}

/// The current time in milliseconds since the Unix epoch.
pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |elapsed| {
            u64::try_from(elapsed.as_millis()).unwrap_or(u64::MAX)
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support;

    fn manifest() -> Manifest {
        test_support::manifest("/media/episode.mkv")
    }

    #[tokio::test]
    async fn reads_back_a_written_manifest() {
        let dir = tempfile::tempdir().expect("temp dir");
        let path = dir.path().join("manifest.json");
        write_manifest(&path, &manifest()).await.expect("write");
        assert_eq!(read_manifest(&path).await.ok().flatten(), Some(manifest()));
    }

    #[tokio::test]
    async fn reads_nothing_when_the_manifest_is_missing() {
        let dir = tempfile::tempdir().expect("temp dir");
        let path = dir.path().join("manifest.json");
        assert_eq!(read_manifest(&path).await.ok().flatten(), None);
    }
}

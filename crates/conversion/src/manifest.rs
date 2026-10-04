//! The manifest stored in every cache entry, which lets the server pick the entry up again
//! after a restart and tells the cache what the entry holds.

use std::path::{Path, PathBuf};

use easyimmerse_media::{ConversionPlan, SegmentPlan, TrackSelection};
use serde::{Deserialize, Serialize};

use crate::error::ConversionError;
use crate::source_identity::SourceIdentity;

pub const MANIFEST_FILE_NAME: &str = "manifest.json";

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Manifest {
    pub converter_version: u32,
    pub source: SourceIdentity,
    pub selection: TrackSelection,
    pub plan: ConversionPlan,
    pub segment_plan: SegmentPlan,
    /// ffmpeg's name for the selected video track's codec, which the run command needs.
    pub video_codec: Option<String>,
}

impl Manifest {
    pub fn copies_only(&self) -> bool {
        self.plan.copies_only()
    }
}

pub fn manifest_path(entry_dir: &Path) -> PathBuf {
    entry_dir.join(MANIFEST_FILE_NAME)
}

pub fn read_manifest(entry_dir: &Path) -> Result<Manifest, ConversionError> {
    let path = manifest_path(entry_dir);
    let json = std::fs::read(&path).map_err(ConversionError::cache_io(&path))?;
    serde_json::from_slice(&json)
        .map_err(|source| ConversionError::InvalidManifest { path, source })
}

/// Writes the manifest through a temporary file, so that a crash never leaves a partial one.
pub fn write_manifest(entry_dir: &Path, manifest: &Manifest) -> Result<(), ConversionError> {
    let path = manifest_path(entry_dir);
    let temporary = entry_dir.join(format!("{MANIFEST_FILE_NAME}.tmp"));
    let json =
        serde_json::to_vec_pretty(manifest).map_err(|source| ConversionError::InvalidManifest {
            path: path.clone(),
            source,
        })?;
    std::fs::write(&temporary, json).map_err(ConversionError::cache_io(&temporary))?;
    std::fs::rename(&temporary, &path).map_err(ConversionError::cache_io(&path))
}

#[cfg(test)]
mod tests {
    use easyimmerse_media::{AudioAction, Rational, Segment};
    use tempfile::TempDir;

    use super::*;

    fn manifest() -> Manifest {
        Manifest {
            converter_version: 1,
            source: SourceIdentity {
                path: PathBuf::from("/videos/a.mkv"),
                size: 1,
                modified_ms: 2,
            },
            selection: TrackSelection {
                video: None,
                audio: Some(0),
            },
            plan: ConversionPlan {
                video: None,
                audio: Some(AudioAction::Copy { index: 0 }),
                reasons: vec![],
            },
            segment_plan: SegmentPlan {
                timebase: Rational::new(1, 1000),
                start_ticks: 0,
                segments: vec![Segment {
                    start_ticks: 0,
                    end_ticks: 4000,
                }],
            },
            video_codec: None,
        }
    }

    #[test]
    fn round_trips_through_the_entry_directory() {
        let dir = TempDir::new().expect("temp dir");
        write_manifest(dir.path(), &manifest()).expect("write");
        assert_eq!(read_manifest(dir.path()).expect("read"), manifest());
    }

    #[test]
    fn reports_a_missing_manifest_as_a_cache_error() {
        let dir = TempDir::new().expect("temp dir");
        assert!(matches!(
            read_manifest(dir.path()),
            Err(ConversionError::CacheIo { .. })
        ));
    }

    #[test]
    fn reports_an_unreadable_manifest_as_invalid() {
        let dir = TempDir::new().expect("temp dir");
        std::fs::write(manifest_path(dir.path()), b"{").expect("write");
        assert!(matches!(
            read_manifest(dir.path()),
            Err(ConversionError::InvalidManifest { .. })
        ));
    }
}

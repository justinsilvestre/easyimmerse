//! Builders shared by the unit tests.

use std::path::{Path, PathBuf};

use easyimmerse_media::playback::ConversionPlan;
use easyimmerse_media::{MediaTimeline, SegmentPlan, Timebase};

use crate::entry_paths::EntryPaths;
use crate::key::ConversionKey;
use crate::manifest::Manifest;

/// A manifest of an audio-only conversion of 4-second segments over 20 minutes.
pub fn manifest(source_path: &str) -> Manifest {
    let timeline = MediaTimeline {
        timebase: Timebase::new(1, 1000).expect("nonzero timebase"),
        start_pts: 0,
        duration_ticks: 1_200_000,
    };
    Manifest {
        source_path: PathBuf::from(source_path),
        source_size: 1000,
        source_modified_ms: 5,
        plan: ConversionPlan {
            video: None,
            audio: None,
        },
        video_track: None,
        segment_plan: SegmentPlan::fixed_length(timeline),
        created_ms: 10,
        last_access_ms: 20,
    }
}

/// A key made of one repeated hexadecimal digit.
pub fn key(digit: char) -> ConversionKey {
    ConversionKey::parse(&digit.to_string().repeat(64)).expect("valid key")
}

/// Writes a cache entry with a manifest and one segment of `segment_size` bytes, and returns its paths.
pub fn write_entry(
    cache_dir: &Path,
    key: &ConversionKey,
    manifest: &Manifest,
    segment_size: usize,
) -> EntryPaths {
    let entry = EntryPaths::new(cache_dir, key);
    std::fs::create_dir_all(&entry.dir).expect("create entry");
    let json = serde_json::to_vec(manifest).expect("encode manifest");
    std::fs::write(entry.manifest(), json).expect("write manifest");
    std::fs::write(entry.segment(0), vec![0; segment_size]).expect("write segment");
    entry
}

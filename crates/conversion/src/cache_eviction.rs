//! Choosing the cache entries to remove so that the cache fits its limit.

use std::collections::HashSet;
use std::path::Path;

use easyimmerse_media::playback::{ConversionPlan, TrackAction};

use crate::cache_disk::{directory_size, disk_space};
use crate::cache_limit::cache_limit;
use crate::cache_trash::Removal;
use crate::entry_paths::{EntryPaths, conversions_dir};
use crate::key::ConversionKey;
use crate::select_evictions::{CachedEntry, select_evictions};
use crate::stored_entry::{StoredEntry, list_stored_entries};

/// Measures the cache and the disk that holds it, and returns the entries not `in_use` to remove so that the cache fits its limit.
pub fn find_evictions(
    cache_dir: &Path,
    in_use: &HashSet<ConversionKey>,
) -> std::io::Result<Vec<Removal>> {
    let conversions = conversions_dir(cache_dir);
    std::fs::create_dir_all(&conversions)?;
    let entries = measure_entries(cache_dir, in_use)?;
    let usage = entries.iter().map(|entry| entry.size).sum();
    let limit = cache_limit(disk_space(&conversions)?, usage);
    let evictions = select_evictions(&entries, limit).into_iter();
    let removals = evictions.map(|key| Removal {
        paths: vec![EntryPaths::new(cache_dir, &key).dir],
        key: Some(key),
    });
    Ok(removals.collect())
}

/// Describes every entry named by a key. Entries without a readable manifest count as copied and never used.
fn measure_entries(
    cache_dir: &Path,
    in_use: &HashSet<ConversionKey>,
) -> std::io::Result<Vec<CachedEntry>> {
    let mut entries = Vec::new();
    for stored in list_stored_entries(cache_dir)? {
        let StoredEntry {
            path,
            key: Some(key),
            manifest,
        } = stored
        else {
            continue;
        };
        entries.push(CachedEntry {
            size: directory_size(&path)?,
            last_access_ms: manifest
                .as_ref()
                .map_or(0, |manifest| manifest.last_access_ms),
            has_transcode: manifest.is_some_and(|manifest| has_transcode(&manifest.plan)),
            is_in_use: in_use.contains(&key),
            key,
        });
    }
    Ok(entries)
}

fn has_transcode(plan: &ConversionPlan) -> bool {
    [&plan.video, &plan.audio]
        .into_iter()
        .flatten()
        .any(|track| matches!(track.action, TrackAction::Transcode { .. }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::{key, manifest, write_entry};

    #[test]
    fn measures_the_files_of_an_entry() {
        let cache = tempfile::tempdir().expect("temp dir");
        let manifest = manifest("/media/episode.mkv");
        let entry = write_entry(cache.path(), &key('a'), &manifest, 0);
        let manifest_size = std::fs::metadata(entry.manifest()).expect("manifest").len();
        std::fs::write(entry.segment(1), [0; 30]).expect("write segment");
        let sizes: Vec<u64> = measure_entries(cache.path(), &HashSet::new())
            .expect("measure")
            .iter()
            .map(|entry| entry.size)
            .collect();
        assert_eq!(sizes, vec![manifest_size + 30]);
    }

    #[test]
    fn marks_the_entries_in_use() {
        let cache = tempfile::tempdir().expect("temp dir");
        write_entry(cache.path(), &key('a'), &manifest("/media/episode.mkv"), 10);
        let entries = measure_entries(cache.path(), &HashSet::from([key('a')])).expect("measure");
        assert!(entries.iter().all(|entry| entry.is_in_use));
    }

    #[test]
    fn treats_an_entry_without_a_manifest_as_never_used() {
        let cache = tempfile::tempdir().expect("temp dir");
        let entry = write_entry(cache.path(), &key('a'), &manifest("/media/episode.mkv"), 10);
        std::fs::remove_file(entry.manifest()).expect("remove manifest");
        let entries = measure_entries(cache.path(), &HashSet::new()).expect("measure");
        assert_eq!(entries.first().map(|entry| entry.last_access_ms), Some(0));
    }
}

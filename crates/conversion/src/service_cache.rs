//! Keeping the cache within its bound: status, eviction, startup cleanup, clearing, and the
//! removal of entries whose media file is gone.

use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant, UNIX_EPOCH};

use easyimmerse_media::ConversionCacheStatus;

use crate::cache_budget::{cache_status, read_disk_space};
use crate::cache_eviction::{EvictionCandidate, select_evictions};
use crate::cache_layout::{CacheLayout, directory_size};
use crate::entry::ConversionEntry;
use crate::error::ConversionError;
use crate::key::{CONVERTER_VERSION, ConversionKey};
use crate::manifest::{manifest_path, read_manifest};
use crate::service::ConversionService;

/// Eviction runs at most this often after a segment is served.
const EVICTION_INTERVAL: Duration = Duration::from_secs(60);

impl ConversionService {
    pub async fn cache_status(&self) -> Result<ConversionCacheStatus, ConversionError> {
        let layout = self.inner.layout.clone();
        tokio::task::spawn_blocking(move || {
            let usage = layout.usage_bytes()?;
            Ok(cache_status(usage, disk_space(&layout)?))
        })
        .await?
    }

    /// Removes every entry not in use and returns the status afterwards.
    pub async fn clear_cache(&self) -> Result<ConversionCacheStatus, ConversionError> {
        let in_use = self.in_use_keys().await;
        let layout = self.inner.layout.clone();
        let removed = tokio::task::spawn_blocking(move || {
            let mut removed = Vec::new();
            for (key, _) in layout.list_entries()? {
                if !in_use.contains(&key) {
                    layout.remove_entry(&key)?;
                    removed.push(key);
                }
            }
            Ok::<_, ConversionError>(removed)
        })
        .await??;
        self.forget(&removed).await;
        self.cache_status().await
    }

    /// Removes the entries converted from a source file, stopping their runs first. Call it
    /// when no media file points at the path any more.
    pub async fn remove_entries_for_source(&self, path: &Path) -> Result<(), ConversionError> {
        let layout = self.inner.layout.clone();
        let path = path.to_path_buf();
        let keys = tokio::task::spawn_blocking(move || {
            Ok::<_, ConversionError>(
                layout
                    .list_entries()?
                    .into_iter()
                    .filter(|(_, dir)| {
                        read_manifest(dir).is_ok_and(|manifest| manifest.source.path == path)
                    })
                    .map(|(key, _)| key)
                    .collect::<Vec<_>>(),
            )
        })
        .await??;
        for key in &keys {
            if let Some(entry) = self.inner.entries.lock().await.remove(key)
                && let Some(run) = entry.run.lock().await.take()
            {
                run.stop().await;
            }
            let layout = self.inner.layout.clone();
            let key = key.clone();
            tokio::task::spawn_blocking(move || layout.remove_entry(&key)).await??;
        }
        Ok(())
    }

    /// Removes leftover run directories, entries of a different converter version, and entries
    /// whose source no media file references, then evicts down to the limit. Runs in the
    /// background so that it never delays a request.
    pub fn start_cache_cleanup(&self, referenced_source_paths: Vec<PathBuf>) {
        let service = self.clone();
        tokio::spawn(async move {
            if let Err(error) = service.clean_up(referenced_source_paths).await {
                tracing::warn!("conversion cache cleanup failed: {error}");
            }
        });
    }

    async fn clean_up(&self, referenced: Vec<PathBuf>) -> Result<(), ConversionError> {
        let referenced: HashSet<PathBuf> = referenced.into_iter().collect();
        let registered: HashSet<ConversionKey> =
            self.inner.entries.lock().await.keys().cloned().collect();
        let layout = self.inner.layout.clone();
        tokio::task::spawn_blocking(move || {
            layout.empty_trash()?;
            for (key, dir) in layout.list_entries()? {
                let kept = read_manifest(&dir).is_ok_and(|manifest| {
                    manifest.converter_version == CONVERTER_VERSION
                        && referenced.contains(&manifest.source.path)
                });
                if !kept {
                    layout.remove_entry(&key)?;
                } else if !registered.contains(&key) {
                    remove_run_dir(&dir)?;
                }
            }
            Ok::<_, ConversionError>(())
        })
        .await??;
        self.evict().await
    }

    /// Starts an eviction pass in the background when the last one is old enough.
    pub(crate) fn schedule_eviction(&self) {
        let due = self
            .inner
            .last_eviction
            .lock()
            .map(|mut last| {
                let due = last.is_none_or(|last| last.elapsed() >= EVICTION_INTERVAL);
                if due {
                    *last = Some(Instant::now());
                }
                due
            })
            .unwrap_or(false);
        if due {
            let service = self.clone();
            tokio::spawn(async move {
                if let Err(error) = service.evict().await {
                    tracing::warn!("conversion cache eviction failed: {error}");
                }
            });
        }
    }

    /// Removes entries until the usage is under the limit, never touching entries in use.
    pub async fn evict(&self) -> Result<(), ConversionError> {
        let in_use = self.in_use_keys().await;
        let layout = self.inner.layout.clone();
        let evicted = tokio::task::spawn_blocking(move || {
            let candidates = eviction_candidates(&layout, &in_use)?;
            let usage: u64 = candidates
                .iter()
                .map(|candidate| candidate.size_bytes)
                .sum();
            let status = cache_status(usage, disk_space(&layout)?);
            let keys = select_evictions(candidates, usage, status.limit_bytes);
            for key in &keys {
                layout.remove_entry(key)?;
            }
            Ok::<_, ConversionError>(keys)
        })
        .await??;
        self.forget(&evicted).await;
        Ok(())
    }

    async fn in_use_keys(&self) -> HashSet<ConversionKey> {
        let entries: Vec<Arc<ConversionEntry>> =
            self.inner.entries.lock().await.values().cloned().collect();
        let mut in_use = HashSet::new();
        for entry in entries {
            if entry.is_in_use().await {
                in_use.insert(entry.key.clone());
            }
        }
        in_use
    }

    async fn forget(&self, keys: &[ConversionKey]) {
        let mut entries = self.inner.entries.lock().await;
        for key in keys {
            entries.remove(key);
        }
    }
}

/// Entries with a readable manifest; one without is removed on the spot.
fn eviction_candidates(
    layout: &CacheLayout,
    in_use: &HashSet<ConversionKey>,
) -> Result<Vec<EvictionCandidate>, ConversionError> {
    let mut candidates = Vec::new();
    for (key, dir) in layout.list_entries()? {
        let Ok(manifest) = read_manifest(&dir) else {
            layout.remove_entry(&key)?;
            continue;
        };
        candidates.push(EvictionCandidate {
            size_bytes: directory_size(&dir)?,
            copies_only: manifest.copies_only(),
            last_used_ms: last_used_ms(&dir),
            in_use: in_use.contains(&key),
            key,
        });
    }
    Ok(candidates)
}

fn last_used_ms(entry_dir: &Path) -> u64 {
    std::fs::metadata(manifest_path(entry_dir))
        .and_then(|metadata| metadata.modified())
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map_or(0, |elapsed| {
            u64::try_from(elapsed.as_millis()).unwrap_or(u64::MAX)
        })
}

fn disk_space(layout: &CacheLayout) -> Result<crate::cache_budget::DiskSpace, ConversionError> {
    let dir = layout.conversions_dir();
    read_disk_space(&dir).map_err(ConversionError::cache_io(&dir))
}

fn remove_run_dir(entry_dir: &Path) -> Result<(), ConversionError> {
    let run_dir = CacheLayout::run_dir(entry_dir);
    match std::fs::remove_dir_all(&run_dir) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(ConversionError::cache_io(&run_dir)(error)),
    }
}

//! Keeping the cache within its size limit and free of entries that are no longer needed.

use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant};

use super::ConversionService;
use crate::cache_cleanup::{find_entries_of_source, find_unneeded};
use crate::cache_eviction::find_evictions;
use crate::conversion::Conversion;
use crate::error::ConversionError;
use crate::key::ConversionKey;

/// How often serving segments checks the cache against its limit.
const LIMIT_CHECK_INTERVAL: Duration = Duration::from_secs(60);

impl ConversionService {
    /// Removes unfinished output and the cache entries whose source is not among `known_sources`, then enforces the cache limit.
    /// Call it at startup with the local paths of every media file. Conversions in use are left alone.
    pub async fn clean_up(&self, known_sources: HashSet<PathBuf>) -> Result<(), ConversionError> {
        let _maintenance = self.inner.maintenance.lock().await;
        let cache_dir = self.inner.cache_dir.clone();
        self.remove(move || find_unneeded(&cache_dir, &known_sources))
            .await?;
        self.evict_unused().await
    }

    /// Stops the conversions of `source` and removes their cache entries. Call it once no media file is read from `source`.
    pub async fn remove_source(&self, source: &Path) -> Result<(), ConversionError> {
        let _maintenance = self.inner.maintenance.lock().await;
        for watcher in self
            .unregister_source(source)
            .iter()
            .flat_map(|conversion| conversion.shut_down())
        {
            let _ = watcher.await;
        }
        let (cache_dir, source) = (self.inner.cache_dir.clone(), source.to_owned());
        self.remove(move || find_entries_of_source(&cache_dir, &source))
            .await?;
        Ok(())
    }

    /// Removes the least valuable cache entries not in use until the cache fits its limit.
    pub async fn enforce_limit(&self) -> Result<(), ConversionError> {
        let _maintenance = self.inner.maintenance.lock().await;
        self.evict_unused().await
    }

    /// Enforces the cache limit in the background when the last check was long enough ago.
    pub(super) fn enforce_limit_when_due(&self) {
        if !self.claim_limit_check() {
            return;
        }
        let service = self.clone();
        tokio::spawn(async move {
            if let Err(error) = service.enforce_limit().await {
                tracing::warn!("could not keep the conversion cache within its limit: {error}");
            }
        });
    }

    /// Removes cache entries until the cache fits its limit. The caller holds the maintenance lock.
    async fn evict_unused(&self) -> Result<(), ConversionError> {
        let in_use = self.keys_in_use();
        let cache_dir = self.inner.cache_dir.clone();
        let evicted = self
            .remove(move || find_evictions(&cache_dir, &in_use))
            .await?;
        if evicted > 0 {
            tracing::info!(
                "removed {evicted} conversions from the cache to keep it within its limit"
            );
        }
        Ok(())
    }

    fn unregister_source(&self, source: &Path) -> Vec<Arc<Conversion>> {
        let mut conversions = self.conversions();
        let keys: Vec<ConversionKey> = conversions
            .iter()
            .filter(|(_, conversion)| conversion.manifest.source_path == source)
            .map(|(key, _)| key.clone())
            .collect();
        keys.iter()
            .filter_map(|key| conversions.remove(key))
            .collect()
    }

    /// Tells whether a limit check is due, and if so, schedules the next one.
    fn claim_limit_check(&self) -> bool {
        let mut next_check = self.inner.next_limit_check();
        let now = Instant::now();
        let is_due = now >= *next_check;
        if is_due {
            *next_check = now + LIMIT_CHECK_INTERVAL;
        }
        is_due
    }
}

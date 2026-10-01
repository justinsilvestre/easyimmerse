//! The conversion service: registers conversions and serves their playlists and segments, converting on demand.

mod maintenance;
mod removal;

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, MutexGuard, PoisonError};
use std::time::Instant;

use easyimmerse_media::playback::ConversionPlan;
use easyimmerse_media::{ContainerInfo, render_hls_playlist};
use easyimmerse_media_ffmpeg::{AacEncoder, BinaryName, FfmpegPaths, locate_binary};

use crate::conversion::Conversion;
use crate::entry_paths::EntryPaths;
use crate::error::ConversionError;
use crate::key::{ConversionKey, derive_key};
use crate::manifest::read_manifest;
use crate::registration::{create_manifest, read_source_identity};
use crate::spawn_ffmpeg::RunSettings;
use crate::wait_until_cached::wait_until_cached;

/// Converts registered media files into HLS segments in a cache directory, with at most one ffmpeg process per conversion.
#[derive(Clone)]
pub struct ConversionService {
    inner: Arc<ServiceInner>,
}

struct ServiceInner {
    cache_dir: PathBuf,
    ffmpeg_paths: FfmpegPaths,
    settings: RunSettings,
    conversions: Mutex<HashMap<ConversionKey, Arc<Conversion>>>,
    /// Held while the cache is cleaned up or trimmed, so that only one such task runs at a time.
    maintenance: tokio::sync::Mutex<()>,
    next_limit_check: Mutex<Instant>,
}

impl ConversionService {
    /// Creates a service that caches conversions under `cache_dir`. Fails when ffmpeg cannot be found.
    pub fn new(cache_dir: PathBuf, ffmpeg_paths: FfmpegPaths) -> Result<Self, ConversionError> {
        let ffmpeg = locate_binary(BinaryName::Ffmpeg, &ffmpeg_paths)?;
        let settings = RunSettings {
            ffmpeg,
            aac_encoder: AacEncoder::for_current_platform(),
        };
        Ok(ConversionService {
            inner: Arc::new(ServiceInner {
                cache_dir,
                ffmpeg_paths,
                settings,
                conversions: Mutex::default(),
                maintenance: tokio::sync::Mutex::default(),
                next_limit_check: Mutex::new(Instant::now()),
            }),
        })
    }

    /// Registers the conversion of a source file with a plan and returns its key.
    /// A new conversion reads the source's keyframes with ffprobe; one cached earlier is reused.
    pub async fn register(
        &self,
        source_path: &Path,
        container: &ContainerInfo,
        plan: &ConversionPlan,
    ) -> Result<ConversionKey, ConversionError> {
        let source = read_source_identity(source_path).await?;
        let key = derive_key(&source, plan)?;
        if let Some(conversion) = self.find(&key) {
            conversion.mark_used();
            conversion.touch().await?;
            return Ok(key);
        }
        let entry = EntryPaths::new(&self.inner.cache_dir, &key);
        let manifest = match read_manifest(&entry.manifest()).await.ok().flatten() {
            Some(manifest) => manifest,
            None => create_manifest(&source, container, plan, &self.inner.ffmpeg_paths).await?,
        };
        let conversion = Arc::new(Conversion::new(entry, manifest));
        let conversion = Arc::clone(self.conversions().entry(key.clone()).or_insert(conversion));
        conversion.mark_used();
        conversion.touch().await?;
        Ok(key)
    }

    /// Renders the HLS playlist of a registered conversion.
    pub async fn playlist(&self, key: &ConversionKey) -> Result<String, ConversionError> {
        let conversion = self.get(key)?;
        conversion.touch().await?;
        Ok(render_hls_playlist(&conversion.manifest.segment_plan))
    }

    /// Returns the path of the cached init segment, waiting for ffmpeg to produce it when necessary.
    pub async fn init_segment(&self, key: &ConversionKey) -> Result<PathBuf, ConversionError> {
        let conversion = self.get(key)?;
        let path = conversion.entry.init_segment();
        let index = conversion.requested();
        wait_until_cached(&conversion, &self.inner.settings, path, index).await
    }

    /// Returns the path of a cached media segment, converting the part of the file around it when necessary.
    /// Serving segments also keeps the cache within its size limit.
    pub async fn segment(
        &self,
        key: &ConversionKey,
        index: u32,
    ) -> Result<PathBuf, ConversionError> {
        let conversion = self.get(key)?;
        let segment_count = conversion.manifest.segment_plan.segments.len();
        if usize::try_from(index).map_or(true, |position| position >= segment_count) {
            return Err(ConversionError::SegmentOutOfRange(index));
        }
        conversion.note_request(index);
        let path = conversion.entry.segment(index);
        let cached = wait_until_cached(&conversion, &self.inner.settings, path, index).await?;
        self.enforce_limit_when_due();
        Ok(cached)
    }

    /// Stops every ffmpeg process and waits for the run directories to be removed. Later requests fail.
    pub async fn shutdown(&self) {
        let conversions: Vec<Arc<Conversion>> = self.conversions().values().cloned().collect();
        for watcher in conversions
            .iter()
            .flat_map(|conversion| conversion.shut_down())
        {
            let _ = watcher.await;
        }
    }

    fn get(&self, key: &ConversionKey) -> Result<Arc<Conversion>, ConversionError> {
        let conversion = self.find(key).ok_or(ConversionError::UnknownConversion)?;
        conversion.mark_used();
        Ok(conversion)
    }

    fn find(&self, key: &ConversionKey) -> Option<Arc<Conversion>> {
        self.conversions().get(key).cloned()
    }

    fn conversions(&self) -> MutexGuard<'_, HashMap<ConversionKey, Arc<Conversion>>> {
        self.inner.conversions()
    }
}

impl ServiceInner {
    fn conversions(&self) -> MutexGuard<'_, HashMap<ConversionKey, Arc<Conversion>>> {
        self.conversions
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
    }

    fn next_limit_check(&self) -> MutexGuard<'_, Instant> {
        self.next_limit_check
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
    }
}

impl Drop for ServiceInner {
    /// Asks every run to stop when the last handle to the service is dropped. Each run then stops its ffmpeg process and removes its run directory.
    fn drop(&mut self) {
        for conversion in self.conversions().values() {
            conversion.shut_down();
        }
    }
}

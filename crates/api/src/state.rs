use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use easyimmerse_conversion::{ConversionService, ProbeCache};
use easyimmerse_storage::{Storage, StorageError};

use crate::auth::error_body::{ApiFailure, internal};
use crate::config::ApiConfig;
use crate::import_jobs::ImportJobs;
use crate::media_source_jobs::MediaSourceJobs;
use crate::plugins::{PluginRegistry, fetched_item_dir};

#[derive(Clone)]
pub struct AppState {
    pub storage: Arc<Storage>,
    pub config: Arc<ApiConfig>,
    /// Probes media files through ffprobe. None when ffprobe was not found.
    pub probes: Option<Arc<ProbeCache>>,
    /// Converts media while it plays. None without ffmpeg or a cache directory.
    pub conversion: Option<ConversionService>,
    /// The dictionary imports running or recently finished.
    pub import_jobs: Arc<Mutex<ImportJobs>>,
    /// The installed plugins. Empty without a plugin directory.
    pub plugins: Arc<PluginRegistry>,
    /// The fetches through media-source plugins since the server started.
    pub media_source_jobs: Arc<MediaSourceJobs>,
    /// Where media-source plugins put what they fetch. None when the server has no media
    /// directory, in which case media cannot be added through a plugin.
    pub media_dir: Option<PathBuf>,
}

impl AppState {
    pub fn new(
        storage: Storage,
        config: ApiConfig,
        probes: Option<ProbeCache>,
        conversion: Option<ConversionService>,
    ) -> Self {
        Self {
            storage: Arc::new(storage),
            config: Arc::new(config),
            probes: probes.map(Arc::new),
            conversion,
            import_jobs: Arc::default(),
            plugins: Arc::new(PluginRegistry::default()),
            media_source_jobs: Arc::new(MediaSourceJobs::default()),
            media_dir: None,
        }
    }

    pub fn with_plugins(mut self, plugins: PluginRegistry, media_dir: Option<PathBuf>) -> Self {
        self.plugins = Arc::new(plugins);
        self.media_dir = media_dir;
        self
    }

    /// Runs a storage operation on the blocking thread pool, since SQLite calls block.
    pub async fn with_storage<T>(
        &self,
        operation: impl FnOnce(&Storage) -> Result<T, StorageError> + Send + 'static,
    ) -> Result<T, ApiFailure>
    where
        T: Send + 'static,
    {
        let storage = Arc::clone(&self.storage);
        tokio::task::spawn_blocking(move || operation(&storage))
            .await
            .map_err(|error| internal(format!("storage task failed: {error}")))?
            .map_err(ApiFailure::from)
    }

    /// The directory a media-source plugin fetched the file at `path` into, when it was
    /// fetched into the media directory.
    pub fn fetched_item_dir(&self, path: &str) -> Option<PathBuf> {
        fetched_item_dir(self.media_dir.as_deref()?, path)
    }
}

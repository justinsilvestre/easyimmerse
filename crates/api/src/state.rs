use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use easyimmerse_conversion::{ConversionService, ProbeCache};
use easyimmerse_core::media_file::{MediaFile, MediaFileSource};
use easyimmerse_storage::{Storage, StorageError};

use tokio::sync::Semaphore;

use crate::accounts::{AccountsError, LoginThrottle, PendingExtensions};
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
    /// The recent login attempts, which make further attempts wait.
    pub login_throttle: Arc<LoginThrottle>,
    /// Bounds how many passwords are hashed at once, since each hash takes about 19 MiB of memory.
    pub password_hashing: Arc<Semaphore>,
    /// The session extensions being written.
    pub session_extensions: Arc<PendingExtensions>,
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
            login_throttle: Arc::default(),
            password_hashing: Arc::new(Semaphore::new(processor_count())),
            session_extensions: Arc::default(),
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

    /// Runs an account operation, which hashes a password, on the blocking thread pool.
    /// At most one such operation per processor runs at once; the others wait their turn.
    pub async fn with_accounts<T>(
        &self,
        operation: impl FnOnce(&Storage) -> Result<T, AccountsError> + Send + 'static,
    ) -> Result<T, ApiFailure>
    where
        T: Send + 'static,
    {
        let permit = Arc::clone(&self.password_hashing)
            .acquire_owned()
            .await
            .map_err(|error| internal(format!("password hashing is unavailable: {error}")))?;
        let storage = Arc::clone(&self.storage);
        tokio::task::spawn_blocking(move || {
            let _permit = permit;
            operation(&storage)
        })
        .await
        .map_err(|error| internal(format!("account task failed: {error}")))?
        .map_err(ApiFailure::from)
    }

    /// The directory a media-source plugin fetched the media file into, when it was imported
    /// through a plugin into the media directory.
    pub fn fetched_item_dir(&self, media_file: &MediaFile) -> Option<PathBuf> {
        media_file.origin.as_ref()?;
        let MediaFileSource::Path { path } = &media_file.source else {
            return None;
        };
        fetched_item_dir(self.media_dir.as_deref()?, path)
    }
}

fn processor_count() -> usize {
    std::thread::available_parallelism().map_or(1, usize::from)
}

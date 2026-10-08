use std::sync::{Arc, Mutex};

use easyimmerse_conversion::{ConversionService, ProbeCache};
use easyimmerse_storage::{Storage, StorageError};

use crate::auth::error_body::{ApiFailure, internal};
use crate::config::ApiConfig;
use crate::import_jobs::ImportJobs;

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
        }
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
}

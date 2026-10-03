use std::path::PathBuf;
use std::sync::Arc;

use easyimmerse_storage::{Storage, StorageError};

use crate::auth::error_body::{ApiFailure, internal};
use crate::config::ApiConfig;

#[derive(Clone)]
pub struct AppState {
    pub storage: Arc<Storage>,
    pub config: Arc<ApiConfig>,
    /// Where converted media is cached. None when the server has nowhere to write.
    pub cache_dir: Option<PathBuf>,
}

impl AppState {
    pub fn new(storage: Storage, config: ApiConfig, cache_dir: Option<PathBuf>) -> Self {
        Self {
            storage: Arc::new(storage),
            config: Arc::new(config),
            cache_dir,
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

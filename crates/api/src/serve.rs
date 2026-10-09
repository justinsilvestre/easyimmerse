use std::net::SocketAddr;
use std::path::{Path, PathBuf};

use easyimmerse_conversion::{ConversionService, ProbeCache};
use easyimmerse_media_ffmpeg::{BinaryName, FfmpegPaths, locate_binary};
use easyimmerse_storage::Storage;
use thiserror::Error;
use tokio::net::TcpListener;
use tokio::sync::oneshot;
use tokio::task::JoinHandle;

use crate::config::ApiConfig;
use crate::plugins::PluginRegistry;
use crate::router::build_router;
use crate::routes::conversion_cache::restore_cache_budget;
use crate::state::AppState;

#[derive(Debug, Error)]
pub enum ServeError {
    #[error("the server failed: {0}")]
    Io(#[from] std::io::Error),
    #[error("the server task panicked: {0}")]
    Join(#[from] tokio::task::JoinError),
}

/// A running server. Dropping the handle leaves the server running until the runtime
/// shuts down; call `shutdown` to stop it gracefully.
pub struct ServerHandle {
    pub addr: SocketAddr,
    shutdown: oneshot::Sender<()>,
    task: JoinHandle<std::io::Result<()>>,
    conversion: Option<ConversionService>,
}

impl ServerHandle {
    /// Stops the conversions, stops accepting connections, waits for in-flight requests,
    /// and returns.
    pub async fn shutdown(self) -> Result<(), ServeError> {
        if let Some(conversion) = &self.conversion {
            conversion.shutdown().await;
        }
        // The receiver is gone only if the server already stopped, which is fine.
        let _ = self.shutdown.send(());
        self.task.await??;
        Ok(())
    }
}

/// Settings of a server beyond authentication.
#[derive(Debug, Clone, Default)]
pub struct ServeOptions {
    /// Where converted media is cached. None disables conversion.
    pub cache_dir: Option<PathBuf>,
    /// Where installed plugins live, one package per subdirectory. None installs no plugins.
    pub plugins_dir: Option<PathBuf>,
    /// Where media-source plugins put what they fetch. None keeps them from adding media.
    pub media_dir: Option<PathBuf>,
}

/// Serves the API on an already bound listener, so that the caller knows the port.
pub async fn serve(
    listener: TcpListener,
    mut config: ApiConfig,
    storage: Storage,
    options: ServeOptions,
) -> Result<ServerHandle, ServeError> {
    let addr = listener.local_addr()?;
    let conversion = options.cache_dir.and_then(open_conversion_service);
    if let Some(conversion) = &conversion {
        start_background_work(conversion, &storage);
    }
    // The server fills the media directory itself, so its files are readable with any token.
    let media_dir = options
        .media_dir
        .as_deref()
        .map(create_absolute_dir)
        .transpose()?;
    if let Some(media_dir) = &media_dir {
        config.server_dirs.push(media_dir.clone());
    }
    let plugins = options
        .plugins_dir
        .as_deref()
        .map(PluginRegistry::scan)
        .unwrap_or_default();
    let state = AppState::new(storage, config, open_probe_cache(), conversion.clone())
        .with_plugins(plugins, media_dir);
    let (router, _) = build_router(state);
    let (shutdown, shutdown_requested) = oneshot::channel();
    let server = axum::serve(listener, router).with_graceful_shutdown(async {
        let _ = shutdown_requested.await;
    });
    let task = tokio::spawn(server.into_future());
    Ok(ServerHandle {
        addr,
        shutdown,
        task,
        conversion,
    })
}

/// Creates the directory if needed and returns its absolute path, so that plugin grants
/// do not depend on the server's working directory.
fn create_absolute_dir(dir: &Path) -> std::io::Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    dir.canonicalize()
}

/// The binaries are looked up through `EASYIMMERSE_FFMPEG_DIR`, next to the executable, and
/// on `PATH`.
fn open_probe_cache() -> Option<ProbeCache> {
    let paths = FfmpegPaths::default();
    match locate_binary(BinaryName::Ffprobe, &paths) {
        Ok(_) => Some(ProbeCache::new(paths)),
        Err(error) => {
            tracing::warn!("media files cannot be probed: {error}");
            None
        }
    }
}

fn open_conversion_service(cache_dir: PathBuf) -> Option<ConversionService> {
    match ConversionService::open(cache_dir, FfmpegPaths::default()) {
        Ok(service) => Some(service),
        Err(error) => {
            tracing::warn!("media conversion is unavailable: {error}");
            None
        }
    }
}

/// Encoder discovery and cache cleanup run in the background, so that they never delay the
/// first request.
fn start_background_work(conversion: &ConversionService, storage: &Storage) {
    restore_cache_budget(conversion, storage);
    conversion.start_encoder_discovery();
    match storage.list_referenced_source_paths() {
        Ok(paths) => conversion.start_cache_cleanup(paths.into_iter().map(PathBuf::from).collect()),
        Err(error) => tracing::warn!("conversion cache cleanup skipped: {error}"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_a_relative_dir_and_returns_it_absolute() {
        let parent = tempfile::tempdir_in(".").unwrap();
        let relative = Path::new(parent.path().file_name().unwrap()).join("media");
        assert!(create_absolute_dir(&relative).unwrap().is_absolute());
    }
}

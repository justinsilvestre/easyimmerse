use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use std::pin::pin;
use std::sync::Arc;

use axum::Router;
use easyimmerse_conversion::{ConversionService, ProbeCache};
use easyimmerse_media_ffmpeg::{BinaryName, FfmpegPaths, locate_binary};
use easyimmerse_storage::Storage;
use futures_util::future::select;
use thiserror::Error;
use tokio::net::TcpListener;
use tokio::sync::{oneshot, watch};
use tokio::task::JoinHandle;

use crate::config::{ApiConfig, UploadsConfig};
use crate::mail::{MailError, MailService};
use crate::media_copy_files::release_copies_periodically;
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
    #[error(
        "the server needs a launch token, accounts, or both, or no request could be authenticated"
    )]
    NoAuthentication,
    #[error("the mail settings are unusable: {0}")]
    Mail(#[from] MailError),
}

/// A running server.
/// Dropping the handle leaves the server running until the runtime shuts down;
/// call `shutdown` to stop it gracefully.
pub struct ServerHandle {
    pub addr: SocketAddr,
    router: Router,
    /// Tells every listener of the server to stop.
    /// Each listener's task holds a receiver until it has finished,
    /// so the sender's `closed` waits for all of them.
    stop: watch::Sender<bool>,
    task: JoinHandle<std::io::Result<()>>,
    conversion: Option<ConversionService>,
    sync_loop: JoinHandle<()>,
    release_loop: JoinHandle<()>,
}

impl ServerHandle {
    /// Serves the same API, with the same storage and settings, on another listener as well.
    /// The listener stops when its handle's `shutdown` is called or when the whole server stops.
    pub fn serve_also(&self, listener: TcpListener) -> std::io::Result<ListenerHandle> {
        let addr = listener.local_addr()?;
        let (shutdown, shutdown_requested) = oneshot::channel();
        let mut server_stopping = self.stop.subscribe();
        let stop_signal = async move {
            let server_stops = pin!(server_stopping.wait_for(|stop| *stop));
            let _ = select(shutdown_requested, server_stops).await;
        };
        let task = spawn_listener(
            listener,
            self.router.clone(),
            self.stop.subscribe(),
            stop_signal,
        );
        Ok(ListenerHandle {
            addr,
            shutdown,
            task,
        })
    }

    /// Stops the conversions, stops accepting connections on every listener,
    /// waits for in-flight requests, and returns.
    pub async fn shutdown(self) -> Result<(), ServeError> {
        if let Some(conversion) = &self.conversion {
            conversion.shutdown().await;
        }
        self.sync_loop.abort();
        self.release_loop.abort();
        // Sending fails only when every listener already stopped, which is fine.
        let _ = self.stop.send(true);
        self.stop.closed().await;
        self.task.await??;
        Ok(())
    }
}

/// A listener added with [`ServerHandle::serve_also`].
/// Dropping the handle stops the listener as `shutdown` does, without waiting for it.
pub struct ListenerHandle {
    pub addr: SocketAddr,
    shutdown: oneshot::Sender<()>,
    task: JoinHandle<std::io::Result<()>>,
}

impl ListenerHandle {
    /// Stops accepting connections on this listener only, waits for its in-flight requests, and returns.
    /// The server's other listeners keep running.
    pub async fn shutdown(self) -> Result<(), ServeError> {
        // The receiver is gone only if the listener already stopped, which is fine.
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
    /// The directory holding ffmpeg and ffprobe. None searches for them in the usual places.
    pub ffmpeg_dir: Option<PathBuf>,
    /// The directory holding the built web app, served at every path the API does not use.
    /// None serves only the API, as does a directory that does not exist.
    pub web_app_dir: Option<PathBuf>,
}

/// Serves the API on an already bound listener, so that the caller knows the port.
pub async fn serve(
    listener: TcpListener,
    config: ApiConfig,
    storage: Storage,
    options: ServeOptions,
) -> Result<ServerHandle, ServeError> {
    if !config.can_authenticate() {
        return Err(ServeError::NoAuthentication);
    }
    let mail = config.account_mail().map(MailService::open).transpose()?;
    let addr = listener.local_addr()?;
    let state = build_app_state(config, storage, options)?.with_mail(mail);
    let conversion = state.conversion.clone();
    let sync_loop = tokio::spawn(Arc::clone(&state.sync).run());
    let release_loop = tokio::spawn(release_copies_periodically(state.clone()));
    let (router, _) = build_router(state);
    let (stop, stop_requested) = watch::channel(false);
    let stop_signal = {
        let mut stop_requested = stop_requested.clone();
        async move {
            let _ = stop_requested.wait_for(|stop| *stop).await;
        }
    };
    let task = spawn_listener(listener, router.clone(), stop_requested, stop_signal);
    Ok(ServerHandle {
        addr,
        router,
        stop,
        task,
        conversion,
        sync_loop,
        release_loop,
    })
}

/// Serves `router` on `listener` until `stop_signal` completes.
/// The task keeps `guard` until the in-flight requests have finished,
/// so that the server knows when every listener is done.
fn spawn_listener(
    listener: TcpListener,
    router: Router,
    guard: watch::Receiver<bool>,
    stop_signal: impl Future<Output = ()> + Send + 'static,
) -> JoinHandle<std::io::Result<()>> {
    let service = router.into_make_service_with_connect_info::<SocketAddr>();
    let server = axum::serve(listener, service).with_graceful_shutdown(stop_signal);
    tokio::spawn(async move {
        let _guard = guard;
        server.await
    })
}

/// Opens the services that `options` ask for and gathers them with the storage and the config.
fn build_app_state(
    mut config: ApiConfig,
    storage: Storage,
    options: ServeOptions,
) -> std::io::Result<AppState> {
    let ffmpeg_paths = options
        .ffmpeg_dir
        .as_deref()
        .map(FfmpegPaths::in_dir)
        .unwrap_or_default();
    let conversion = options
        .cache_dir
        .and_then(|cache_dir| open_conversion_service(cache_dir, ffmpeg_paths.clone()));
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
    config.uploads = uploads_config(&config, media_dir.as_deref())?;
    let plugins = options
        .plugins_dir
        .as_deref()
        .map(PluginRegistry::scan)
        .unwrap_or_default();
    let probes = open_probe_cache(ffmpeg_paths.clone());
    Ok(AppState::new(storage, config, probes, conversion)
        .with_plugins(plugins, media_dir)
        .with_ffmpeg_paths(ffmpeg_paths)
        .with_web_app_dir(existing_web_app_dir(options.web_app_dir)))
}

fn existing_web_app_dir(web_app_dir: Option<PathBuf>) -> Option<PathBuf> {
    let dir = web_app_dir?;
    if dir.is_dir() {
        tracing::info!("serving the web app from {}", dir.display());
        Some(dir)
    } else {
        tracing::warn!(
            "serving only the API, since the web app directory {} does not exist",
            dir.display()
        );
        None
    }
}

/// The uploads of the configuration with their directory made absolute. A server without accounts,
/// such as the built-in server of the desktop and mobile apps, keeps its copies beside its media
/// directory when no other directory is configured; a server with accounts keeps copies only when told where.
fn uploads_config(
    config: &ApiConfig,
    media_dir: Option<&Path>,
) -> std::io::Result<Option<UploadsConfig>> {
    let uploads = match (&config.uploads, media_dir) {
        (Some(uploads), _) => uploads.clone(),
        (None, Some(media_dir)) if config.accounts.is_none() => UploadsConfig {
            dir: media_dir.join("uploads"),
            account_quota_bytes: None,
            library_user_quota_bytes: 0,
        },
        (None, _) => return Ok(None),
    };
    Ok(Some(UploadsConfig {
        dir: create_absolute_dir(&uploads.dir)?,
        ..uploads
    }))
}

/// Creates the directory if needed and returns its absolute path, so that plugin grants
/// do not depend on the server's working directory. On Windows the path keeps its ordinary
/// form rather than the `\\?\` form, in which a plugin's `/` separators would not count.
fn create_absolute_dir(dir: &Path) -> std::io::Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    dunce::canonicalize(dir)
}

/// Binaries that `paths` does not name are looked up through `EASYIMMERSE_FFMPEG_DIR`, next to the executable, and on `PATH`.
fn open_probe_cache(paths: FfmpegPaths) -> Option<ProbeCache> {
    match locate_binary(BinaryName::Ffprobe, &paths) {
        Ok(_) => Some(ProbeCache::new(paths)),
        Err(error) => {
            tracing::warn!("media files cannot be probed: {error}");
            None
        }
    }
}

fn open_conversion_service(cache_dir: PathBuf, paths: FfmpegPaths) -> Option<ConversionService> {
    match ConversionService::open(cache_dir, paths) {
        Ok(service) => Some(service),
        Err(error) => {
            tracing::warn!("media conversion is unavailable: {error}");
            None
        }
    }
}

/// Encoder discovery and cache cleanup run in the background,
/// so that they never delay the first request.
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

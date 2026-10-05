//! Starts the API server on the loopback interface with a database in the app data directory
//! and the conversion cache in the app cache directory.
//! A debug build opens the file named by `EASYIMMERSE_DATABASE` instead, when it is set.

use std::io::ErrorKind;
use std::net::Ipv4Addr;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::Duration;

use easyimmerse_api::{ApiConfig, ServeError, ServeOptions, ServerHandle, serve};
use easyimmerse_storage::{Storage, StorageError};
use tauri::{AppHandle, Manager};
use thiserror::Error;
use tokio::net::TcpListener;

const DEFAULT_PORT: u16 = 8787;
/// How long quitting waits for the server's in-flight requests before giving up on them.
const SHUTDOWN_PATIENCE: Duration = Duration::from_secs(5);
const DATABASE_FILE_NAME: &str = "easyimmerse.sqlite";
const DATABASE_OVERRIDE_VARIABLE: &str = "EASYIMMERSE_DATABASE";

/// The running server. Kept in the app's managed state so it lives as long as the app.
pub struct EmbeddedServer {
    pub url: String,
    pub token: String,
    /// Read only by the development file that desktop builds write.
    #[cfg_attr(not(desktop), allow(dead_code))]
    pub database_path: PathBuf,
    #[cfg_attr(not(desktop), allow(dead_code))]
    pub cache_dir: PathBuf,
    /// Taken when the app quits; the server keeps running while the handle exists.
    handle: Mutex<Option<ServerHandle>>,
}

impl EmbeddedServer {
    /// Stops the conversions, then the server. The ffmpeg processes of active conversions would
    /// otherwise outlive the app. Does nothing after the first call.
    pub fn shutdown(&self) {
        let handle = self.handle.lock().ok().and_then(|mut slot| slot.take());
        let Some(handle) = handle else {
            return;
        };
        let stopped = tauri::async_runtime::block_on(tokio::time::timeout(
            SHUTDOWN_PATIENCE,
            handle.shutdown(),
        ));
        match stopped {
            Ok(Ok(())) => {}
            Ok(Err(error)) => tracing::warn!("the embedded server did not stop cleanly: {error}"),
            Err(_) => {
                tracing::warn!("the embedded server did not stop within {SHUTDOWN_PATIENCE:?}")
            }
        }
    }
}

#[derive(Debug, Error)]
pub enum EmbeddedServerError {
    #[error("could not resolve the app data directory: {0}")]
    AppDataDir(#[from] tauri::Error),
    #[error("could not create the database directory {path}: {source}")]
    CreateDataDir {
        path: PathBuf,
        source: std::io::Error,
    },
    #[error("could not create the cache directory {path}: {source}")]
    CreateCacheDir {
        path: PathBuf,
        source: std::io::Error,
    },
    #[error("could not open the database: {0}")]
    Storage(#[from] StorageError),
    #[error("could not bind the loopback interface: {0}")]
    Bind(std::io::Error),
    #[error(transparent)]
    Serve(#[from] ServeError),
}

/// Opens the database, binds a loopback port, and serves the API on the app's async runtime.
pub fn start(app: &AppHandle) -> Result<EmbeddedServer, EmbeddedServerError> {
    let database_path = database_path(app)?;
    let storage = open_storage(&database_path)?;
    let cache_dir = create_cache_dir(app)?;
    let token = hex::encode(rand::random::<[u8; 32]>());
    let serving = serve_on_loopback(storage, cache_dir.clone(), token.clone());
    let (port, handle) = tauri::async_runtime::block_on(serving)?;
    Ok(EmbeddedServer {
        url: format!("http://127.0.0.1:{port}"),
        token,
        database_path,
        cache_dir,
        handle: Mutex::new(Some(handle)),
    })
}

async fn serve_on_loopback(
    storage: Storage,
    cache_dir: PathBuf,
    token: String,
) -> Result<(u16, ServerHandle), EmbeddedServerError> {
    let listener = bind_loopback().await?;
    let port = listener
        .local_addr()
        .map_err(EmbeddedServerError::Bind)?
        .port();
    let config = ApiConfig::for_loopback(port, token, true);
    let options = ServeOptions {
        cache_dir: Some(cache_dir),
    };
    let handle = serve(listener, config, storage, options).await?;
    tracing::info!("embedded server listening on 127.0.0.1:{port}");
    Ok((port, handle))
}

/// Binds the default port, or any free port when the default is taken.
async fn bind_loopback() -> Result<TcpListener, EmbeddedServerError> {
    let bound = match TcpListener::bind((Ipv4Addr::LOCALHOST, DEFAULT_PORT)).await {
        Err(error) if error.kind() == ErrorKind::AddrInUse => {
            TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await
        }
        result => result,
    };
    bound.map_err(EmbeddedServerError::Bind)
}

fn database_path(app: &AppHandle) -> Result<PathBuf, EmbeddedServerError> {
    match read_database_override() {
        Some(path) => Ok(path),
        None => Ok(app.path().app_data_dir()?.join(DATABASE_FILE_NAME)),
    }
}

fn open_storage(path: &Path) -> Result<Storage, EmbeddedServerError> {
    if let Some(directory) = path.parent() {
        std::fs::create_dir_all(directory).map_err(|source| {
            EmbeddedServerError::CreateDataDir {
                path: directory.to_path_buf(),
                source,
            }
        })?;
    }
    tracing::info!("opening the database at {}", path.display());
    let storage = Storage::open(path)?;
    storage.seed_placeholder_projects()?;
    Ok(storage)
}

fn create_cache_dir(app: &AppHandle) -> Result<PathBuf, EmbeddedServerError> {
    let path = app.path().app_cache_dir()?;
    std::fs::create_dir_all(&path).map_err(|source| EmbeddedServerError::CreateCacheDir {
        path: path.clone(),
        source,
    })?;
    Ok(path)
}

/// Reads the database path a developer chose, which release builds ignore.
fn read_database_override() -> Option<PathBuf> {
    if !cfg!(debug_assertions) {
        return None;
    }
    let value = std::env::var_os(DATABASE_OVERRIDE_VARIABLE)?;
    let repository_root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../..");
    resolve_database_override(&value, &repository_root)
}

/// Resolves a chosen database path, reading a relative path from the repository root.
/// An empty value chooses nothing.
fn resolve_database_override(value: &std::ffi::OsStr, repository_root: &Path) -> Option<PathBuf> {
    if value.is_empty() {
        return None;
    }
    Some(repository_root.join(value))
}

#[cfg(test)]
mod tests {
    use std::ffi::OsStr;

    use super::*;

    #[test]
    fn reads_a_relative_path_from_the_repository_root() {
        let path = resolve_database_override(OsStr::new(".dev/a.sqlite"), Path::new("/repo"));
        assert_eq!(path, Some(PathBuf::from("/repo/.dev/a.sqlite")));
    }

    #[test]
    fn keeps_an_absolute_path() {
        let path = resolve_database_override(OsStr::new("/tmp/a.sqlite"), Path::new("/repo"));
        assert_eq!(path, Some(PathBuf::from("/tmp/a.sqlite")));
    }

    #[test]
    fn chooses_nothing_for_an_empty_value() {
        let path = resolve_database_override(OsStr::new(""), Path::new("/repo"));
        assert_eq!(path, None);
    }
}

/// The pages show images, fonts and sounds that the embedded server serves, such as those stored with dictionaries.
#[cfg(test)]
mod content_security_policy_tests {
    use std::path::Path;

    const SERVER_SOURCE: &str = "http://127.0.0.1:*";

    fn allows_the_server(directive: &str) -> bool {
        let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("tauri.conf.json");
        let config: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap();
        let sources = config["app"]["security"]["csp"][directive]
            .as_str()
            .unwrap_or_default();
        sources
            .split_whitespace()
            .any(|source| source == SERVER_SOURCE)
    }

    #[test]
    fn allows_images_from_the_server() {
        assert!(allows_the_server("img-src"));
    }

    #[test]
    fn allows_fonts_from_the_server() {
        assert!(allows_the_server("font-src"));
    }

    #[test]
    fn allows_sounds_and_video_from_the_server() {
        assert!(allows_the_server("media-src"));
    }
}

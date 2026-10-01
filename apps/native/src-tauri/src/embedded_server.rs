//! Starts the API server on the loopback interface with a database in the app data directory.
//! Media conversions are cached in the app cache directory.

use std::io::ErrorKind;
use std::net::Ipv4Addr;
use std::path::PathBuf;

use easyimmerse_api::{
    ApiConfig, AppState, ConversionService, ServeError, ServerHandle, serve,
    start_conversion_service,
};
use easyimmerse_storage::{Storage, StorageError};
use tauri::{AppHandle, Manager};
use thiserror::Error;
use tokio::net::TcpListener;

const DEFAULT_PORT: u16 = 8787;
const DATABASE_FILE_NAME: &str = "easyimmerse.sqlite";

/// The running server. Kept in the app's managed state so it lives as long as the app.
pub struct EmbeddedServer {
    pub url: String,
    pub token: String,
    /// Unused after start-up, but the server keeps running while the handle exists.
    #[allow(dead_code)]
    handle: ServerHandle,
}

#[derive(Debug, Error)]
pub enum EmbeddedServerError {
    #[error("could not resolve the app data directory: {0}")]
    AppDataDir(#[from] tauri::Error),
    #[error("could not create the app data directory {path}: {source}")]
    CreateDataDir {
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
    let storage = open_storage(app)?;
    // Tauri places the bundled ffmpeg and ffprobe next to the executable, where the conversion service finds them.
    let conversions = start_conversion_service(cache_dir(app));
    let token = hex::encode(rand::random::<[u8; 32]>());
    tauri::async_runtime::block_on(serve_on_loopback(storage, conversions, token))
}

async fn serve_on_loopback(
    storage: Storage,
    conversions: Option<ConversionService>,
    token: String,
) -> Result<EmbeddedServer, EmbeddedServerError> {
    let listener = bind_loopback().await?;
    let port = listener
        .local_addr()
        .map_err(EmbeddedServerError::Bind)?
        .port();
    let config = ApiConfig::for_loopback(port, token.clone(), true);
    let state = AppState::new(storage, config).with_conversions(conversions);
    let handle = serve(listener, state).await?;
    tracing::info!("embedded server listening on 127.0.0.1:{port}");
    Ok(EmbeddedServer {
        url: format!("http://127.0.0.1:{port}"),
        token,
        handle,
    })
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

fn open_storage(app: &AppHandle) -> Result<Storage, EmbeddedServerError> {
    let directory = app.path().app_data_dir()?;
    std::fs::create_dir_all(&directory).map_err(|source| EmbeddedServerError::CreateDataDir {
        path: directory.clone(),
        source,
    })?;
    let storage = Storage::open(&directory.join(DATABASE_FILE_NAME))?;
    storage.seed_placeholder_projects()?;
    Ok(storage)
}

/// Returns the app cache directory, or `None` with a warning when the platform has none.
fn cache_dir(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_cache_dir()
        .inspect_err(|error| tracing::warn!("could not resolve the app cache directory: {error}"))
        .ok()
}

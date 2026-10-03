use std::net::SocketAddr;
use std::path::PathBuf;

use easyimmerse_storage::Storage;
use thiserror::Error;
use tokio::net::TcpListener;
use tokio::sync::oneshot;
use tokio::task::JoinHandle;

use crate::config::ApiConfig;
use crate::router::build_router;
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
}

impl ServerHandle {
    /// Stops accepting connections, waits for in-flight requests, and returns.
    pub async fn shutdown(self) -> Result<(), ServeError> {
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
}

/// Serves the API on an already bound listener, so that the caller knows the port.
pub async fn serve(
    listener: TcpListener,
    config: ApiConfig,
    storage: Storage,
    options: ServeOptions,
) -> Result<ServerHandle, ServeError> {
    let addr = listener.local_addr()?;
    let (router, _) = build_router(AppState::new(storage, config, options.cache_dir));
    let (shutdown, shutdown_requested) = oneshot::channel();
    let server = axum::serve(listener, router).with_graceful_shutdown(async {
        let _ = shutdown_requested.await;
    });
    let task = tokio::spawn(server.into_future());
    Ok(ServerHandle {
        addr,
        shutdown,
        task,
    })
}

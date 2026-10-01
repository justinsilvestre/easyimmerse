use std::net::SocketAddr;

use easyimmerse_conversion::ConversionService;
use thiserror::Error;
use tokio::net::TcpListener;
use tokio::sync::oneshot;
use tokio::task::JoinHandle;

use crate::conversion_cleanup::clean_up_conversion_cache;
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
    conversions: Option<ConversionService>,
}

impl ServerHandle {
    /// Stops accepting connections, stops every conversion, waits for in-flight requests, and returns.
    pub async fn shutdown(self) -> Result<(), ServeError> {
        // The receiver is gone only if the server already stopped, which is fine.
        let _ = self.shutdown.send(());
        // Stopping conversions first makes requests that wait for a segment fail at once instead of delaying the shutdown.
        if let Some(conversions) = self.conversions {
            conversions.shutdown().await;
        }
        self.task.await??;
        Ok(())
    }
}

/// Serves the API on an already bound listener, so that the caller knows the port.
/// Cleans up the conversion cache in the background meanwhile.
pub async fn serve(listener: TcpListener, state: AppState) -> Result<ServerHandle, ServeError> {
    let addr = listener.local_addr()?;
    let conversions = state.conversions.clone();
    tokio::spawn(clean_up_conversion_cache(state.clone()));
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
        conversions,
    })
}

//! Runs the API server inside the app, with the settings of the app's server config file.
//!
//! The server always serves a private listener on a random loopback port, which only the app's own window uses.
//! Starting "the server" in the settings adds a public listener on the configured address,
//! so that other devices can reach the same server.
//! A change of settings that affects how the server runs
//! restarts it on the same private port with the same launch token, so the window keeps working.

use std::net::Ipv4Addr;
use std::path::PathBuf;
use std::sync::OnceLock;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use easyimmerse_api::server_control::{DesktopServerSettings, DesktopServerStatus, ServerRunState};
use easyimmerse_api::{ListenerHandle, ServerHandle};
use easyimmerse_server::config_file::{ConfigFileError, IN_MEMORY_DATABASE, ServerFileConfig};
use easyimmerse_server::serve_command::start_server_on;
use easyimmerse_server::serve_settings::ServeSettings;
use thiserror::Error;
use tokio::net::TcpListener;
use tokio::sync::Mutex;

use crate::server_addresses::{expected_hosts, host_name, lan_ipv4_addresses};
use crate::server_settings::{
    AppLocations, SettingsError, desktop_settings, file_text_with, needs_restart, read_file_text,
    serve_settings, serves_web_app,
};
use crate::server_status::status_of;

/// How long stopping waits for the in-flight requests of a listener before giving up on them.
const SHUTDOWN_PATIENCE: Duration = Duration::from_secs(5);

type StatusListener = Box<dyn Fn(&DesktopServerStatus) + Send + Sync>;

/// The server inside the app. Kept in the app's managed state so it lives as long as the app.
pub struct EmbeddedServer {
    /// The address of the private listener, which the app's window uses.
    pub url: String,
    pub token: String,
    /// Read only by the development file that desktop builds write.
    #[cfg_attr(not(desktop), allow(dead_code))]
    pub database_path: PathBuf,
    #[cfg_attr(not(desktop), allow(dead_code))]
    pub cache_dir: PathBuf,
    locations: AppLocations,
    private_port: u16,
    public_running: AtomicBool,
    on_status: OnceLock<StatusListener>,
    state: Mutex<ServerState>,
}

struct ServerState {
    /// The config file completed with the app's defaults.
    completed: ServerFileConfig,
    settings: ServeSettings,
    /// None only after a restart failed.
    instance: Option<Instance>,
    public: Option<ListenerHandle>,
    run_state: ServerRunState,
}

struct Instance {
    handle: ServerHandle,
    /// The `Host` header values this instance accepts.
    hosts: Vec<String>,
}

#[derive(Debug, Error)]
pub enum EmbeddedServerError {
    #[error("could not create the directory {path}: {source}")]
    CreateDir {
        path: PathBuf,
        source: std::io::Error,
    },
    #[error("could not bind the loopback interface: {0}")]
    Bind(std::io::Error),
    #[error("{0}")]
    Start(String),
}

#[derive(Debug, Error)]
pub enum SaveSettingsError {
    #[error(transparent)]
    Settings(#[from] SettingsError),
    #[error(transparent)]
    File(#[from] ConfigFileError),
    #[error("could not read the config file {path}: {source}")]
    Read {
        path: PathBuf,
        source: std::io::Error,
    },
    #[error("could not write the config file {path}: {source}")]
    Write {
        path: PathBuf,
        source: std::io::Error,
    },
}

/// Reads the config file, binds the private listener, and starts the server on the app's async runtime.
/// An invalid config file leaves the app's defaults in place and is reported through the status.
pub fn start(locations: AppLocations) -> Result<EmbeddedServer, EmbeddedServerError> {
    create_dir(&locations.data_dir)?;
    create_dir(&locations.cache_dir)?;
    let (file, run_state) = match ServerFileConfig::load_or_default(&locations.config_path()) {
        Ok(file) => (file, ServerRunState::Stopped),
        Err(error) => {
            tracing::error!("{error}; using the default settings");
            let message = error.to_string();
            (
                ServerFileConfig::default(),
                ServerRunState::Failed { message },
            )
        }
    };
    let completed = locations.complete(file);
    let token = hex::encode(rand::random::<[u8; 32]>());
    let settings = serve_settings(&completed, &token);
    let (port, instance) = tauri::async_runtime::block_on(start_first_instance(&settings))?;
    tracing::info!("embedded server listening on 127.0.0.1:{port}");
    Ok(EmbeddedServer {
        url: format!("http://127.0.0.1:{port}"),
        token,
        database_path: settings
            .db
            .clone()
            .unwrap_or_else(|| PathBuf::from(IN_MEMORY_DATABASE)),
        cache_dir: settings.cache_dir.clone().unwrap_or_default(),
        locations,
        private_port: port,
        public_running: AtomicBool::new(false),
        on_status: OnceLock::new(),
        state: Mutex::new(ServerState {
            completed,
            settings,
            instance: Some(instance),
            public: None,
            run_state,
        }),
    })
}

impl EmbeddedServer {
    /// Calls `listener` with the new status after every change. Only the first call counts.
    pub fn set_status_listener(
        &self,
        listener: impl Fn(&DesktopServerStatus) + Send + Sync + 'static,
    ) {
        let _ = self.on_status.set(Box::new(listener));
    }

    /// Whether the public listener is running, which keeps the app open without a window.
    pub fn is_public_running(&self) -> bool {
        self.public_running.load(Ordering::SeqCst)
    }

    pub async fn autostarts(&self) -> bool {
        self.state.lock().await.completed.should_autostart()
    }

    pub async fn settings(&self) -> DesktopServerSettings {
        let state = self.state.lock().await;
        desktop_settings(&state.settings, &state.completed)
    }

    pub async fn status(&self) -> DesktopServerStatus {
        describe(&*self.state.lock().await)
    }

    /// Starts the public listener, unless it runs already.
    pub async fn start_public(&self) -> DesktopServerStatus {
        let mut state = self.state.lock().await;
        if state.public.is_none() {
            self.refresh_instance(&mut state).await;
            self.open_public(&mut state).await;
        }
        describe(&state)
    }

    /// Stops the public listener. The app's window keeps its private listener.
    pub async fn stop_public(&self) -> DesktopServerStatus {
        let mut state = self.state.lock().await;
        self.close_public(&mut state).await;
        state.run_state = ServerRunState::Stopped;
        self.notify(&state);
        describe(&state)
    }

    /// Writes `new` into the config file and restarts the server when that changes how it runs.
    pub async fn save_settings(
        &self,
        new: &DesktopServerSettings,
    ) -> Result<DesktopServerStatus, SaveSettingsError> {
        let mut state = self.state.lock().await;
        let old = desktop_settings(&state.settings, &state.completed);
        let completed = self.write_settings(new)?;
        state.settings = serve_settings(&completed, &self.token);
        state.completed = completed;
        if needs_restart(&old, &desktop_settings(&state.settings, &state.completed)) {
            self.restart(&mut state).await;
        } else if state.public.is_none() && state.instance.is_some() {
            state.run_state = ServerRunState::Stopped;
        }
        self.notify(&state);
        Ok(describe(&state))
    }

    /// Stops the conversions, then every listener.
    /// The ffmpeg processes of active conversions would otherwise outlive the app.
    pub fn shutdown(&self) {
        tauri::async_runtime::block_on(async {
            let mut state = self.state.lock().await;
            self.close_public(&mut state).await;
            if let Some(instance) = state.instance.take() {
                stop_instance(instance).await;
            }
        });
    }

    fn write_settings(
        &self,
        new: &DesktopServerSettings,
    ) -> Result<ServerFileConfig, SaveSettingsError> {
        let path = self.locations.config_path();
        let read_error = |source| SaveSettingsError::Read {
            path: path.clone(),
            source,
        };
        let text = read_file_text(&path).map_err(read_error)?;
        ServerFileConfig::parse(&text, &path)?;
        let updated = file_text_with(&text, new)?;
        let file = ServerFileConfig::parse(&updated, &path)?;
        let write_error = |source| SaveSettingsError::Write {
            path: path.clone(),
            source,
        };
        std::fs::create_dir_all(&self.locations.config_dir).map_err(write_error)?;
        std::fs::write(&path, updated).map_err(write_error)?;
        Ok(self.locations.complete(file))
    }

    /// Restarts the server when the machine's addresses changed since it started,
    /// so that requests addressed to a new LAN address are accepted,
    /// or when a restart failed earlier.
    async fn refresh_instance(&self, state: &mut ServerState) {
        let current = state.instance.as_ref().map(|instance| &instance.hosts);
        if current != Some(&hosts_for(self.private_port, &state.settings)) {
            tracing::info!("restarting the embedded server for the current network addresses");
            self.restart(state).await;
        }
    }

    /// Stops the whole server and starts it again on the same private port,
    /// then reopens the public listener if it was open.
    async fn restart(&self, state: &mut ServerState) {
        let was_public = state.public.is_some();
        self.close_public(state).await;
        if let Some(instance) = state.instance.take() {
            stop_instance(instance).await;
        }
        state.run_state = ServerRunState::Stopped;
        match start_instance(self.private_port, &state.settings).await {
            Ok(instance) => state.instance = Some(instance),
            Err(message) => {
                tracing::error!("the embedded server could not restart: {message}");
                state.run_state = ServerRunState::Failed { message };
            }
        }
        if was_public {
            self.open_public(state).await;
        }
    }

    async fn open_public(&self, state: &mut ServerState) {
        if state.instance.is_none() {
            self.notify(state);
            return;
        }
        state.run_state = ServerRunState::Starting;
        self.notify(state);
        let bind = state.settings.bind;
        let opened = TcpListener::bind(bind)
            .await
            .and_then(|listener| serve_also(state.instance.as_ref(), listener));
        match opened {
            Ok(public) => {
                tracing::info!("the server is listening on {}", public.addr);
                state.public = Some(public);
                state.run_state = ServerRunState::Running;
                self.public_running.store(true, Ordering::SeqCst);
            }
            Err(error) => {
                let message = format!("could not listen on {bind}: {error}");
                tracing::error!("{message}");
                state.run_state = ServerRunState::Failed { message };
            }
        }
        self.notify(state);
    }

    async fn close_public(&self, state: &mut ServerState) {
        let Some(public) = state.public.take() else {
            return;
        };
        self.public_running.store(false, Ordering::SeqCst);
        let addr = public.addr;
        match tokio::time::timeout(SHUTDOWN_PATIENCE, public.shutdown()).await {
            Ok(Ok(())) => tracing::info!("the server stopped listening on {addr}"),
            Ok(Err(error)) => {
                tracing::warn!("the listener on {addr} did not stop cleanly: {error}")
            }
            Err(_) => {
                tracing::warn!("the listener on {addr} did not stop within {SHUTDOWN_PATIENCE:?}")
            }
        }
    }

    fn notify(&self, state: &ServerState) {
        if let Some(listener) = self.on_status.get() {
            listener(&describe(state));
        }
    }
}

fn serve_also(
    instance: Option<&Instance>,
    listener: TcpListener,
) -> std::io::Result<ListenerHandle> {
    match instance {
        Some(instance) => instance.handle.serve_also(listener),
        None => Err(std::io::Error::other("the server is not running")),
    }
}

fn describe(state: &ServerState) -> DesktopServerStatus {
    status_of(
        state.run_state.clone(),
        state.public.as_ref().map(|public| public.addr),
        &lan_ipv4_addresses(),
        serves_web_app(&state.settings),
    )
}

fn hosts_for(private_port: u16, settings: &ServeSettings) -> Vec<String> {
    expected_hosts(
        private_port,
        settings.bind,
        &lan_ipv4_addresses(),
        host_name().as_deref(),
        &settings.expected_hosts,
    )
}

/// Binds a random loopback port and starts the first instance on it.
async fn start_first_instance(
    settings: &ServeSettings,
) -> Result<(u16, Instance), EmbeddedServerError> {
    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0))
        .await
        .map_err(EmbeddedServerError::Bind)?;
    let port = listener
        .local_addr()
        .map_err(EmbeddedServerError::Bind)?
        .port();
    let instance = serve_instance(listener, port, settings)
        .await
        .map_err(EmbeddedServerError::Start)?;
    Ok((port, instance))
}

/// Starts a server on the private port that accepts the hosts of both listeners.
async fn start_instance(private_port: u16, settings: &ServeSettings) -> Result<Instance, String> {
    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, private_port))
        .await
        .map_err(|error| {
            format!("could not listen on the loopback port {private_port}: {error}")
        })?;
    serve_instance(listener, private_port, settings).await
}

// Each instance binds the port anew rather than serving a clone of one long-lived socket,
// because on Windows the server never accepted a connection on such a clone.
async fn serve_instance(
    listener: TcpListener,
    private_port: u16,
    settings: &ServeSettings,
) -> Result<Instance, String> {
    let hosts = hosts_for(private_port, settings);
    let instance_settings = ServeSettings {
        expected_hosts: hosts.clone(),
        ..settings.clone()
    };
    let started = start_server_on(listener, &instance_settings)
        .await
        .map_err(|error| format!("{error:#}"))?;
    Ok(Instance {
        handle: started.handle,
        hosts,
    })
}

async fn stop_instance(instance: Instance) {
    match tokio::time::timeout(SHUTDOWN_PATIENCE, instance.handle.shutdown()).await {
        Ok(Ok(())) => {}
        Ok(Err(error)) => tracing::warn!("the embedded server did not stop cleanly: {error}"),
        Err(_) => tracing::warn!("the embedded server did not stop within {SHUTDOWN_PATIENCE:?}"),
    }
}

fn create_dir(path: &std::path::Path) -> Result<(), EmbeddedServerError> {
    std::fs::create_dir_all(path).map_err(|source| EmbeddedServerError::CreateDir {
        path: path.to_path_buf(),
        source,
    })
}

/// The pages show images, fonts and sounds that the embedded server serves, such as those stored with dictionaries,
/// and reach servers on the local network or the internet that a person pairs the app with or signs in to.
#[cfg(test)]
mod content_security_policy_tests {
    use std::path::Path;

    const SERVER_SOURCE: &str = "http://127.0.0.1:*";

    fn sources_of(directive: &str) -> Vec<String> {
        let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("tauri.conf.json");
        let config: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap();
        config["app"]["security"]["csp"][directive]
            .as_str()
            .unwrap_or_default()
            .split_whitespace()
            .map(str::to_string)
            .collect()
    }

    fn allows(directive: &str, source: &str) -> bool {
        sources_of(directive).iter().any(|found| found == source)
    }

    #[test]
    fn allows_images_from_the_server() {
        assert!(allows("img-src", SERVER_SOURCE));
    }

    #[test]
    fn allows_fonts_from_the_server() {
        assert!(allows("font-src", SERVER_SOURCE));
    }

    #[test]
    fn allows_sounds_and_video_from_the_server() {
        assert!(allows("media-src", SERVER_SOURCE));
    }

    #[test]
    fn allows_requests_to_a_server_on_the_local_network() {
        assert!(allows("connect-src", "http:"));
    }

    #[test]
    fn allows_requests_to_a_server_on_the_internet() {
        assert!(allows("connect-src", "https:"));
    }

    #[test]
    fn allows_the_ipc_channel() {
        assert!(allows("connect-src", "ipc:"));
    }
}

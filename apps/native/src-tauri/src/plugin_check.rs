//! A self-check proving the plugin host runs on this platform: it loads the embedded
//! `hello-rust` plugin and calls its `greet` export.
//!
//! The `plugin-check` feature turns the check on. The end-to-end tests call it through
//! the `check_plugin_host` command, and the smoke test runs it after the health check.

use tauri::{Builder, Wry};

#[cfg(feature = "plugin-check")]
pub use enabled::{PluginCheckError, run};

/// Registers the `check_plugin_host` command when the feature is on.
#[cfg(feature = "plugin-check")]
pub fn register(builder: Builder<Wry>) -> Builder<Wry> {
    builder.invoke_handler(tauri::generate_handler![enabled::check_plugin_host])
}

#[cfg(not(feature = "plugin-check"))]
pub fn register(builder: Builder<Wry>) -> Builder<Wry> {
    builder
}

#[cfg(feature = "plugin-check")]
mod enabled {
    use std::path::PathBuf;

    use easyimmerse_plugins::{ExecutionMode, HelloPlugin, HostLimits, PluginError};
    use serde::Serialize;
    use tauri::{AppHandle, Manager};
    use thiserror::Error;

    use crate::embedded_plugin;

    /// What the check found: the plugin's greeting and how wasmtime ran it.
    #[derive(Debug, Clone, PartialEq, Eq, Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct PluginHostCheck {
        pub greeting: String,
        pub execution_mode: String,
    }

    #[derive(Debug, Error)]
    pub enum PluginCheckError {
        #[error(transparent)]
        Tauri(#[from] tauri::Error),
        #[error("could not write the embedded plugin to {path}: {source}")]
        Write {
            path: PathBuf,
            source: std::io::Error,
        },
        #[error(transparent)]
        Plugin(#[from] PluginError),
    }

    /// Commands return their errors to the page as text.
    impl Serialize for PluginCheckError {
        fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
            serializer.serialize_str(&self.to_string())
        }
    }

    /// Runs the check on a blocking thread, since compiling the plugin takes seconds.
    #[tauri::command]
    pub async fn check_plugin_host(app: AppHandle) -> Result<PluginHostCheck, PluginCheckError> {
        tauri::async_runtime::spawn_blocking(move || run(&app)).await?
    }

    /// Loads the embedded plugin in the execution mode for this platform and greets `world`.
    pub fn run(app: &AppHandle) -> Result<PluginHostCheck, PluginCheckError> {
        let mode = ExecutionMode::from_env();
        let package = embedded_plugin::unpack_into(&app.path().app_cache_dir()?)?;
        let mut plugin = HelloPlugin::load(&package, mode, HostLimits::default())?;
        let (greeting, _log) = plugin.greet("world")?;
        Ok(PluginHostCheck {
            greeting,
            execution_mode: mode.name().to_owned(),
        })
    }
}

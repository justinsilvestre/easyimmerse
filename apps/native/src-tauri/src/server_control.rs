//! The commands through which the desktop app's window configures, starts, stops and observes the server that other devices reach,
//! and the event that tells it about every change.

use easyimmerse_api::server_control::{DesktopServerSettings, DesktopServerStatus, ServerLogEntry};
use tauri::{AppHandle, Emitter, State};

use crate::embedded_server::EmbeddedServer;
use crate::server_logs::ServerLogs;
use crate::tray;

/// The event that carries each new [`DesktopServerStatus`] to the window.
pub const STATUS_EVENT: &str = "desktop-server-status";

#[tauri::command]
pub async fn get_desktop_server_settings(
    server: State<'_, EmbeddedServer>,
) -> Result<DesktopServerSettings, String> {
    Ok(server.settings().await)
}

#[tauri::command]
pub async fn save_desktop_server_settings(
    server: State<'_, EmbeddedServer>,
    settings: DesktopServerSettings,
) -> Result<DesktopServerStatus, String> {
    server
        .save_settings(&settings)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn start_desktop_server(
    server: State<'_, EmbeddedServer>,
) -> Result<DesktopServerStatus, String> {
    Ok(server.start_public().await)
}

#[tauri::command]
pub async fn stop_desktop_server(
    server: State<'_, EmbeddedServer>,
) -> Result<DesktopServerStatus, String> {
    Ok(server.stop_public().await)
}

#[tauri::command]
pub async fn get_desktop_server_status(
    server: State<'_, EmbeddedServer>,
) -> Result<DesktopServerStatus, String> {
    Ok(server.status().await)
}

#[tauri::command]
pub fn get_desktop_server_logs(logs: State<'_, ServerLogs>) -> Vec<ServerLogEntry> {
    logs.entries()
}

/// Tells the window and the tray about a new status.
pub fn publish(app: &AppHandle, status: &DesktopServerStatus) {
    if let Err(error) = app.emit(STATUS_EVENT, status) {
        tracing::warn!("could not send the server status to the window: {error}");
    }
    tray::show_status(app, status);
}

//! Keeps the app running after its window closes while other devices use its server,
//! and brings the window back from the tray or, on macOS, the dock.
//!
//! The window closes as usual, so that a page holding unsaved work can ask first,
//! and is made again when it is opened.
//! Quitting from a menu stops the server for other devices and then closes the windows,
//! after which the app ends.

use tauri::{AppHandle, ExitRequestApi, Manager};

use crate::embedded_server::EmbeddedServer;
use crate::main_window;

/// Stops the server for other devices, then closes the windows, each of which may ask first.
pub fn quit(app: &AppHandle) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Some(server) = app.try_state::<EmbeddedServer>() {
            server.stop_public().await;
        }
        let handle = app.clone();
        if let Err(error) = app.run_on_main_thread(move || close_windows(&handle)) {
            tracing::warn!("could not close the windows on Quit: {error}");
        }
    });
}

/// Closes every window, or ends the app when there is none.
fn close_windows(app: &AppHandle) {
    let windows = app.webview_windows();
    if windows.is_empty() {
        app.exit(0);
    }
    for window in windows.values() {
        if let Err(error) = window.close() {
            tracing::warn!("could not close a window on Quit: {error}");
        }
    }
}

/// Shows the main window, making it again when it was closed.
pub fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }
    let Some(server) = app.try_state::<EmbeddedServer>() else {
        return;
    };
    if let Err(error) = main_window::create(app, &server) {
        tracing::error!("could not open the window: {error}");
    }
}

/// Keeps the app open when its last window closed while the public listener runs,
/// unless nothing could bring the window back.
pub fn on_exit_requested(app: &AppHandle, code: Option<i32>, api: &ExitRequestApi) {
    let is_window_closing = code.is_none();
    let is_serving = app
        .try_state::<EmbeddedServer>()
        .is_some_and(|server| server.is_public_running());
    if is_window_closing && is_serving && can_reopen(app) {
        tracing::info!("the window closed; the server keeps running");
        api.prevent_exit();
    }
}

/// Whether the tray, or on macOS the dock, can bring the window back.
fn can_reopen(app: &AppHandle) -> bool {
    cfg!(target_os = "macos") || app.try_state::<crate::tray::Tray>().is_some()
}

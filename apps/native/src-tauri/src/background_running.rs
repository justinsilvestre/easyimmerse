//! Keeps the app running after its window closes while other devices use its server,
//! and brings the window back from the tray or, on macOS, the dock.
//!
//! The window closes as usual, so that a page holding unsaved work can still ask first,
//! and is made again when it is opened.
//! Only quitting from a menu ends the app while the server runs.

use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{AppHandle, ExitRequestApi, Manager, Runtime};

use crate::embedded_server::EmbeddedServer;
use crate::main_window;

/// Set once the person chose to quit, so that closing the last window then ends the app.
#[derive(Default)]
pub struct QuitRequested(AtomicBool);

/// Closes the windows, each of which may ask first, and lets the app end once they are closed.
pub fn quit<R: Runtime>(app: &AppHandle<R>) {
    if let Some(requested) = app.try_state::<QuitRequested>() {
        requested.0.store(true, Ordering::SeqCst);
    }
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
/// unless the person chose to quit or nothing could bring the window back.
pub fn on_exit_requested(app: &AppHandle, code: Option<i32>, api: &ExitRequestApi) {
    let is_window_closing = code.is_none();
    let is_quitting = app
        .try_state::<QuitRequested>()
        .is_some_and(|requested| requested.0.load(Ordering::SeqCst));
    let is_serving = app
        .try_state::<EmbeddedServer>()
        .is_some_and(|server| server.is_public_running());
    if is_window_closing && is_serving && !is_quitting && can_reopen(app) {
        tracing::info!("the window closed; the server keeps running");
        api.prevent_exit();
    }
}

/// Whether the tray, or on macOS the dock, can bring the window back.
fn can_reopen(app: &AppHandle) -> bool {
    cfg!(target_os = "macos") || app.try_state::<crate::tray::Tray>().is_some()
}

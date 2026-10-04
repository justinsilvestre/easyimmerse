use tauri::{AppHandle, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

use crate::embedded_server::EmbeddedServer;
use crate::injected_config_script::injected_config_script;
use crate::navigation_guard::is_app_url;

/// Opens the app window with the server's address and token injected before any page script runs.
/// Navigation is limited to the app's own pages, so the injected token never reaches a remote page.
pub fn create(app: &AppHandle, server: &EmbeddedServer) -> tauri::Result<WebviewWindow> {
    let builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
        .title("easyImmerse")
        .initialization_script(injected_config_script(&server.url, &server.token))
        .on_navigation(is_app_url);
    // A mobile webview fills the screen, and a fixed size would leave a blank band below it.
    #[cfg(desktop)]
    let builder = builder.inner_size(1100.0, 720.0);
    builder.build()
}

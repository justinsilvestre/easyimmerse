//! Lets the end-to-end tests drive the app over WebDriver.
//!
//! The WebdriverIO Tauri service starts the app with `TAURI_WEBDRIVER_PORT` set. The embedded
//! WebDriver server plugin then listens on that loopback port, and the companion plugin answers
//! the service's questions about the app's windows. Only debug desktop builds with the `webdriver`
//! feature compile the plugins in, and they register them only when that variable is set, so an
//! ordinary development run exposes no automation server.

#[cfg(all(feature = "webdriver", debug_assertions, desktop))]
pub use enabled::add_plugins_when_requested;

#[cfg(not(all(feature = "webdriver", debug_assertions, desktop)))]
pub fn add_plugins_when_requested(builder: tauri::Builder<tauri::Wry>) -> tauri::Builder<tauri::Wry> {
    builder
}

#[cfg(all(feature = "webdriver", debug_assertions, desktop))]
mod enabled {
    use tauri::plugin::{Builder as PluginBuilder, TauriPlugin};
    use tauri::{Builder, Wry};

    const PORT_VARIABLE: &str = "TAURI_WEBDRIVER_PORT";

    pub fn add_plugins_when_requested(builder: Builder<Wry>) -> Builder<Wry> {
        if std::env::var_os(PORT_VARIABLE).is_none() {
            return builder;
        }
        tracing::info!("serving WebDriver on the port named by {PORT_VARIABLE}");
        builder
            .plugin(tauri_plugin_wdio::init())
            .plugin(tauri_plugin_wdio_webdriver::init())
            .plugin(window_bridge())
    }

    /// Points the service at the page's Tauri object, which the service's frontend package would
    /// otherwise do. The app bundle stays free of test code this way.
    fn window_bridge() -> TauriPlugin<Wry> {
        PluginBuilder::new("easyimmerse-webdriver")
            .js_init_script(
                r#"Object.defineProperty(window, "__wdio_original_core__", { get: () => window.__TAURI__?.core, configurable: true });"#
                    .to_owned(),
            )
            .build()
    }
}

//! The native shell: a Tauri app that starts the embedded API server on the loopback
//! interface and opens a window whose page talks to that server over plain HTTP.

#[cfg(target_os = "macos")]
mod app_menu;
#[cfg(desktop)]
mod dev_server_file;
#[cfg(feature = "plugin-check")]
mod embedded_plugin;
mod embedded_server;
mod injected_config_script;
mod main_window;
mod navigation_guard;
mod plugin_check;
mod smoke_test;
mod webdriver;

use tauri::{AppHandle, Manager, RunEvent};

use crate::embedded_server::EmbeddedServer;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    init_tracing();
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init());
    let builder = webdriver::add_plugins_when_requested(builder);
    let built = plugin_check::register(builder)
        .setup(|app| {
            let server = embedded_server::start(app.handle())?;
            if smoke_test::is_requested() {
                smoke_test::run_and_exit(app.handle(), &server);
            }
            #[cfg(desktop)]
            dev_server_file::write_in_debug_builds(&server);
            main_window::create(app.handle(), &server)?;
            #[cfg(target_os = "macos")]
            app_menu::install(app.handle())?;
            app.manage(server);
            Ok(())
        })
        .build(tauri::generate_context!());
    match built {
        Ok(app) => app.run(stop_server_on_exit),
        Err(error) => {
            tracing::error!("the app could not run: {error}");
            std::process::exit(1);
        }
    }
}

/// Quitting stops the embedded server, so that no ffmpeg process keeps converting afterwards.
fn stop_server_on_exit(app: &AppHandle, event: RunEvent) {
    if let RunEvent::Exit = event {
        app.state::<EmbeddedServer>().shutdown();
    }
}

#[cfg(not(target_os = "android"))]
fn init_tracing() {
    // Initialization fails only when a subscriber is already installed, which is harmless.
    let _ = tracing_subscriber::fmt()
        .with_env_filter(log_filter())
        .try_init();
}

/// Reads the log filter from `RUST_LOG`, showing info and above when it is unset.
#[cfg(not(target_os = "android"))]
fn log_filter() -> tracing_subscriber::EnvFilter {
    tracing_subscriber::EnvFilter::builder()
        .with_default_directive(tracing::Level::INFO.into())
        .from_env_lossy()
}

/// Sends events at the info level and above to logcat, since Android discards standard output.
#[cfg(target_os = "android")]
fn init_tracing() {
    let _ = tracing_subscriber::fmt()
        .with_writer(paranoid_android::AndroidLogMakeWriter::new(
            "easyimmerse".to_owned(),
        ))
        .with_max_level(tracing::Level::INFO)
        .with_ansi(false)
        .without_time()
        .try_init();
}

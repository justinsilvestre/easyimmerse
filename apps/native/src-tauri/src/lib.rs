//! The native shell: a Tauri app that starts the embedded API server on the loopback
//! interface and opens a window whose page talks to that server over plain HTTP.

mod embedded_server;
mod injected_config_script;
mod main_window;
mod navigation_guard;
mod smoke_test;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    init_tracing();
    let outcome = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let server = embedded_server::start(app.handle())?;
            if smoke_test::is_requested() {
                smoke_test::run_and_exit(&server);
            }
            main_window::create(app.handle(), &server)?;
            app.manage(server);
            Ok(())
        })
        .run(tauri::generate_context!());
    if let Err(error) = outcome {
        tracing::error!("the app could not run: {error}");
        std::process::exit(1);
    }
}

fn init_tracing() {
    // Initialization fails only when a subscriber is already installed, which is harmless.
    let _ = tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .try_init();
}

//! The native shell: a Tauri app that runs the API server in-process on a private loopback listener
//! and opens a window whose page talks to that server over plain HTTP.
//! On desktop, the server can also listen on a public address for other devices,
//! the tray icon controls it,
//! and the app runs the server's command line when started with one of its commands.

mod app_locations;
#[cfg(target_os = "macos")]
mod app_menu;
#[cfg(desktop)]
mod background_running;
#[cfg(desktop)]
mod command_line;
#[cfg(desktop)]
mod dev_server_file;
#[cfg(feature = "plugin-check")]
mod embedded_plugin;
// The mobile app uses only the private listener, so the server controls stay unused there.
#[cfg_attr(mobile, allow(dead_code))]
mod embedded_server;
mod injected_config_script;
mod main_window;
mod navigation_guard;
mod plugin_check;
#[cfg_attr(mobile, allow(dead_code))]
mod server_addresses;
#[cfg(desktop)]
mod server_control;
#[cfg_attr(mobile, allow(dead_code))]
mod server_logs;
#[cfg_attr(mobile, allow(dead_code))]
mod server_settings;
#[cfg_attr(mobile, allow(dead_code))]
mod server_status;
mod smoke_test;
#[cfg(desktop)]
mod tray;
mod webdriver;

use tauri::{App, AppHandle, Manager, RunEvent};

use crate::embedded_server::EmbeddedServer;
use crate::server_logs::ServerLogs;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let logs = init_tracing();
    let context = tauri::generate_context!();
    #[cfg(desktop)]
    if let Some(status) = command_line::run_if_requested(&context) {
        std::process::exit(status);
    }
    let builder = tauri::Builder::default()
        .manage(logs)
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init());
    #[cfg(mobile)]
    let builder = builder
        .plugin(tauri_plugin_save_copy::init())
        .plugin(tauri_plugin_barcode_scanner::init());
    let built = webdriver::add_plugins_when_requested(builder)
        .invoke_handler(tauri::generate_handler![
            #[cfg(feature = "plugin-check")]
            plugin_check::enabled::check_plugin_host,
            #[cfg(desktop)]
            server_control::get_desktop_server_settings,
            #[cfg(desktop)]
            server_control::save_desktop_server_settings,
            #[cfg(desktop)]
            server_control::start_desktop_server,
            #[cfg(desktop)]
            server_control::stop_desktop_server,
            #[cfg(desktop)]
            server_control::get_desktop_server_status,
            #[cfg(desktop)]
            server_control::get_desktop_server_logs,
        ])
        .setup(setup)
        .build(context);
    match built {
        Ok(app) => app.run(on_run_event),
        Err(error) => {
            tracing::error!("the app could not run: {error}");
            std::process::exit(1);
        }
    }
}

fn setup(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let server = embedded_server::start(app_locations::from_app(app.handle())?)?;
    if smoke_test::is_requested() {
        smoke_test::run_and_exit(app.handle(), &server);
    }
    #[cfg(desktop)]
    dev_server_file::write_in_debug_builds(&server);
    main_window::create(app.handle(), &server)?;
    #[cfg(target_os = "macos")]
    app_menu::install(app.handle())?;
    app.manage(server);
    #[cfg(desktop)]
    set_up_server_control(app.handle());
    Ok(())
}

/// Installs the tray, sends every status change to the window and the tray,
/// and starts the public listener when the config file asks for it.
#[cfg(desktop)]
fn set_up_server_control(app: &AppHandle) {
    if let Err(error) = tray::install(app) {
        tracing::warn!("could not show the tray icon: {error}");
    }
    let handle = app.clone();
    app.state::<EmbeddedServer>()
        .set_status_listener(move |status| server_control::publish(&handle, status));
    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        let server = handle.state::<EmbeddedServer>();
        server_control::publish(&handle, &server.status().await);
        if server.autostarts().await {
            server.start_public().await;
        }
    });
}

/// Quitting stops the embedded server, so that no ffmpeg process keeps converting afterwards.
fn on_run_event(app: &AppHandle, event: RunEvent) {
    match event {
        RunEvent::Exit => {
            if let Some(server) = app.try_state::<EmbeddedServer>() {
                server.shutdown();
            }
        }
        #[cfg(desktop)]
        RunEvent::ExitRequested { code, api, .. } => {
            background_running::on_exit_requested(app, code, &api);
        }
        #[cfg(target_os = "macos")]
        RunEvent::Reopen { .. } => background_running::show_main_window(app),
        _ => {}
    }
}

/// Logs to standard output and keeps the recent records for the server settings.
#[cfg(not(target_os = "android"))]
fn init_tracing() -> ServerLogs {
    use tracing_subscriber::layer::{Layer, SubscriberExt};
    use tracing_subscriber::util::SubscriberInitExt;

    let logs = ServerLogs::default();
    // Initialization fails only when a subscriber is already installed, which is harmless.
    let _ = tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer().with_filter(log_filter()))
        .with(logs.layer())
        .try_init();
    logs
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
fn init_tracing() -> ServerLogs {
    let _ = tracing_subscriber::fmt()
        .with_writer(paranoid_android::AndroidLogMakeWriter::new(
            "easyimmerse".to_owned(),
        ))
        .with_max_level(tracing::Level::INFO)
        .with_ansi(false)
        .without_time()
        .try_init();
    ServerLogs::default()
}

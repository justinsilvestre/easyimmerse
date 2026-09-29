#[cfg(desktop)]
mod local_server;

/// Returns the address of the API server started by the app, once the server accepts connections.
/// Returns nothing on mobile devices, where the app starts no server.
#[tauri::command]
async fn get_server_url(app: tauri::AppHandle) -> Option<String> {
    #[cfg(desktop)]
    return local_server::wait_for_server_url(&app).await;
    #[cfg(mobile)]
    return None;
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();
    // The address is chosen before any window opens, so that it is known when the window asks for it.
    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_shell::init())
        .manage(local_server::LocalServer::choose_address().expect("no port is available"))
        .setup(|app| local_server::start(app.handle()));
    builder
        .invoke_handler(tauri::generate_handler![get_server_url])
        .run(tauri::generate_context!())
        .expect("error while running the application");
}

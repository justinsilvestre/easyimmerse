//! The tray icon, whose menu shows whether the server runs, starts and stops it,
//! and brings back the window, which may be closed while other devices use the server.

use easyimmerse_api::server_control::{DesktopServerStatus, ServerRunState};
use tauri::image::Image;
use tauri::menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Manager, Wry};

use crate::background_running;
use crate::embedded_server::EmbeddedServer;

const ICON: &[u8] = include_bytes!("../icons/32x32.png");
const STATUS_ITEM_ID: &str = "tray-server-status";
const OPEN_ITEM_ID: &str = "tray-open";
const TOGGLE_ITEM_ID: &str = "tray-toggle-server";
const QUIT_ITEM_ID: &str = "tray-quit";

/// The menu items whose text follows the server's status.
#[derive(Clone)]
pub struct Tray {
    status: MenuItem<Wry>,
    toggle: MenuItem<Wry>,
}

pub fn install(app: &AppHandle) -> tauri::Result<()> {
    let status = MenuItem::with_id(app, STATUS_ITEM_ID, "Server stopped", false, None::<&str>)?;
    let open = MenuItem::with_id(app, OPEN_ITEM_ID, "Open easyImmerse", true, None::<&str>)?;
    let toggle = MenuItem::with_id(app, TOGGLE_ITEM_ID, "Start server", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, QUIT_ITEM_ID, "Quit easyImmerse", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[
            &status,
            &PredefinedMenuItem::separator(app)?,
            &open,
            &toggle,
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ],
    )?;
    TrayIconBuilder::with_id("main")
        .icon(Image::from_bytes(ICON)?)
        .tooltip("easyImmerse")
        .menu(&menu)
        .on_menu_event(on_menu_event)
        .build(app)?;
    app.manage(Tray { status, toggle });
    Ok(())
}

/// Updates the menu on the main thread, without waiting for it.
pub fn show_status(app: &AppHandle, status: &DesktopServerStatus) {
    let Some(tray) = app.try_state::<Tray>().map(|tray| tray.inner().clone()) else {
        return;
    };
    let (status_text, toggle_text) = menu_texts(status);
    let updated = app.run_on_main_thread(move || {
        let _ = tray.status.set_text(status_text);
        let _ = tray.toggle.set_text(toggle_text);
    });
    if let Err(error) = updated {
        tracing::warn!("could not update the tray menu: {error}");
    }
}

fn on_menu_event(app: &AppHandle, event: MenuEvent) {
    match event.id().as_ref() {
        OPEN_ITEM_ID => background_running::show_main_window(app),
        TOGGLE_ITEM_ID => toggle_server(app),
        QUIT_ITEM_ID => background_running::quit(app),
        _ => {}
    }
}

fn toggle_server(app: &AppHandle) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        let server = app.state::<EmbeddedServer>();
        if server.is_public_running() {
            server.stop_public().await;
        } else {
            server.start_public().await;
        }
    });
}

/// The status line and the label of the item that starts or stops the server.
fn menu_texts(status: &DesktopServerStatus) -> (String, &'static str) {
    match &status.state {
        ServerRunState::Running => match status.urls.first() {
            Some(url) => (format!("Server running at {url}"), "Stop server"),
            None => ("Server running".to_string(), "Stop server"),
        },
        ServerRunState::Starting => ("Server starting".to_string(), "Stop server"),
        ServerRunState::Stopped => ("Server stopped".to_string(), "Start server"),
        ServerRunState::Failed { message } => {
            (format!("Server not running: {message}"), "Start server")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn status(state: ServerRunState, urls: &[&str]) -> DesktopServerStatus {
        DesktopServerStatus {
            state,
            urls: urls.iter().map(|url| url.to_string()).collect(),
            lan_reachable: false,
            serves_web_app: false,
            pairing_url: None,
        }
    }

    #[test]
    fn names_the_first_url_while_running() {
        let texts = menu_texts(&status(
            ServerRunState::Running,
            &["http://192.168.1.5:8787"],
        ));
        assert_eq!(texts.0, "Server running at http://192.168.1.5:8787");
    }

    #[test]
    fn offers_to_stop_while_running() {
        assert_eq!(
            menu_texts(&status(ServerRunState::Running, &[])).1,
            "Stop server"
        );
    }

    #[test]
    fn offers_to_start_while_stopped() {
        assert_eq!(
            menu_texts(&status(ServerRunState::Stopped, &[])).1,
            "Start server"
        );
    }

    #[test]
    fn shows_why_the_server_is_not_running() {
        let failed = ServerRunState::Failed {
            message: "could not listen on 0.0.0.0:8787: address in use".to_string(),
        };
        assert_eq!(
            menu_texts(&status(failed, &[])).0,
            "Server not running: could not listen on 0.0.0.0:8787: address in use"
        );
    }
}

//! The macOS application menu: the default menu with a Preferences item (Cmd+,) added,
//! which asks the page to open its Settings screen, and with a Quit item (Cmd+Q) that closes the windows.
//! The default Quit item ends the process at once, before a window holding unsaved work can ask whether to close;
//! closing the windows lets each ask first, and the app exits once the last one has closed.

use tauri::menu::{Menu, MenuItem, MenuItemKind, PredefinedMenuItem, Submenu};
use tauri::{AppHandle, Emitter, Manager, Runtime};

/// The event the page listens for to open Settings.
pub const OPEN_SETTINGS_EVENT: &str = "open-settings";
const PREFERENCES_ITEM_ID: &str = "preferences";
const QUIT_ITEM_ID: &str = "quit";
/// After the About item and its separator, where macOS puts Preferences.
const PREFERENCES_POSITION: usize = 2;

pub fn install<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let menu = Menu::default(app)?;
    if let Some(MenuItemKind::Submenu(app_submenu)) = menu.items()?.first() {
        app_submenu.insert(&preferences_item(app)?, PREFERENCES_POSITION)?;
        app_submenu.insert(
            &PredefinedMenuItem::separator(app)?,
            PREFERENCES_POSITION + 1,
        )?;
        replace_quit_item(app, app_submenu)?;
    }
    app.set_menu(menu)?;
    app.on_menu_event(|app, event| {
        if event.id() == PREFERENCES_ITEM_ID
            && let Err(error) = app.emit(OPEN_SETTINGS_EVENT, ())
        {
            tracing::warn!("could not ask the page to open Settings: {error}");
        }
        if event.id() == QUIT_ITEM_ID {
            close_windows(app);
        }
    });
    Ok(())
}

fn replace_quit_item<R: Runtime>(app: &AppHandle<R>, submenu: &Submenu<R>) -> tauri::Result<()> {
    let items = submenu.items()?;
    let Some(position) = items.iter().position(is_default_quit_item) else {
        return Ok(());
    };
    submenu.remove_at(position)?;
    let quit = MenuItem::with_id(
        app,
        QUIT_ITEM_ID,
        format!("Quit {}", app.package_info().name),
        true,
        Some("CmdOrCtrl+Q"),
    )?;
    submenu.insert(&quit, position)
}

fn is_default_quit_item<R: Runtime>(item: &MenuItemKind<R>) -> bool {
    matches!(item, MenuItemKind::Predefined(predefined)
        if predefined.text().is_ok_and(|text| text.starts_with("Quit")))
}

fn close_windows<R: Runtime>(app: &AppHandle<R>) {
    for window in app.webview_windows().values() {
        if let Err(error) = window.close() {
            tracing::warn!("could not close a window on Quit: {error}");
        }
    }
}

fn preferences_item<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<MenuItem<R>> {
    MenuItem::with_id(
        app,
        PREFERENCES_ITEM_ID,
        "Preferences…",
        true,
        Some("CmdOrCtrl+,"),
    )
}

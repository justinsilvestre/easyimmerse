//! The macOS application menu: the default menu with a Preferences item (Cmd+,) added,
//! which asks the page to open its Settings screen.

use tauri::menu::{Menu, MenuItem, MenuItemKind, PredefinedMenuItem};
use tauri::{AppHandle, Emitter, Runtime};

/// The event the page listens for to open Settings.
pub const OPEN_SETTINGS_EVENT: &str = "open-settings";
const PREFERENCES_ITEM_ID: &str = "preferences";
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
    }
    app.set_menu(menu)?;
    app.on_menu_event(|app, event| {
        if event.id() == PREFERENCES_ITEM_ID {
            if let Err(error) = app.emit(OPEN_SETTINGS_EVENT, ()) {
                tracing::warn!("could not ask the page to open Settings: {error}");
            }
        }
    });
    Ok(())
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

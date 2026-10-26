//! Holds each link the operating system opens the app with, such as an `easyimmerse://` link, until the page takes it,
//! and on desktop brings the window forward for it, making it again when it was closed.
//! The page takes the held link once it listens, which covers the link that started the app,
//! and again each time the link-opened event says that another link arrived.
//! Each link is taken once, so a page that loads later, as when its window is made again, never reopens a link it already opened.

use std::sync::Mutex;

use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_deep_link::DeepLinkExt;

/// The event the page listens for to take the held link.
pub const LINK_OPENED_EVENT: &str = "link-opened";

/// The link the page has yet to take.
#[derive(Default)]
pub struct HeldLink(Mutex<Option<String>>);

/// Holds the link that started the app, if any, and every link opened from now on.
/// Must run before the window is made, so that no link opened while it loads is missed.
pub fn install(app: &AppHandle) {
    app.manage(HeldLink(Mutex::new(startup_link(app))));
    let handle = app.clone();
    app.deep_link().on_open_url(move |event| {
        if let Some(url) = event.urls().pop() {
            hold(&handle, url.into());
        }
    });
}

/// Hands the page the held link and holds none until another link opens.
#[tauri::command]
pub fn take_opened_link(held: State<'_, HeldLink>) -> Option<String> {
    held.0.lock().ok()?.take()
}

fn startup_link(app: &AppHandle) -> Option<String> {
    match app.deep_link().get_current() {
        Ok(urls) => urls?.pop().map(String::from),
        Err(error) => {
            tracing::warn!("could not read the link the app was opened with: {error}");
            None
        }
    }
}

fn hold(app: &AppHandle, link: String) {
    if let Some(held) = app.try_state::<HeldLink>()
        && let Ok(mut slot) = held.0.lock()
    {
        *slot = Some(link);
    }
    #[cfg(desktop)]
    bring_window_forward(app);
    if let Err(error) = app.emit(LINK_OPENED_EVENT, ()) {
        tracing::warn!("could not tell the page that a link opened: {error}");
    }
}

/// Shows the main window, making it again when it was closed.
/// Runs on the main thread, since a link may arrive on another.
#[cfg(desktop)]
pub fn bring_window_forward(app: &AppHandle) {
    let handle = app.clone();
    if let Err(error) =
        app.run_on_main_thread(move || crate::background_running::show_main_window(&handle))
    {
        tracing::warn!("could not bring the window forward: {error}");
    }
}

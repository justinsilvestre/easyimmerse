//! Lets the user keep a copy of a file the app wrote, through the save picker of Android or iOS.
//! Desktop platforms have no such picker, and the command fails there.

use serde::{Deserialize, Serialize};
use tauri::plugin::{Builder, TauriPlugin};
use tauri::{Manager, Runtime};

mod commands;
#[cfg(desktop)]
mod desktop;
mod error;
#[cfg(mobile)]
mod mobile;

#[cfg(desktop)]
pub use desktop::SaveCopy;
pub use error::{Error, Result};
#[cfg(mobile)]
pub use mobile::SaveCopy;

/// The file to offer the user, which is deleted once the user has kept a copy or cancelled.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveCopyRequest {
    /// The absolute path of the file inside the app.
    pub path: String,
    /// The name the picker suggests for the copy.
    pub file_name: String,
    pub mime_type: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SaveCopyResponse {
    /// Whether the user kept a copy, rather than cancelling the picker.
    pub saved: bool,
}

/// Builds the plugin, which JavaScript invokes as `plugin:save-copy|save_copy`.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("save-copy")
        .invoke_handler(tauri::generate_handler![commands::save_copy])
        .setup(|app, api| {
            #[cfg(mobile)]
            let save_copy = mobile::init(app, api)?;
            #[cfg(desktop)]
            let save_copy = desktop::init(app, api);
            app.manage(save_copy);
            Ok(())
        })
        .build()
}

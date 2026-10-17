use serde::de::DeserializeOwned;
use tauri::plugin::{PluginApi, PluginHandle};
use tauri::{AppHandle, Runtime};

use crate::{SaveCopyRequest, SaveCopyResponse};

#[cfg(target_os = "android")]
const PLUGIN_IDENTIFIER: &str = "com.easyimmerse.savecopy";

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_save_copy);

/// Registers the Kotlin or Swift side of the plugin.
pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<SaveCopy<R>> {
    #[cfg(target_os = "android")]
    let handle = api.register_android_plugin(PLUGIN_IDENTIFIER, "SaveCopyPlugin")?;
    #[cfg(target_os = "ios")]
    let handle = api.register_ios_plugin(init_plugin_save_copy)?;
    Ok(SaveCopy(handle))
}

/// Access to the platform's save picker.
pub struct SaveCopy<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> SaveCopy<R> {
    pub async fn save_copy(&self, request: SaveCopyRequest) -> crate::Result<SaveCopyResponse> {
        Ok(self.0.run_mobile_plugin_async("saveCopy", request).await?)
    }
}

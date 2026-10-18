use std::marker::PhantomData;

use serde::de::DeserializeOwned;
use tauri::plugin::PluginApi;
use tauri::{AppHandle, Runtime};

use crate::{Error, SaveCopyRequest, SaveCopyResponse};

pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> SaveCopy<R> {
    SaveCopy(PhantomData)
}

/// Stands in for the save picker, which desktop platforms do not have.
pub struct SaveCopy<R: Runtime>(PhantomData<fn() -> R>);

impl<R: Runtime> SaveCopy<R> {
    pub async fn save_copy(&self, _request: SaveCopyRequest) -> crate::Result<SaveCopyResponse> {
        Err(Error::Unsupported)
    }
}

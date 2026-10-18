use tauri::{AppHandle, Manager, Runtime};

use crate::{Result, SaveCopy, SaveCopyRequest, SaveCopyResponse};

/// Opens the platform's save picker for the file at the path, answering whether the user kept a copy.
#[tauri::command]
pub(crate) async fn save_copy<R: Runtime>(
    app: AppHandle<R>,
    path: String,
    file_name: String,
    mime_type: String,
) -> Result<SaveCopyResponse> {
    let request = SaveCopyRequest {
        path,
        file_name,
        mime_type,
    };
    app.state::<SaveCopy<R>>().save_copy(request).await
}

//! Loading a registered media file and resolving where its bytes live.

use axum::http::StatusCode;
use easyimmerse_core::media_file::{MediaFile, MediaId, MediaSource};
use easyimmerse_core::project::ProjectId;

use crate::auth::error_body::ApiFailure;
use crate::state::AppState;

/// Loads a media file of a project, with its subtitle tracks, from storage.
pub async fn load_media_file(
    state: &AppState,
    project_id: String,
    media_id: String,
) -> Result<MediaFile, ApiFailure> {
    state
        .with_storage(move |storage| {
            storage.get_media_file(&ProjectId(project_id), &MediaId(media_id))
        })
        .await
}

/// Returns the server path of a source, or a 404 with the code `not_resolvable` for a file
/// that only the browser holds.
pub fn local_source_path(source: &MediaSource) -> Result<&str, ApiFailure> {
    match source {
        MediaSource::Path { path } => Ok(path),
        MediaSource::BrowserFile { .. } => Err(not_resolvable()),
    }
}

fn not_resolvable() -> ApiFailure {
    ApiFailure::new(
        StatusCode::NOT_FOUND,
        "not_resolvable",
        "the browser holds this file, so the server cannot read it",
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_a_path_source() {
        let source = MediaSource::Path {
            path: "/a.mp4".to_string(),
        };
        assert_eq!(local_source_path(&source).unwrap(), "/a.mp4");
    }

    #[test]
    fn refuses_a_browser_file_with_the_not_resolvable_code() {
        let source = MediaSource::BrowserFile {
            key: "k".to_string(),
        };
        assert_eq!(
            local_source_path(&source).unwrap_err().error.code,
            "not_resolvable"
        );
    }
}

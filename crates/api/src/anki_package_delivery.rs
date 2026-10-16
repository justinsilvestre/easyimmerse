//! Delivering a built Anki package: saving it at a path or sending it for download, and recording it once it has been delivered.

use axum::Json;
use axum::http::header::{CONTENT_DISPOSITION, CONTENT_TYPE};
use axum::http::{HeaderMap, HeaderName, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use easyimmerse_storage::DeliveredPackage;

use crate::auth::error_body::ApiFailure;
use crate::file_download::{attachment_disposition, body_then};
use crate::routes::anki_package::AnkiPackageSaved;
use crate::state::AppState;

/// The response header that counts the flashcards a downloaded package holds.
pub const FLASHCARD_COUNT_HEADER: &str = "x-easyimmerse-flashcard-count";

/// The response header that counts the media files left out of a downloaded package.
pub const SKIPPED_MEDIA_HEADER: &str = "x-easyimmerse-skipped-media";

/// A package built in memory, with what is recorded once it has been delivered.
pub struct BuiltPackage {
    pub bytes: Vec<u8>,
    pub file_name: String,
    pub skipped_media_count: u64,
    pub delivered: DeliveredPackage,
}

impl BuiltPackage {
    fn flashcard_count(&self) -> u64 {
        self.delivered.flashcard_ids.len() as u64
    }
}

/// Writes the bytes to the path through a sibling `.part` file, so that a failed write leaves no truncated package
/// and does not destroy a package already at the path.
async fn write_file_whole(path: &str, bytes: &[u8]) -> std::io::Result<()> {
    let partial = format!("{path}.part");
    tokio::fs::write(&partial, bytes).await?;
    if let Err(error) = tokio::fs::rename(&partial, path).await {
        tokio::fs::remove_file(&partial).await.ok();
        return Err(error);
    }
    Ok(())
}

pub async fn save_package(
    state: &AppState,
    package: BuiltPackage,
    path: &str,
) -> Result<Response, ApiFailure> {
    write_file_whole(path, &package.bytes)
        .await
        .map_err(|error| {
            ApiFailure::new(
                StatusCode::BAD_REQUEST,
                "save_failed",
                format!("could not write the package to {path:?}: {error}"),
            )
        })?;
    let saved = AnkiPackageSaved {
        flashcard_count: package.flashcard_count(),
        skipped_media_count: package.skipped_media_count,
    };
    record_export(state, package.delivered).await?;
    Ok(Json(saved).into_response())
}

/// Sends the package as the response body, and records the export once the body has been sent in full.
pub fn package_download(state: AppState, package: BuiltPackage) -> Response {
    let mut headers = HeaderMap::new();
    headers.insert(
        CONTENT_TYPE,
        HeaderValue::from_static("application/octet-stream"),
    );
    headers.insert(
        CONTENT_DISPOSITION,
        attachment_disposition(&package.file_name),
    );
    headers.insert(
        HeaderName::from_static(FLASHCARD_COUNT_HEADER),
        HeaderValue::from(package.flashcard_count()),
    );
    headers.insert(
        HeaderName::from_static(SKIPPED_MEDIA_HEADER),
        HeaderValue::from(package.skipped_media_count),
    );
    let BuiltPackage {
        bytes, delivered, ..
    } = package;
    let body = body_then(bytes, async move {
        if let Err(failure) = record_export(&state, delivered).await {
            tracing::error!("could not record the export: {}", failure.error.message);
        }
    });
    (StatusCode::OK, headers, body).into_response()
}

async fn record_export(state: &AppState, delivered: DeliveredPackage) -> Result<(), ApiFailure> {
    state
        .with_storage(move |storage| storage.record_anki_export(&delivered))
        .await
}

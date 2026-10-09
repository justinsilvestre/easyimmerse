//! Whether the files behind a project's path-backed media files can still be opened.

use std::time::Duration;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::{Extension, Json};
use easyimmerse_core::media_file::{MediaFile, MediaFileId, MediaFileSource};
use easyimmerse_core::project::ProjectId;
use serde::{Deserialize, Serialize};
use tokio::task::JoinSet;
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::auth::token_kind::TokenKind;
use crate::routes::media_import::load_project;
use crate::routes::media_support::resolve_source_path;
use crate::state::AppState;

/// How long one file's check may take before its state is reported as unknown.
const CHECK_TIMEOUT: Duration = Duration::from_secs(2);

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct MediaAvailabilityResponse {
    pub media_files: Vec<MediaFileAvailability>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct MediaFileAvailability {
    pub media_id: MediaFileId,
    pub availability: PathAvailability,
}

/// Whether the server can open the file at a media file's path.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum PathAvailability {
    Available,
    /// No file exists at the path.
    Missing,
    /// The file may exist, but the request's token may not read it, or reading it failed.
    Unreadable,
}

/// Checks whether each path-backed media file of a project can be opened. Files the browser
/// holds are left out, since only the browser can tell whether it still has them. A
/// path-backed file is also left out when its check takes longer than two seconds, as can
/// happen on a sleeping network drive, so an omitted file is one whose state is unknown.
#[utoipa::path(
    get,
    path = "/projects/{id}/media/availability",
    tag = "media",
    operation_id = "getMediaAvailability",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    responses(
        (status = 200, description = "The availability of the project's path-backed media files, oldest first", body = MediaAvailabilityResponse),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_media_availability(
    State(state): State<AppState>,
    Extension(token): Extension<TokenKind>,
    Path(project_id): Path<ProjectId>,
) -> Result<Json<MediaAvailabilityResponse>, ApiFailure> {
    load_project(&state, project_id.clone()).await?;
    let media_files = state
        .with_storage(move |storage| storage.list_media_files(&project_id))
        .await?;
    let path_files = media_files.into_iter().filter(is_path_backed).collect();
    Ok(Json(MediaAvailabilityResponse {
        media_files: check_all(state, token, path_files).await,
    }))
}

/// Checks the files concurrently and returns the answers in the order of `media_files`,
/// without the files whose check timed out.
async fn check_all(
    state: AppState,
    token: TokenKind,
    media_files: Vec<MediaFile>,
) -> Vec<MediaFileAvailability> {
    let mut checks = JoinSet::new();
    for (index, media_file) in media_files.into_iter().enumerate() {
        let state = state.clone();
        checks.spawn(async move { (index, check_one(&state, token, media_file).await) });
    }
    let mut answers: Vec<(usize, MediaFileAvailability)> = Vec::new();
    while let Some(joined) = checks.join_next().await {
        if let Ok((index, Some(answer))) = joined {
            answers.push((index, answer));
        }
    }
    answers.sort_by_key(|(index, _)| *index);
    answers.into_iter().map(|(_, answer)| answer).collect()
}

async fn check_one(
    state: &AppState,
    token: TokenKind,
    media_file: MediaFile,
) -> Option<MediaFileAvailability> {
    let resolution = resolve_source_path(state, token, &media_file);
    let outcome = tokio::time::timeout(CHECK_TIMEOUT, resolution).await.ok()?;
    Some(MediaFileAvailability {
        media_id: media_file.id,
        availability: path_availability(&outcome),
    })
}

fn is_path_backed(media_file: &MediaFile) -> bool {
    matches!(media_file.source, MediaFileSource::Path { .. })
}

/// Maps the outcome of resolving a media file's path to its availability.
fn path_availability(outcome: &Result<String, ApiFailure>) -> PathAvailability {
    match outcome {
        Ok(_) => PathAvailability::Available,
        Err(failure) if failure.status == StatusCode::NOT_FOUND => PathAvailability::Missing,
        Err(_) => PathAvailability::Unreadable,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::auth::error_body::{bad_request, forbidden, not_found};

    #[test]
    fn maps_a_resolved_path_to_available() {
        let outcome = Ok("/a.mp4".to_owned());
        assert_eq!(path_availability(&outcome), PathAvailability::Available);
    }

    #[test]
    fn maps_not_found_to_missing() {
        let outcome = Err(not_found("no file"));
        assert_eq!(path_availability(&outcome), PathAvailability::Missing);
    }

    #[test]
    fn maps_forbidden_to_unreadable() {
        let outcome = Err(forbidden("no local paths"));
        assert_eq!(path_availability(&outcome), PathAvailability::Unreadable);
    }

    #[test]
    fn maps_a_failed_read_to_unreadable() {
        let outcome = Err(bad_request("permission denied"));
        assert_eq!(path_availability(&outcome), PathAvailability::Unreadable);
    }
}

//! Whether the files behind a project's path-backed media files can still be opened.

use std::io::ErrorKind;
use std::time::Duration;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::{Extension, Json};
use easyimmerse_core::media_file::{MediaFile, MediaFileId, MediaFileSource};
use easyimmerse_core::project::ProjectId;
use serde::{Deserialize, Serialize};
use tokio::sync::Semaphore;
use tokio::task::JoinSet;
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::auth::token_kind::TokenKind;
use crate::local_path::LOCAL_PATHS_NOT_ALLOWED;
use crate::routes::media_import::load_project;
use crate::routes::media_support::resolve_source_path;
use crate::state::AppState;

/// How long one file's check may take before its state is reported as unknown.
const CHECK_TIMEOUT: Duration = Duration::from_secs(2);

/// Bounds the checks running at once across all requests. A check that hangs, as on a
/// sleeping network drive, keeps its permit until the file system answers, so hung checks
/// cannot fill the blocking thread pool that storage access also uses.
static CHECK_PERMITS: Semaphore = Semaphore::const_new(8);

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
    /// The request's token, or the server's configuration, forbids reading local paths.
    NotAllowed,
    /// The file exists or may exist, but opening it failed, for example for lack of
    /// permission.
    Unreadable,
}

/// Checks whether each path-backed media file of a project can be opened. Files the browser
/// holds are left out, since only the browser can tell whether it still has them. A
/// path-backed file is also left out when its check takes longer than two seconds, as can
/// happen on a sleeping network drive, so an omitted file is one whose state is unknown.
/// At most eight files are checked at once, across all requests.
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

/// Checks one file in a task of its own, so that a check outliving its timeout keeps its
/// permit until it finishes.
async fn check_one(
    state: &AppState,
    token: TokenKind,
    media_file: MediaFile,
) -> Option<MediaFileAvailability> {
    let media_id = media_file.id.clone();
    let state = state.clone();
    let check = tokio::spawn(async move {
        let _permit = CHECK_PERMITS.acquire().await.ok()?;
        Some(availability_of(&state, token, &media_file).await)
    });
    let availability = tokio::time::timeout(CHECK_TIMEOUT, check)
        .await
        .ok()?
        .ok()??;
    Some(MediaFileAvailability {
        media_id,
        availability,
    })
}

async fn availability_of(
    state: &AppState,
    token: TokenKind,
    media_file: &MediaFile,
) -> PathAvailability {
    match resolve_source_path(state, token, media_file).await {
        Ok(path) => open_availability(tokio::fs::File::open(path).await.map(drop)),
        Err(failure) => resolution_availability(&failure),
    }
}

fn is_path_backed(media_file: &MediaFile) -> bool {
    matches!(media_file.source, MediaFileSource::Path { .. })
}

/// Maps a failure to resolve a media file's path to its availability.
fn resolution_availability(failure: &ApiFailure) -> PathAvailability {
    if failure.status == StatusCode::NOT_FOUND {
        PathAvailability::Missing
    } else if failure.error.code == LOCAL_PATHS_NOT_ALLOWED {
        PathAvailability::NotAllowed
    } else {
        PathAvailability::Unreadable
    }
}

/// Maps the outcome of opening a resolved path to its availability.
fn open_availability(outcome: std::io::Result<()>) -> PathAvailability {
    match outcome {
        Ok(()) => PathAvailability::Available,
        Err(error) if error.kind() == ErrorKind::NotFound => PathAvailability::Missing,
        Err(_) => PathAvailability::Unreadable,
    }
}

#[cfg(test)]
mod tests {
    use std::io::Error;

    use super::*;
    use crate::auth::error_body::{bad_request, forbidden, not_found};
    use crate::local_path::ensure_local_paths_allowed;

    #[test]
    fn maps_an_opened_file_to_available() {
        assert_eq!(open_availability(Ok(())), PathAvailability::Available);
    }

    #[test]
    fn maps_a_file_that_vanished_before_opening_to_missing() {
        let outcome = Err(Error::from(ErrorKind::NotFound));
        assert_eq!(open_availability(outcome), PathAvailability::Missing);
    }

    #[test]
    fn maps_a_refused_open_to_unreadable() {
        let outcome = Err(Error::from(ErrorKind::PermissionDenied));
        assert_eq!(open_availability(outcome), PathAvailability::Unreadable);
    }

    #[test]
    fn maps_not_found_to_missing() {
        let failure = not_found("no file");
        assert_eq!(resolution_availability(&failure), PathAvailability::Missing);
    }

    #[test]
    fn maps_the_local_paths_refusal_to_not_allowed() {
        let config = crate::config::ApiConfig::for_loopback(1, "t".to_owned(), false);
        let failure = ensure_local_paths_allowed(TokenKind::Launch, &config).unwrap_err();
        assert_eq!(
            resolution_availability(&failure),
            PathAvailability::NotAllowed
        );
    }

    #[test]
    fn maps_another_forbidden_failure_to_unreadable() {
        let failure = forbidden("no");
        assert_eq!(
            resolution_availability(&failure),
            PathAvailability::Unreadable
        );
    }

    #[test]
    fn maps_a_failed_read_to_unreadable() {
        let failure = bad_request("permission denied");
        assert_eq!(
            resolution_availability(&failure),
            PathAvailability::Unreadable
        );
    }
}

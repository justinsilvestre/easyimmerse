//! Plans how a client plays a media file, and registers the conversion when one is needed.

use std::path::Path as FilePath;

use axum::extract::{Path, State};
use axum::{Extension, Json};
use easyimmerse_core::media_file::MediaFileId;
use easyimmerse_core::project::ProjectId;
use easyimmerse_media::{
    ContainerInfo, ConversionPlan, ConversionSettings, PlaybackPlan, PlaybackRequest,
    PlaybackResponse, TrackSelection, default_track_selection, plan_playback,
};

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::auth::token_kind::TokenKind;
use crate::routes::media::load_media_file;
use crate::routes::media_support::{conversion_failure, probe_media, resolve_source_path};
use crate::state::AppState;

/// Converted files are served below this path, by cache key.
pub const CONVERSIONS_PATH_PREFIX: &str = "/conversions";

/// Plans playback for the client's environment. A converting plan registers the conversion
/// and names its playlist. Without a conversion service, anything that would need conversion
/// comes back unsupported with the reason `conversion_unavailable`.
#[utoipa::path(
    post,
    path = "/projects/{id}/media/{media_id}/playback",
    tag = "media",
    operation_id = "planMediaPlayback",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
    ),
    request_body = PlaybackRequest,
    responses(
        (status = 200, description = "The plan and, when converting, the playlist path", body = PlaybackResponse),
        (status = 400, description = "The file could not be probed", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "The token may not read local paths", body = ApiError),
        (status = 404, description = "No such media file, no file at its path, or a browser-held file (code `not_resolvable`)", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 503, description = "This server cannot probe media (code `conversion_unavailable`)", body = ApiError),
    ),
)]
pub async fn plan_media_playback(
    State(state): State<AppState>,
    Extension(token): Extension<TokenKind>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
    Json(request): Json<PlaybackRequest>,
) -> Result<Json<PlaybackResponse>, ApiFailure> {
    let media_file = load_media_file(&state, project_id, media_id).await?;
    let path = resolve_source_path(&state, token, &media_file).await?;
    let container = probe_media(&state, &path).await?;
    let selection = request
        .selection
        .unwrap_or_else(|| default_track_selection(&container));
    let settings = conversion_settings(&state, &request).await;
    let plan = plan_playback(
        &container,
        &selection,
        &request.environment,
        settings.as_ref(),
    );
    let playlist_path = match &plan {
        PlaybackPlan::Convert(conversion) => {
            Some(register_conversion(&state, &path, selection, conversion, &container).await?)
        }
        _ => None,
    };
    Ok(Json(PlaybackResponse {
        plan,
        playlist_path,
    }))
}

async fn conversion_settings(
    state: &AppState,
    request: &PlaybackRequest,
) -> Option<ConversionSettings> {
    match &state.conversion {
        Some(service) => Some(service.settings(request.preferred_audio_target).await),
        None => None,
    }
}

async fn register_conversion(
    state: &AppState,
    path: &str,
    selection: TrackSelection,
    plan: &ConversionPlan,
    container: &ContainerInfo,
) -> Result<String, ApiFailure> {
    let service = state
        .conversion
        .as_ref()
        .ok_or_else(crate::routes::media_support::conversion_unavailable)?;
    let key = service
        .register(FilePath::new(path), selection, plan.clone(), container)
        .await
        .map_err(conversion_failure)?;
    Ok(format!("{CONVERSIONS_PATH_PREFIX}/{key}/index.m3u8"))
}

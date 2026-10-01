use std::path::Path as FilePath;

use axum::extract::{Path, State};
use axum::{Extension, Json};
use easyimmerse_media::ContainerInfo;
use easyimmerse_media::playback::{
    AudioTarget, MediaTracks, PlaybackPlan, PlaybackRequest, PlaybackResponse, UnsupportedReason,
    default_selection, plan_playback,
};

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::auth::token_kind::TokenKind;
use crate::local_path::ensure_local_paths_allowed;
use crate::media_probe::probe_media;
use crate::media_source::{load_media_file, local_source_path};
use crate::routes::conversions::playlist_path;
use crate::state::AppState;

/// Describes a media file's tracks, so that the client can measure what its browser plays.
#[utoipa::path(
    get,
    path = "/projects/{id}/media/{media_id}/tracks",
    tag = "media",
    operation_id = "getMediaTracks",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
    ),
    responses(
        (status = 200, description = "The container and its tracks", body = MediaTracks),
        (status = 400, description = "The container could not be read", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "The token may not read local paths", body = ApiError),
        (status = 404, description = "No such media file, or the browser holds it", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_media_tracks(
    State(state): State<AppState>,
    Extension(token): Extension<TokenKind>,
    Path((id, media_id)): Path<(String, String)>,
) -> Result<Json<MediaTracks>, ApiFailure> {
    let (_, container) = probe_media_file(&state, token, id, media_id).await?;
    Ok(Json(MediaTracks::new(container)))
}

/// Plans how the client's browser will play a media file with its default tracks.
/// When the plan converts, the conversion is registered and the response names its playlist.
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
        (status = 200, description = "The playback plan", body = PlaybackResponse),
        (status = 400, description = "The container could not be read", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "The token may not read local paths", body = ApiError),
        (status = 404, description = "No such media file, or the browser holds it", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 500, description = "The conversion could not be prepared", body = ApiError),
    ),
)]
pub async fn plan_media_playback(
    State(state): State<AppState>,
    Extension(token): Extension<TokenKind>,
    Path((id, media_id)): Path<(String, String)>,
    Json(request): Json<PlaybackRequest>,
) -> Result<Json<PlaybackResponse>, ApiFailure> {
    let (path, container) = probe_media_file(&state, token, id, media_id).await?;
    let selection = default_selection(&container);
    let plan = plan_playback(
        &container,
        &selection,
        &request.environment,
        AudioTarget::Aac,
    );
    let response = prepare_playback(&state, FilePath::new(&path), &container, plan).await?;
    Ok(Json(response))
}

/// Loads a media file and reads its tracks, returning the file's path with them.
async fn probe_media_file(
    state: &AppState,
    token: TokenKind,
    id: String,
    media_id: String,
) -> Result<(String, ContainerInfo), ApiFailure> {
    let media = load_media_file(state, id, media_id).await?;
    let path = local_source_path(&media.source)?.to_owned();
    ensure_local_paths_allowed(token, &state.config)?;
    let container = probe_media(&path).await?;
    Ok((path, container))
}

async fn prepare_playback(
    state: &AppState,
    path: &FilePath,
    container: &ContainerInfo,
    plan: PlaybackPlan,
) -> Result<PlaybackResponse, ApiFailure> {
    let PlaybackPlan::Convert(conversion) = &plan else {
        return Ok(without_playlist(plan));
    };
    let Some(service) = &state.conversions else {
        let reason = UnsupportedReason::ConversionUnavailable;
        return Ok(without_playlist(PlaybackPlan::Unsupported { reason }));
    };
    let key = service.register(path, container, conversion).await?;
    Ok(PlaybackResponse {
        plan,
        playlist_path: Some(playlist_path(&key)),
    })
}

fn without_playlist(plan: PlaybackPlan) -> PlaybackResponse {
    PlaybackResponse {
        plan,
        playlist_path: None,
    }
}

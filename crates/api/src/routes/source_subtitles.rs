//! Fetching more subtitle tracks for a media file from the source a media-source plugin
//! fetched it from.

use std::path::{Path as FsPath, PathBuf};

use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use easyimmerse_core::media_file::{MediaFile, MediaFileId, MediaFileSource, MediaOrigin};
use easyimmerse_core::project::ProjectId;
use easyimmerse_core::providers::media_source::{AvailableSubtitle, ResolvedSubtitle};
use easyimmerse_core::subtitle_track::SubtitleTracksResponse;
use easyimmerse_plugins::PluginPackage;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure, internal};
use crate::plugins::{describe_media, fetch_subtitles, fetched_item_dir};
use crate::routes::media::load_media_file;
use crate::routes::plugins::{
    ensure_inside, media_dir, media_source_package, plugin_failure, read_subtitles,
};
use crate::state::AppState;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct SourceSubtitlesResponse {
    /// The subtitle tracks the source offers for the media file.
    pub subtitles: Vec<AvailableSubtitle>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct FetchSourceSubtitlesRequest {
    /// The ids of the subtitle tracks to fetch, from `listSourceSubtitles`.
    pub subtitles: Vec<String>,
}

/// Lists the subtitle tracks the media file's source offers, by asking the plugin that
/// fetched the media file. The plugin may take a few seconds to answer.
#[utoipa::path(
    get,
    path = "/projects/{id}/media/{media_id}/source-subtitles",
    tag = "subtitles",
    operation_id = "listSourceSubtitles",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
    ),
    responses(
        (status = 200, description = "The subtitle tracks the source offers", body = SourceSubtitlesResponse),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such media file in the project, or its plugin is no longer installed", body = ApiError),
        (status = 409, description = "The media file was not fetched through a plugin (code `no_origin`)", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 502, description = "The plugin could not describe the source (code `media_source_failed`)", body = ApiError),
    ),
)]
pub async fn list_source_subtitles(
    State(state): State<AppState>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
) -> Result<Json<SourceSubtitlesResponse>, ApiFailure> {
    let media_file = load_media_file(&state, project_id, media_id).await?;
    let origin = origin_of(&media_file)?;
    let package = media_source_package(&state, &origin.plugin)?;
    let locator = origin.locator.0.clone();
    let description = tokio::task::spawn_blocking(move || describe_media(&package, &locator))
        .await
        .map_err(|error| internal(format!("plugin task failed: {error}")))?
        .map_err(plugin_failure)?;
    Ok(Json(SourceSubtitlesResponse {
        subtitles: description.subtitles,
    }))
}

/// Fetches the chosen subtitle tracks from the media file's source and adds them to the
/// media file, beside the files fetched with it. A track in a project language whose role
/// is still free takes that role. The request lasts as long as the fetch.
#[utoipa::path(
    post,
    path = "/projects/{id}/media/{media_id}/source-subtitles",
    tag = "subtitles",
    operation_id = "fetchSourceSubtitles",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
    ),
    request_body = FetchSourceSubtitlesRequest,
    responses(
        (status = 201, description = "The media file's subtitle tracks, with the fetched ones added", body = SubtitleTracksResponse),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such media file in the project, or its plugin is no longer installed", body = ApiError),
        (status = 409, description = "The media file was not fetched through a plugin (code `no_origin`)", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 502, description = "The plugin could not fetch the subtitles (code `media_source_failed`)", body = ApiError),
        (status = 503, description = "The server has no media directory (code `media_dir_unavailable`)", body = ApiError),
    ),
)]
pub async fn fetch_source_subtitles(
    State(state): State<AppState>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
    Json(request): Json<FetchSourceSubtitlesRequest>,
) -> Result<(StatusCode, Json<SubtitleTracksResponse>), ApiFailure> {
    let settings = {
        let project_id = project_id.clone();
        state
            .with_storage(move |storage| storage.get_project(&project_id))
            .await?
            .settings
    };
    let media_file = load_media_file(&state, project_id, media_id.clone()).await?;
    let origin = origin_of(&media_file)?;
    let package = media_source_package(&state, &origin.plugin)?;
    let output_dir = subtitles_dir(&state, &media_file)?;
    tokio::fs::create_dir_all(&output_dir)
        .await
        .map_err(|error| {
            internal(format!(
                "could not create {}: {error}",
                output_dir.display()
            ))
        })?;
    let fetched = run_plugin(package, origin, &output_dir, request.subtitles).await?;
    ensure_inside(
        &output_dir,
        fetched.iter().map(|subtitle| subtitle.path.as_str()),
    )?;
    let taken = {
        let media_id = media_id.clone();
        state
            .with_storage(move |storage| storage.get_subtitle_selection(&media_id))
            .await?
    };
    let tracks = read_subtitles(&fetched, &settings, taken.clone()).await;
    let response = state
        .with_storage(move |storage| {
            let mut selection = taken;
            for (track, role) in tracks {
                let added = storage.add_subtitle_track(&media_id, &track)?;
                if let Some(role) = role {
                    selection = selection.with_role(role, added.id);
                }
            }
            storage.set_subtitle_selection(&media_id, &selection)?;
            Ok(SubtitleTracksResponse {
                tracks: storage.list_subtitle_tracks(&media_id)?,
                selection,
            })
        })
        .await?;
    Ok((StatusCode::CREATED, Json(response)))
}

async fn run_plugin(
    package: PluginPackage,
    origin: &MediaOrigin,
    output_dir: &FsPath,
    subtitle_ids: Vec<String>,
) -> Result<Vec<ResolvedSubtitle>, ApiFailure> {
    let locator = origin.locator.0.clone();
    let output_dir = output_dir.to_path_buf();
    tokio::task::spawn_blocking(move || {
        fetch_subtitles(&package, &locator, &output_dir, &subtitle_ids)
    })
    .await
    .map_err(|error| internal(format!("plugin task failed: {error}")))?
    .map_err(plugin_failure)
}

fn origin_of(media_file: &MediaFile) -> Result<&MediaOrigin, ApiFailure> {
    media_file.origin.as_ref().ok_or_else(|| {
        ApiFailure::new(
            StatusCode::CONFLICT,
            "no_origin",
            "the media file was not fetched through a plugin, so it has no source to fetch subtitles from",
        )
    })
}

/// A fresh directory for the fetched subtitles inside the directory the media file was
/// fetched into, so that they are removed with it and never overwrite an earlier fetch.
fn subtitles_dir(state: &AppState, media_file: &MediaFile) -> Result<PathBuf, ApiFailure> {
    let media_dir = media_dir(state)?;
    let MediaFileSource::Path { path } = &media_file.source else {
        return Err(internal("the fetched media file has no path"));
    };
    let item_dir = fetched_item_dir(&media_dir, path)
        .ok_or_else(|| internal(format!("{path} is not inside the media directory")))?;
    Ok(item_dir.join(format!(
        "subtitles-{}",
        hex::encode(rand::random::<[u8; 8]>())
    )))
}

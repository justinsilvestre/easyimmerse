//! A media-source plugin's media interface: the forms through which the user fetches more
//! subtitle tracks for a media file imported through the plugin, or removes held ones.

use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use easyimmerse_core::media_file::{MediaFile, MediaFileId, MediaOrigin};
use easyimmerse_core::project::ProjectId;
use easyimmerse_core::providers::media_source::SkippedSubtitle;
use easyimmerse_core::providers::plugin_form::{FormInput, PluginForm};
use easyimmerse_core::subtitle_track::{SubtitleSelection, SubtitleTrack, SubtitleTrackId};
use easyimmerse_plugins::{HeldSubtitle, MediaAnswer, MediaContext};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::plugins::{media_form, media_step};
use crate::routes::media::load_media_file;
use crate::routes::media_import::{load_project, project_languages};
use crate::routes::plugins::{media_source_package, run_plugin_call};
use crate::source_update::{SourceMedia, apply_media_update};
use crate::state::AppState;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct SourceStepRequest {
    /// The id of the form action the user pressed.
    pub action: String,
    /// What the user entered in the form's fields.
    pub input: Vec<FormInput>,
}

/// The plugin's answer to an action in its media interface: the next form to show, or the
/// changes the server applied.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(tag = "kind", rename_all = "kebab-case")]
#[ts(export)]
pub enum SourceStepResponse {
    Form {
        form: PluginForm,
    },
    Applied {
        /// The ids of the subtitle tracks that were removed.
        removed: Vec<SubtitleTrackId>,
        /// The media file's subtitle tracks after the changes.
        tracks: Vec<SubtitleTrack>,
        selection: SubtitleSelection,
        /// The tracks the plugin fetched that were not added.
        skipped: Vec<SkippedSubtitle>,
    },
}

/// The first form of the media interface of the plugin the media file was imported through.
/// The plugin may take a few seconds to answer.
#[utoipa::path(
    get,
    path = "/projects/{id}/media/{media_id}/source-form",
    tag = "subtitles",
    operation_id = "getSourceForm",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
    ),
    responses(
        (status = 200, description = "The form to show", body = PluginForm),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such media file in the project, or its plugin is no longer installed", body = ApiError),
        (status = 409, description = "The media file was not imported through a plugin (code `no_origin`)", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 502, description = "The plugin could not answer (code `media_source_failed`)", body = ApiError),
    ),
)]
pub async fn get_source_form(
    State(state): State<AppState>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
) -> Result<Json<PluginForm>, ApiFailure> {
    let source = load_source(&state, project_id, media_id).await?;
    let form = run_plugin_call(move || media_form(&source.package, &source.context)).await?;
    Ok(Json(form))
}

/// Sends an action of the media interface to the plugin. When the plugin answers with
/// changes, the server removes the tracks it names,
/// clearing them from the selection and deleting the files the plugin fetched for them,
/// and then fetches the tracks it asks for, if any, beside the files imported with the media
/// file. A fetched track in a project language whose role is still free takes that role,
/// and a fetched track that could not be read is left out and listed as skipped. The
/// request lasts as long as the fetch.
#[utoipa::path(
    post,
    path = "/projects/{id}/media/{media_id}/source-step",
    tag = "subtitles",
    operation_id = "submitSourceStep",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
    ),
    request_body = SourceStepRequest,
    responses(
        (status = 200, description = "The next form, or the changes the server applied", body = SourceStepResponse),
        (status = 400, description = "The plugin refused the input (code `invalid_input`)", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such media file in the project, or its plugin is no longer installed", body = ApiError),
        (status = 409, description = "The media file was not imported through a plugin (code `no_origin`)", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 502, description = "The plugin could not answer or fetch (code `media_source_failed`)", body = ApiError),
        (status = 503, description = "The server has no media directory (code `media_dir_unavailable`)", body = ApiError),
    ),
)]
pub async fn submit_source_step(
    State(state): State<AppState>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
    Json(request): Json<SourceStepRequest>,
) -> Result<Json<SourceStepResponse>, ApiFailure> {
    let source = load_source(&state, project_id, media_id).await?;
    let (package, context) = (source.package.clone(), source.context.clone());
    let answer =
        run_plugin_call(move || media_step(&package, &context, &request.action, &request.input))
            .await?;
    let response = match answer {
        MediaAnswer::Form(form) => SourceStepResponse::Form { form },
        MediaAnswer::Apply(update) => apply_media_update(&state, source, update).await?,
    };
    Ok(Json(response))
}

/// The media file with the plugin it was imported through and what to tell the plugin.
async fn load_source(
    state: &AppState,
    project_id: ProjectId,
    media_id: MediaFileId,
) -> Result<SourceMedia, ApiFailure> {
    let settings = load_project(state, project_id.clone()).await?.settings;
    let media_file = load_media_file(state, project_id, media_id).await?;
    let origin = origin_of(&media_file)?.clone();
    let package = media_source_package(state, &origin.plugin)?;
    let tracks = {
        let media_id = media_file.id.clone();
        state
            .with_storage(move |storage| storage.list_subtitle_tracks(&media_id))
            .await?
    };
    let context = MediaContext {
        locator: origin.locator.0,
        languages: project_languages(&settings),
        subtitles: tracks.iter().map(held_subtitle).collect(),
    };
    Ok(SourceMedia {
        settings,
        media_file,
        package,
        context,
    })
}

fn origin_of(media_file: &MediaFile) -> Result<&MediaOrigin, ApiFailure> {
    media_file.origin.as_ref().ok_or_else(|| {
        ApiFailure::new(
            StatusCode::CONFLICT,
            "no_origin",
            "the media file was not imported through a plugin, so it has no source to show",
        )
    })
}

fn held_subtitle(track: &SubtitleTrack) -> HeldSubtitle {
    HeldSubtitle {
        id: track.id.0.clone(),
        name: track.name.clone(),
    }
}

//! A media-source plugin's import interface: the forms through which the user sets up an
//! import, and the step that starts the import once the plugin is ready to run it.

use axum::Json;
use axum::extract::{Path, State};
use easyimmerse_core::project::{Project, ProjectId, ProjectSettings};
use easyimmerse_core::providers::plugin_form::{FormInput, PluginForm};
use easyimmerse_plugins::{ImportAnswer, ImportContext};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::media_source_jobs::MediaSourceJob;
use crate::plugins::{import_form, import_step};
use crate::routes::plugins::{media_dir, media_source_package, run_plugin_call, start_import_job};
use crate::state::AppState;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ImportFormRequest {
    /// The name of an installed media-source plugin.
    pub plugin: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ImportStepRequest {
    /// The name of an installed media-source plugin.
    pub plugin: String,
    /// The id of the form action the user pressed.
    pub action: String,
    /// What the user entered in the form's fields.
    pub input: Vec<FormInput>,
}

/// The plugin's answer to an action in its import interface: the next form to show, or the
/// job that runs the import.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(tag = "kind", rename_all = "kebab-case")]
#[ts(export)]
pub enum ImportStepResponse {
    Form { form: PluginForm },
    Job { job: Box<MediaSourceJob> },
}

/// The first form of a media-source plugin's import interface. The plugin may take a few
/// seconds to answer.
#[utoipa::path(
    post,
    path = "/projects/{id}/media/import-form",
    tag = "media",
    operation_id = "getImportForm",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    request_body = ImportFormRequest,
    responses(
        (status = 200, description = "The form to show", body = PluginForm),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such project, or no installed media-source plugin of that name", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 502, description = "The plugin could not answer (code `media_source_failed`)", body = ApiError),
    ),
)]
pub async fn get_import_form(
    State(state): State<AppState>,
    Path(project_id): Path<ProjectId>,
    Json(request): Json<ImportFormRequest>,
) -> Result<Json<PluginForm>, ApiFailure> {
    let project = load_project(&state, project_id).await?;
    let package = media_source_package(&state, &request.plugin)?;
    let context = import_context(&project.settings);
    let form = run_plugin_call(move || import_form(&package, &context)).await?;
    Ok(Json(form))
}

/// Sends an action of the import interface to the plugin. When the plugin answers with the
/// import to run, the import starts as a job; poll it with `getMediaSourceJob` until it is
/// done or has failed.
#[utoipa::path(
    post,
    path = "/projects/{id}/media/import-step",
    tag = "media",
    operation_id = "submitImportStep",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    request_body = ImportStepRequest,
    responses(
        (status = 200, description = "The next form, or the running job", body = ImportStepResponse),
        (status = 400, description = "The plugin refused the input (code `invalid_input`)", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such project, or no installed media-source plugin of that name", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 502, description = "The plugin could not answer (code `media_source_failed`)", body = ApiError),
        (status = 503, description = "The server has no media directory for plugins to fetch into (code `media_dir_unavailable`)", body = ApiError),
    ),
)]
pub async fn submit_import_step(
    State(state): State<AppState>,
    Path(project_id): Path<ProjectId>,
    Json(request): Json<ImportStepRequest>,
) -> Result<Json<ImportStepResponse>, ApiFailure> {
    let project = load_project(&state, project_id).await?;
    let package = media_source_package(&state, &request.plugin)?;
    // A server without a media directory cannot run the import the steps lead to.
    media_dir(&state)?;
    let context = import_context(&project.settings);
    let answer = {
        let package = package.clone();
        run_plugin_call(move || import_step(&package, &context, &request.action, &request.input))
            .await?
    };
    let response = match answer {
        ImportAnswer::Form(form) => ImportStepResponse::Form { form },
        ImportAnswer::Import(import) => ImportStepResponse::Job {
            job: Box::new(start_import_job(&state, project, package, import).await?),
        },
    };
    Ok(Json(response))
}

pub(crate) async fn load_project(
    state: &AppState,
    project_id: ProjectId,
) -> Result<Project, ApiFailure> {
    state
        .with_storage(move |storage| storage.get_project(&project_id))
        .await
}

/// The project's languages, target language first, as a plugin is told them.
pub(crate) fn project_languages(settings: &ProjectSettings) -> Vec<String> {
    [&settings.target_language, &settings.translation_language]
        .into_iter()
        .filter(|language| !language.is_empty())
        .cloned()
        .collect()
}

fn import_context(settings: &ProjectSettings) -> ImportContext {
    ImportContext {
        languages: project_languages(settings),
    }
}

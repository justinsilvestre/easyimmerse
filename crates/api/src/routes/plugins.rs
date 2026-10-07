//! The installed plugins, and adding media to a project through a media-source plugin.
//! The fetch runs as a job, since it takes as long as a download; the client polls it.

use std::path::Path as FsPath;

use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use easyimmerse_core::media_file::{MediaFile, MediaFileSource, MediaOrigin};
use easyimmerse_core::project::{ProjectId, ProjectSettings};
use easyimmerse_core::providers::media_source::{
    MediaDescription, MediaLocator, ResolvedMedia, SkippedSubtitle,
};
use easyimmerse_core::subtitle_track::SubtitleSelection;
use easyimmerse_plugins::{PluginError, PluginErrorKind, PluginPackage};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure, bad_request, internal, not_found};
use crate::fetched_subtitles::{FetchedTracks, read_fetched_subtitles};
use crate::media_source_jobs::{MediaSourceJob, MediaSourceJobId, output_dir_for};
use crate::plugins::{describe_media, resolve_media};
use crate::state::AppState;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ListPluginsResponse {
    pub plugins: Vec<InstalledPlugin>,
}

/// A plugin the server found in its plugin directory.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct InstalledPlugin {
    pub name: String,
    pub version: String,
    /// The capability the plugin exports, as its manifest names it, such as `media-source`.
    pub kind: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AddMediaFromSourceRequest {
    /// The name of an installed media-source plugin.
    pub plugin: String,
    pub locator: MediaLocator,
    /// The ids of the subtitle tracks to fetch with the media, from `describeMediaSource`.
    #[serde(default)]
    pub subtitles: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct DescribeMediaSourceRequest {
    pub locator: MediaLocator,
}

#[utoipa::path(
    get,
    path = "/plugins",
    tag = "plugins",
    operation_id = "listPlugins",
    security(("bearer_token" = [])),
    responses(
        (status = 200, description = "The installed plugins, by name", body = ListPluginsResponse),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn list_plugins(State(state): State<AppState>) -> Json<ListPluginsResponse> {
    let plugins = state
        .plugins
        .packages()
        .iter()
        .map(installed_plugin)
        .collect();
    Json(ListPluginsResponse { plugins })
}

fn installed_plugin(package: &PluginPackage) -> InstalledPlugin {
    InstalledPlugin {
        name: package.manifest.name.clone(),
        version: package.manifest.version.clone(),
        kind: kind_name(package.manifest.kind).to_string(),
    }
}

/// The kind as `plugin.toml` spells it.
fn kind_name(kind: easyimmerse_plugins::PluginKind) -> &'static str {
    use easyimmerse_plugins::PluginKind::*;
    match kind {
        SpeechToText => "speech-to-text",
        TextToSpeech => "text-to-speech",
        Translation => "translation",
        Alignment => "alignment",
        DictionaryFormat => "dictionary-format",
        MediaStep => "media-step",
        FlashcardExport => "flashcard-export",
        MediaSource => "media-source",
        Hello => "hello",
    }
}

/// Asks a media-source plugin what it has for a locator: the media's title and duration,
/// and the subtitle tracks that can be fetched with it. Nothing is fetched. The plugin
/// may take a few seconds to answer, as it usually asks the source.
#[utoipa::path(
    post,
    path = "/plugins/{plugin}/describe",
    tag = "plugins",
    operation_id = "describeMediaSource",
    security(("bearer_token" = [])),
    params(("plugin" = String, Path, description = "The name of an installed media-source plugin")),
    request_body = DescribeMediaSourceRequest,
    responses(
        (status = 200, description = "What the source has for the locator", body = MediaDescription),
        (status = 400, description = "The plugin does not understand the locator (code `invalid_locator`)", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No installed media-source plugin of that name", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 502, description = "The plugin could not describe the locator (code `media_source_failed`)", body = ApiError),
    ),
)]
pub async fn describe_media_source(
    State(state): State<AppState>,
    Path(plugin): Path<String>,
    Json(request): Json<DescribeMediaSourceRequest>,
) -> Result<Json<MediaDescription>, ApiFailure> {
    let package = media_source_package(&state, &plugin)?;
    let locator = request.locator.0;
    let description = tokio::task::spawn_blocking(move || describe_media(&package, &locator))
        .await
        .map_err(|error| internal(format!("plugin task failed: {error}")))?
        .map_err(plugin_failure)?;
    Ok(Json(description))
}

/// The installed media-source plugin called `name`.
pub(crate) fn media_source_package(
    state: &AppState,
    name: &str,
) -> Result<PluginPackage, ApiFailure> {
    state
        .plugins
        .media_source(name)
        .cloned()
        .ok_or_else(|| not_found(format!("no media-source plugin {name:?}")))
}

/// Starts fetching the media at a locator, such as a URL, through a media-source plugin
/// into the server's media directory, with the chosen subtitle tracks. The answer is the running job; poll it with
/// `getMediaSourceJob` until it is done or has failed. Once done, the media file is in
/// the project with the subtitle files the plugin fetched beside it, and a subtitle file in
/// the project's target language or translation language has that role at once.
#[utoipa::path(
    post,
    path = "/projects/{id}/media/from-source",
    tag = "media",
    operation_id = "addMediaFromSource",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The project id")),
    request_body = AddMediaFromSourceRequest,
    responses(
        (status = 202, description = "The job fetching the media, still running", body = MediaSourceJob),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such project, or no installed media-source plugin of that name", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 503, description = "The server has no media directory for plugins to fetch into (code `media_dir_unavailable`)", body = ApiError),
    ),
)]
pub async fn add_media_from_source(
    State(state): State<AppState>,
    Path(project_id): Path<ProjectId>,
    Json(request): Json<AddMediaFromSourceRequest>,
) -> Result<(StatusCode, Json<MediaSourceJob>), ApiFailure> {
    let settings = {
        let project_id = project_id.clone();
        state
            .with_storage(move |storage| storage.get_project(&project_id))
            .await?
            .settings
    };
    let package = media_source_package(&state, &request.plugin)?;
    let media_dir = media_dir(&state)?;
    let mut job = MediaSourceJob::start(project_id, &package.manifest.name, request.locator);
    // Which build of the plugin runs is the first thing to check when a fetch misbehaves,
    // and the version alone does not tell a rebuilt plugin from a stale copy.
    let build = plugin_build(&package);
    job.note(format!("running {build}"));
    let output_dir = output_dir_for(&media_dir, &job);
    tokio::fs::create_dir_all(&output_dir)
        .await
        .map_err(|error| {
            internal(format!(
                "could not create {}: {error}",
                output_dir.display()
            ))
        })?;
    tracing::info!(
        job = job.id.0,
        plugin = build,
        locator = job.locator.0,
        output_dir = %output_dir.display(),
        "fetching media through a plugin"
    );
    state.media_source_jobs.insert(job.clone());
    let fetch = Fetch {
        settings,
        package,
        output_dir,
        subtitle_ids: request.subtitles,
    };
    tokio::spawn(run_job(state, job.clone(), fetch));
    Ok((StatusCode::ACCEPTED, Json(job)))
}

/// The directory plugins fetch into, which a server without one cannot offer.
pub(crate) fn media_dir(state: &AppState) -> Result<std::path::PathBuf, ApiFailure> {
    state.media_dir.clone().ok_or_else(|| {
        ApiFailure::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "media_dir_unavailable",
            "this server has no media directory, so plugins cannot fetch media",
        )
    })
}

/// What one job fetches, and with what.
struct Fetch {
    settings: ProjectSettings,
    package: PluginPackage,
    output_dir: std::path::PathBuf,
    subtitle_ids: Vec<String>,
}

#[utoipa::path(
    get,
    path = "/projects/{id}/media/from-source/{job_id}",
    tag = "media",
    operation_id = "getMediaSourceJob",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("job_id" = String, Path, description = "The job id, from the answer that started it"),
    ),
    responses(
        (status = 200, description = "The job, with its progress and log so far, and its outcome once it has one", body = MediaSourceJob),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such job in the project; the server forgets old finished jobs and all jobs when it restarts", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_media_source_job(
    State(state): State<AppState>,
    Path((project_id, job_id)): Path<(ProjectId, MediaSourceJobId)>,
) -> Result<Json<MediaSourceJob>, ApiFailure> {
    state
        .media_source_jobs
        .get(&job_id)
        .filter(|job| job.project_id == project_id)
        .map(Json)
        .ok_or_else(|| {
            not_found(format!(
                "no media-source job {:?} in project {:?}",
                job_id.0, project_id.0
            ))
        })
}

/// Names a plugin build: its name and version, and the start of its component's digest, which
/// tells two builds of the same version apart.
fn plugin_build(package: &PluginPackage) -> String {
    let digest = package
        .wasm_sha256
        .get(..12)
        .unwrap_or(&package.wasm_sha256);
    format!(
        "{} {} (component {digest})",
        package.manifest.name, package.manifest.version
    )
}

/// Runs the plugin and stores what it fetched, recording the outcome on the job.
async fn run_job(state: AppState, job: MediaSourceJob, fetch: Fetch) {
    let started = std::time::Instant::now();
    let outcome = fetch_and_store(&state, &job, &fetch).await;
    let elapsed_ms = started.elapsed().as_millis() as u64;
    match outcome {
        Ok((media_file, skipped)) => {
            tracing::info!(
                job = job.id.0,
                plugin = job.plugin,
                media_file = media_file.id.0,
                name = media_file.name,
                skipped_subtitles = skipped.len(),
                elapsed_ms,
                "the plugin fetched the media"
            );
            state
                .media_source_jobs
                .update(&job.id, |job| job.finish_with(media_file, skipped));
        }
        Err(failure) => {
            tracing::warn!(
                job = job.id.0,
                plugin = job.plugin,
                locator = job.locator.0,
                code = failure.error.code,
                elapsed_ms,
                "the fetch failed: {}",
                failure.error.message
            );
            discard_output_dir(&fetch.output_dir).await;
            state
                .media_source_jobs
                .update(&job.id, |job| job.fail_with(failure.error));
        }
    }
}

/// Fetches the media and adds it with its subtitle tracks, returning it with the tracks
/// that were asked for but not added.
async fn fetch_and_store(
    state: &AppState,
    job: &MediaSourceJob,
    fetch: &Fetch,
) -> Result<(MediaFile, Vec<SkippedSubtitle>), ApiFailure> {
    let resolved = run_plugin(state, job, fetch).await?;
    let paths = std::iter::once(resolved.media_path.as_str()).chain(
        resolved
            .subtitles
            .iter()
            .map(|subtitle| subtitle.path.as_str()),
    );
    ensure_inside(&fetch.output_dir, paths)?;
    let name = media_name(&resolved);
    let FetchedTracks { tracks, skipped } = read_fetched_subtitles(
        &fetch.subtitle_ids,
        &resolved.subtitles,
        &fetch.settings,
        SubtitleSelection::default(),
    )
    .await;
    let project_id = job.project_id.clone();
    let origin = MediaOrigin {
        plugin: job.plugin.clone(),
        locator: job.locator.clone(),
    };
    state
        .with_storage(move |storage| {
            let source = MediaFileSource::Path {
                path: resolved.media_path,
            };
            let mut media_file = storage.add_media_file(&project_id, &name, &source)?;
            storage.set_media_file_origin(&media_file.id, &origin)?;
            media_file.origin = Some(origin);
            let mut selection = SubtitleSelection::default();
            for (track, role) in tracks {
                let added = storage.add_subtitle_track(&media_file.id, &track)?;
                if let Some(role) = role {
                    selection = selection.with_role(role, added.id);
                }
            }
            storage.set_subtitle_selection(&media_file.id, &selection)?;
            Ok((media_file, skipped))
        })
        .await
}

/// Runs the plugin on the blocking pool, since compiling and running it takes a while and
/// the fetch itself may take minutes. The job records what the plugin reports meanwhile.
async fn run_plugin(
    state: &AppState,
    job: &MediaSourceJob,
    fetch: &Fetch,
) -> Result<ResolvedMedia, ApiFailure> {
    let listener = state.media_source_jobs.listener(job.id.clone());
    let (package, locator, output_dir, subtitle_ids) = (
        fetch.package.clone(),
        job.locator.0.clone(),
        fetch.output_dir.clone(),
        fetch.subtitle_ids.clone(),
    );
    tokio::task::spawn_blocking(move || {
        resolve_media(&package, &locator, &output_dir, &subtitle_ids, listener)
    })
    .await
    .map_err(|error| internal(format!("plugin task failed: {error}")))?
    .map_err(plugin_failure)
}

pub(crate) fn plugin_failure(error: PluginError) -> ApiFailure {
    match error {
        PluginError::Plugin(PluginErrorKind::InvalidInput(message)) => {
            ApiFailure::new(StatusCode::BAD_REQUEST, "invalid_locator", message)
        }
        PluginError::Plugin(kind) => ApiFailure::new(
            StatusCode::BAD_GATEWAY,
            "media_source_failed",
            kind.to_string(),
        ),
        error => internal(format!("the media-source plugin could not run: {error}")),
    }
}

async fn discard_output_dir(output_dir: &FsPath) {
    if let Err(error) = tokio::fs::remove_dir_all(output_dir).await {
        tracing::warn!("could not remove {}: {error}", output_dir.display());
    }
}

/// Refuses a result naming files outside the directory the plugin was granted, so that a
/// plugin cannot make the project point at any other file on the machine.
pub(crate) fn ensure_inside<'a>(
    output_dir: &FsPath,
    paths: impl Iterator<Item = &'a str>,
) -> Result<(), ApiFailure> {
    let output_dir = output_dir.canonicalize().map_err(|error| {
        internal(format!(
            "could not resolve {}: {error}",
            output_dir.display()
        ))
    })?;
    for path in paths {
        let is_inside = FsPath::new(path)
            .canonicalize()
            .is_ok_and(|canonical| canonical.starts_with(&output_dir));
        if !is_inside {
            return Err(bad_request(format!(
                "the plugin named {path:?}, which is not a file it fetched"
            )));
        }
    }
    Ok(())
}

/// The title with the media file's extension, so that the name tells video from audio as a
/// file name would; the file name itself when the plugin gave no title.
fn media_name(resolved: &ResolvedMedia) -> String {
    let path = FsPath::new(&resolved.media_path);
    let title = resolved.title.trim();
    if title.is_empty() {
        return file_name(path);
    }
    match path.extension().and_then(|extension| extension.to_str()) {
        Some(extension) => format!("{title}.{extension}"),
        None => title.to_string(),
    }
}

fn file_name(path: &FsPath) -> String {
    path.file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn resolved(title: &str, media_path: &str) -> ResolvedMedia {
        ResolvedMedia {
            title: title.to_string(),
            media_path: media_path.to_string(),
            subtitles: Vec::new(),
            duration_ms: None,
        }
    }

    #[test]
    fn names_the_media_after_its_title_and_extension() {
        assert_eq!(
            media_name(&resolved("A Title", "/media/x/media.mp4")),
            "A Title.mp4"
        );
    }

    #[test]
    fn names_the_media_after_its_file_without_a_title() {
        assert_eq!(
            media_name(&resolved("  ", "/media/x/media.mp4")),
            "media.mp4"
        );
    }

    #[test]
    fn refuses_a_media_path_outside_the_output_dir() {
        let output_dir = tempfile::tempdir().unwrap();
        let other = tempfile::tempdir().unwrap();
        let outside = other.path().join("media.mp4");
        std::fs::write(&outside, "").unwrap();
        let outside = outside.to_string_lossy();
        let result = ensure_inside(output_dir.path(), std::iter::once(outside.as_ref()));
        assert_eq!(result.unwrap_err().status, StatusCode::BAD_REQUEST);
    }

    #[test]
    fn accepts_a_media_path_inside_the_output_dir() {
        let output_dir = tempfile::tempdir().unwrap();
        let inside = output_dir.path().join("media.mp4");
        std::fs::write(&inside, "").unwrap();
        let inside = inside.to_string_lossy();
        let result = ensure_inside(output_dir.path(), std::iter::once(inside.as_ref()));
        assert_eq!(result, Ok(()));
    }
}

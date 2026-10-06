//! The installed plugins, and adding media to a project through a media-source plugin.
//! The fetch runs as a job, since it takes as long as a download; the client polls it.

use std::path::Path as FsPath;

use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use easyimmerse_core::media_file::{MediaFile, MediaFileSource};
use easyimmerse_core::project::{ProjectId, ProjectSettings};
use easyimmerse_core::providers::media_source::{MediaLocator, ResolvedMedia, ResolvedSubtitle};
use easyimmerse_core::subtitle_track::{SubtitleRole, SubtitleSelection};
use easyimmerse_core::text_source::TextSource;
use easyimmerse_core::timed_text::{detect_format, parse_timed_text};
use easyimmerse_plugins::{PluginError, PluginErrorKind, PluginPackage};
use easyimmerse_storage::NewSubtitleTrack;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure, bad_request, internal, not_found};
use crate::media_source_jobs::{MediaSourceJob, MediaSourceJobId, output_dir_for};
use crate::plugins::resolve_media;
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

/// Starts fetching the media at a locator, such as a URL, through a media-source plugin
/// into the server's media directory. The answer is the running job; poll it with
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
    let package = state
        .plugins
        .media_source(&request.plugin)
        .cloned()
        .ok_or_else(|| not_found(format!("no media-source plugin {:?}", request.plugin)))?;
    let media_dir = state.media_dir.clone().ok_or_else(|| {
        ApiFailure::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "media_dir_unavailable",
            "this server has no media directory, so plugins cannot fetch media",
        )
    })?;
    let job = MediaSourceJob::start(project_id, &package.manifest.name, request.locator);
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
        plugin = job.plugin,
        locator = job.locator.0,
        output_dir = %output_dir.display(),
        "fetching media through a plugin"
    );
    state.media_source_jobs.insert(job.clone());
    tokio::spawn(run_job(state, job.clone(), settings, package, output_dir));
    Ok((StatusCode::ACCEPTED, Json(job)))
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

/// Runs the plugin and stores what it fetched, recording the outcome on the job.
async fn run_job(
    state: AppState,
    job: MediaSourceJob,
    settings: ProjectSettings,
    package: PluginPackage,
    output_dir: std::path::PathBuf,
) {
    let started = std::time::Instant::now();
    let outcome = fetch_and_store(&state, &job, &settings, &package, &output_dir).await;
    let elapsed_ms = started.elapsed().as_millis() as u64;
    match outcome {
        Ok(media_file) => {
            tracing::info!(
                job = job.id.0,
                plugin = job.plugin,
                media_file = media_file.id.0,
                name = media_file.name,
                elapsed_ms,
                "the plugin fetched the media"
            );
            state
                .media_source_jobs
                .update(&job.id, |job| job.finish_with(media_file));
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
            discard_output_dir(&output_dir).await;
            state
                .media_source_jobs
                .update(&job.id, |job| job.fail_with(failure.error));
        }
    }
}

async fn fetch_and_store(
    state: &AppState,
    job: &MediaSourceJob,
    settings: &ProjectSettings,
    package: &PluginPackage,
    output_dir: &FsPath,
) -> Result<MediaFile, ApiFailure> {
    let resolved = run_plugin(state, job, package, output_dir).await?;
    ensure_inside(output_dir, &resolved)?;
    let name = media_name(&resolved);
    let subtitles = read_subtitles(&resolved.subtitles, settings).await;
    let project_id = job.project_id.clone();
    state
        .with_storage(move |storage| {
            let source = MediaFileSource::Path {
                path: resolved.media_path,
            };
            let media_file = storage.add_media_file(&project_id, &name, &source)?;
            let mut selection = SubtitleSelection::default();
            for (track, role) in subtitles {
                let added = storage.add_subtitle_track(&media_file.id, &track)?;
                if let Some(role) = role {
                    selection = selection.with_role(role, added.id);
                }
            }
            storage.set_subtitle_selection(&media_file.id, &selection)?;
            Ok(media_file)
        })
        .await
}

/// Runs the plugin on the blocking pool, since compiling and running it takes a while and
/// the fetch itself may take minutes. The job records what the plugin reports meanwhile.
async fn run_plugin(
    state: &AppState,
    job: &MediaSourceJob,
    package: &PluginPackage,
    output_dir: &FsPath,
) -> Result<ResolvedMedia, ApiFailure> {
    let listener = state.media_source_jobs.listener(job.id.clone());
    let (package, locator, output_dir) = (
        package.clone(),
        job.locator.0.clone(),
        output_dir.to_path_buf(),
    );
    tokio::task::spawn_blocking(move || resolve_media(&package, &locator, &output_dir, listener))
        .await
        .map_err(|error| internal(format!("plugin task failed: {error}")))?
        .map_err(plugin_failure)
}

fn plugin_failure(error: PluginError) -> ApiFailure {
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
fn ensure_inside(output_dir: &FsPath, resolved: &ResolvedMedia) -> Result<(), ApiFailure> {
    let output_dir = output_dir.canonicalize().map_err(|error| {
        internal(format!(
            "could not resolve {}: {error}",
            output_dir.display()
        ))
    })?;
    let paths = std::iter::once(resolved.media_path.as_str()).chain(
        resolved
            .subtitles
            .iter()
            .map(|subtitle| subtitle.path.as_str()),
    );
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

/// Parses each subtitle file once, as adding a subtitle track by hand does, and gives the
/// first file in each of the project's languages that language's role. A file that cannot
/// be read or parsed is left out with a warning.
async fn read_subtitles(
    subtitles: &[ResolvedSubtitle],
    settings: &ProjectSettings,
) -> Vec<(NewSubtitleTrack, Option<SubtitleRole>)> {
    let mut tracks = Vec::new();
    let mut selection = SubtitleSelection::default();
    for subtitle in subtitles {
        let Some(track) = read_subtitle(subtitle).await else {
            continue;
        };
        let role = role_for(subtitle.language.as_deref(), settings, &selection);
        if let Some(role) = role {
            selection = selection.with_role(role, placeholder_track_id());
        }
        tracks.push((track, role));
    }
    tracks
}

/// Stands in for the ids of the tracks that will be added, while roles are chosen.
fn placeholder_track_id() -> easyimmerse_core::subtitle_track::SubtitleTrackId {
    easyimmerse_core::subtitle_track::SubtitleTrackId(String::new())
}

async fn read_subtitle(subtitle: &ResolvedSubtitle) -> Option<NewSubtitleTrack> {
    let text = match tokio::fs::read_to_string(&subtitle.path).await {
        Ok(text) => text,
        Err(error) => {
            tracing::warn!("skipping the subtitles at {}: {error}", subtitle.path);
            return None;
        }
    };
    let format = detect_format(&text);
    let parsed = match parse_timed_text(&text, Some(format)) {
        Ok(parsed) => parsed,
        Err(error) => {
            tracing::warn!("skipping the subtitles at {}: {error}", subtitle.path);
            return None;
        }
    };
    Some(NewSubtitleTrack {
        name: file_name(FsPath::new(&subtitle.path)),
        format,
        source: TextSource::Path {
            path: subtitle.path.clone(),
        },
        sample: parsed.cues.first().map(|cue| cue.text.clone()),
    })
}

/// The role a subtitle file in `language` takes: target when it is the first in the
/// project's target language, translation when it is the first in the translation language.
fn role_for(
    language: Option<&str>,
    settings: &ProjectSettings,
    selection: &SubtitleSelection,
) -> Option<SubtitleRole> {
    let language = language?;
    if selection.target_track_id.is_none() && same_language(language, &settings.target_language) {
        Some(SubtitleRole::Target)
    } else if selection.translation_track_id.is_none()
        && same_language(language, &settings.translation_language)
    {
        Some(SubtitleRole::Translation)
    } else {
        None
    }
}

/// Compares the primary subtags of two language tags, so that `ja-JP` matches `ja`.
fn same_language(a: &str, b: &str) -> bool {
    primary_subtag(a).eq_ignore_ascii_case(primary_subtag(b))
}

fn primary_subtag(tag: &str) -> &str {
    tag.split(['-', '_']).next().unwrap_or(tag)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn settings() -> ProjectSettings {
        ProjectSettings {
            name: "Japanese".to_string(),
            target_language: "ja".to_string(),
            translation_language: "en".to_string(),
            flashcard_fields: Vec::new(),
            default_tags: Vec::new(),
            tags_media_name: false,
            fills_audio_with_tts: false,
        }
    }

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
    fn gives_the_target_role_to_the_target_language() {
        let role = role_for(Some("ja-JP"), &settings(), &SubtitleSelection::default());
        assert_eq!(role, Some(SubtitleRole::Target));
    }

    #[test]
    fn gives_the_translation_role_to_the_translation_language() {
        let role = role_for(Some("EN"), &settings(), &SubtitleSelection::default());
        assert_eq!(role, Some(SubtitleRole::Translation));
    }

    #[test]
    fn gives_no_role_to_another_language() {
        let role = role_for(Some("fr"), &settings(), &SubtitleSelection::default());
        assert_eq!(role, None);
    }

    #[test]
    fn gives_no_role_to_a_second_file_in_the_target_language() {
        let taken =
            SubtitleSelection::default().with_role(SubtitleRole::Target, placeholder_track_id());
        assert_eq!(role_for(Some("ja"), &settings(), &taken), None);
    }

    #[test]
    fn gives_no_role_without_a_language() {
        assert_eq!(
            role_for(None, &settings(), &SubtitleSelection::default()),
            None
        );
    }

    #[test]
    fn refuses_a_media_path_outside_the_output_dir() {
        let output_dir = tempfile::tempdir().unwrap();
        let other = tempfile::tempdir().unwrap();
        let outside = other.path().join("media.mp4");
        std::fs::write(&outside, "").unwrap();
        let result = ensure_inside(
            output_dir.path(),
            &resolved("t", &outside.to_string_lossy()),
        );
        assert_eq!(result.unwrap_err().status, StatusCode::BAD_REQUEST);
    }

    #[test]
    fn accepts_a_media_path_inside_the_output_dir() {
        let output_dir = tempfile::tempdir().unwrap();
        let inside = output_dir.path().join("media.mp4");
        std::fs::write(&inside, "").unwrap();
        let result = ensure_inside(output_dir.path(), &resolved("t", &inside.to_string_lossy()));
        assert_eq!(result, Ok(()));
    }
}

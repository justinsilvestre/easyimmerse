//! The subtitle tracks a user has added to a media file, their cues, and which of them show.

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::{Extension, Json};
use easyimmerse_core::media_file::MediaFileId;
use easyimmerse_core::project::ProjectId;
use easyimmerse_core::subtitle_track::{
    AddSubtitleTrackRequest, SubtitleSelection, SubtitleTrack, SubtitleTrackId,
    SubtitleTracksResponse,
};
use easyimmerse_core::text_source::TextSource;
use easyimmerse_core::timed_text::{
    TimedTextFormat, TimedTextTrack, detect_format, parse_timed_text,
};
use easyimmerse_storage::NewSubtitleTrack;

use crate::auth::error_body::{ApiError, ApiFailure, not_found};
use crate::auth::principal::Principal;
use crate::fetched_subtitle_files::remove_subtitle_tracks;
use crate::library_tracks::{editable_library_item_of, follow_shown_tracks};
use crate::local_path::{resolve_local_file, resolve_local_text};
use crate::routes::media::load_media_file;
use crate::state::AppState;

#[utoipa::path(
    get,
    path = "/projects/{id}/media/{media_id}/subtitles",
    tag = "subtitles",
    operation_id = "listSubtitleTracks",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
    ),
    responses(
        (status = 200, description = "The media file's subtitle tracks, oldest first, and which of them show", body = SubtitleTracksResponse),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such media file in the project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn list_subtitle_tracks(
    State(state): State<AppState>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
) -> Result<Json<SubtitleTracksResponse>, ApiFailure> {
    load_media_file(&state, project_id, media_id.clone()).await?;
    let response = state
        .with_storage(move |storage| {
            Ok(SubtitleTracksResponse {
                tracks: storage.list_subtitle_tracks(&media_id)?,
                selection: storage.get_subtitle_selection(&media_id)?,
            })
        })
        .await?;
    Ok(Json(response))
}

/// Adds a subtitles file to the media file.
/// The text is parsed once to check it and to take its first cue as the track's sample;
/// a `path` source is read on the server's machine.
/// For a media file from the library, the item's segments become the cues of the tracks it then shows.
#[utoipa::path(
    post,
    path = "/projects/{id}/media/{media_id}/subtitles",
    tag = "subtitles",
    operation_id = "addSubtitleTrack",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
    ),
    request_body = AddSubtitleTrackRequest,
    responses(
        (status = 201, description = "The added track", body = SubtitleTrack),
        (status = 400, description = "The text could not be parsed", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "The token may not read local paths, or the media file is from the library and the principal does not manage it", body = ApiError),
        (status = 404, description = "No such media file in the project, or no file at the given path", body = ApiError),
        (status = 409, description = "`item_published` or `item_processing`: the media file is from a library item that is published or being published", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn add_subtitle_track(
    State(state): State<AppState>,
    Extension(principal): Extension<Principal>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
    Json(request): Json<AddSubtitleTrackRequest>,
) -> Result<(StatusCode, Json<SubtitleTrack>), ApiFailure> {
    let media_file = load_media_file(&state, project_id, media_id.clone()).await?;
    let library_item = editable_library_item_of(&state, &principal, &media_file).await?;
    let track = store_subtitle_track(&state, &principal, media_id.clone(), request).await?;
    if let Some(item) = library_item {
        follow_shown_tracks(&state, &principal, media_id, &item).await?;
    }
    Ok((StatusCode::CREATED, Json(track)))
}

/// Reads and parses a subtitles file, then stores it as a track of the media file,
/// giving it the requested role. The media file must already be known to exist.
pub async fn store_subtitle_track(
    state: &AppState,
    principal: &Principal,
    media_id: MediaFileId,
    request: AddSubtitleTrackRequest,
) -> Result<SubtitleTrack, ApiFailure> {
    let source = resolve_text_source(state, principal, request.source).await?;
    let text = read_text(state, principal, &source).await?;
    let parsed = parse_subtitle_text(&text, request.format)?;
    let new_track = NewSubtitleTrack {
        name: request.name,
        format: parsed.format,
        source,
        sample: parsed.cues.first().map(|cue| cue.text.clone()),
    };
    state
        .with_storage(move |storage| {
            let track = storage.add_subtitle_track(&media_id, &new_track)?;
            if let Some(role) = request.role {
                let selection = storage
                    .get_subtitle_selection(&media_id)?
                    .with_role(role, track.id.clone());
                storage.set_subtitle_selection(&media_id, &selection)?;
            }
            Ok(track)
        })
        .await
}

/// Parses subtitle text in the given format, or in the format detected from the text when none is given.
pub fn parse_subtitle_text(
    text: &str,
    format: Option<TimedTextFormat>,
) -> Result<TimedTextTrack, ApiFailure> {
    let format = format.unwrap_or_else(|| detect_format(text));
    Ok(parse_timed_text(text, Some(format))?)
}

#[utoipa::path(
    delete,
    path = "/projects/{id}/media/{media_id}/subtitles/{track_id}",
    tag = "subtitles",
    operation_id = "removeSubtitleTrack",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
        ("track_id" = String, Path, description = "The subtitle track id"),
    ),
    responses(
        (status = 204, description = "The track was removed. A file the app downloaded into its media directory for the track is deleted once no media file or track refers to it; any other file is left alone"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such track on the media file", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn remove_subtitle_track(
    State(state): State<AppState>,
    Path((project_id, media_id, track_id)): Path<(ProjectId, MediaFileId, SubtitleTrackId)>,
) -> Result<StatusCode, ApiFailure> {
    let media_file = load_media_file(&state, project_id.clone(), media_id.clone()).await?;
    load_subtitle_track(&state, project_id, media_id, track_id.clone()).await?;
    remove_subtitle_tracks(&state, &media_file, &[track_id]).await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Parses the track's text, reading a `path` source from the server's machine each time.
#[utoipa::path(
    get,
    path = "/projects/{id}/media/{media_id}/subtitles/{track_id}/cues",
    tag = "subtitles",
    operation_id = "getSubtitleCues",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
        ("track_id" = String, Path, description = "The subtitle track id"),
    ),
    responses(
        (status = 200, description = "The track's cues", body = TimedTextTrack),
        (status = 400, description = "The text could no longer be parsed", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "The token may not read local paths", body = ApiError),
        (status = 404, description = "No such track on the media file, or its file is gone", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_subtitle_cues(
    State(state): State<AppState>,
    Extension(principal): Extension<Principal>,
    Path((project_id, media_id, track_id)): Path<(ProjectId, MediaFileId, SubtitleTrackId)>,
) -> Result<Json<TimedTextTrack>, ApiFailure> {
    let stored = load_subtitle_track(&state, project_id, media_id, track_id).await?;
    let text = read_text(&state, &principal, &stored.source).await?;
    Ok(Json(parse_timed_text(&text, Some(stored.track.format))?))
}

#[utoipa::path(
    put,
    path = "/projects/{id}/media/{media_id}/subtitle-selection",
    tag = "subtitles",
    operation_id = "setSubtitleSelection",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
    ),
    request_body = SubtitleSelection,
    responses(
        (status = 204, description = "The selection was saved. For a media file from the library, the item's segments became the cues of the chosen tracks"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "The media file is from the library and the principal does not manage it", body = ApiError),
        (status = 404, description = "No such media file in the project, or a named track is not on it", body = ApiError),
        (status = 409, description = "`item_published` or `item_processing`: the media file is from a library item that is published or being published", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn set_subtitle_selection(
    State(state): State<AppState>,
    Extension(principal): Extension<Principal>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
    Json(selection): Json<SubtitleSelection>,
) -> Result<StatusCode, ApiFailure> {
    let media_file = load_media_file(&state, project_id, media_id.clone()).await?;
    let library_item = editable_library_item_of(&state, &principal, &media_file).await?;
    let id = media_id.clone();
    state
        .with_storage(move |storage| storage.set_subtitle_selection(&id, &selection))
        .await?;
    if let Some(item) = library_item {
        follow_shown_tracks(&state, &principal, media_id, &item).await?;
    }
    Ok(StatusCode::NO_CONTENT)
}

/// The source to store for a new track: a `path` source names the file by its canonical
/// path, once the token may read it and the file exists.
async fn resolve_text_source(
    state: &AppState,
    principal: &Principal,
    source: TextSource,
) -> Result<TextSource, ApiFailure> {
    match source {
        TextSource::Path { path } => Ok(TextSource::Path {
            path: resolve_local_file(principal, &state.config, &path).await?,
        }),
        source => Ok(source),
    }
}

/// Reads a track's text, from the server's machine for a `path` source.
pub async fn read_text(
    state: &AppState,
    principal: &Principal,
    source: &TextSource,
) -> Result<String, ApiFailure> {
    match source {
        TextSource::Inline { text } => Ok(text.clone()),
        TextSource::Path { path } => resolve_local_text(principal, &state.config, path).await,
    }
}

/// Loads a track, answering 404 when it does not exist or sits on another media file.
async fn load_subtitle_track(
    state: &AppState,
    project_id: ProjectId,
    media_id: MediaFileId,
    track_id: SubtitleTrackId,
) -> Result<easyimmerse_storage::StoredSubtitleTrack, ApiFailure> {
    load_media_file(state, project_id, media_id.clone()).await?;
    let stored = state
        .with_storage(move |storage| storage.get_subtitle_track(&track_id))
        .await?;
    if stored.track.media_file_id == media_id {
        Ok(stored)
    } else {
        Err(not_found(format!(
            "no subtitle track {:?} on media file {:?}",
            stored.track.id.0, media_id.0
        )))
    }
}

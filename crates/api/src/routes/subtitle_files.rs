//! The subtitles of a media file: files the user added, the cues of embedded subtitle
//! streams, and the user's choice among them.

use std::path::Path as FilePath;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::{Extension, Json};
use easyimmerse_core::media_file::{MediaFileId, SubtitleSelection};
use easyimmerse_core::project::ProjectId;
use easyimmerse_core::subtitle_file::{SubtitleFile, SubtitleFileId};
use easyimmerse_core::text_source::TextSource;
use easyimmerse_core::timed_text::{TimedTextFormat, TimedTextTrack, parse_timed_text, parse_vtt};
use easyimmerse_media::{ContainerInfo, TrackKind};
use easyimmerse_storage::{NewSubtitleFile, StoredSubtitleFile, subtitle_file_track_id};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure, bad_request, internal};
use crate::auth::token_kind::TokenKind;
use crate::routes::media::load_media_file;
use crate::routes::media_support::{
    conversion_failure, probe_media, require_conversion, resolve_source_path,
};
use crate::routes::timed_text::resolve_text_source;
use crate::state::AppState;

/// The ffmpeg codec names of subtitle streams that hold text, which ffmpeg can convert to
/// WebVTT. Image-based subtitles such as PGS and VobSub are left out.
pub const TEXT_SUBTITLE_CODECS: [&str; 16] = [
    "subrip",
    "srt",
    "ass",
    "ssa",
    "webvtt",
    "mov_text",
    "text",
    "microdvd",
    "subviewer",
    "sami",
    "realtext",
    "mpl2",
    "vplayer",
    "jacosub",
    "pjs",
    "stl",
];

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ListSubtitleFilesResponse {
    pub subtitle_files: Vec<SubtitleFile>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AddSubtitleFileRequest {
    /// The name shown when choosing subtitles, usually the file name.
    pub name: String,
    pub source: TextSource,
    /// The format of the text. Detected from the text when absent.
    pub format: Option<TimedTextFormat>,
    /// The BCP 47 code of the subtitles' language, when known.
    pub language: Option<String>,
}

#[utoipa::path(
    get,
    path = "/projects/{id}/media/{media_id}/subtitle-files",
    tag = "subtitles",
    operation_id = "listSubtitleFiles",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
    ),
    responses(
        (status = 200, description = "The media file's subtitles files with their cues, oldest first", body = ListSubtitleFilesResponse),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such media file in the project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn list_subtitle_files(
    State(state): State<AppState>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
) -> Result<Json<ListSubtitleFilesResponse>, ApiFailure> {
    load_media_file(&state, project_id, media_id.clone()).await?;
    let stored = state
        .with_storage(move |storage| storage.list_subtitle_files(&media_id))
        .await?;
    let subtitle_files = stored
        .into_iter()
        .map(with_cues)
        .collect::<Result<_, _>>()?;
    Ok(Json(ListSubtitleFilesResponse { subtitle_files }))
}

/// Adds a subtitles file to a media file. A `path` source names a file on the server's
/// machine, which only a token allowed to read local paths may do.
#[utoipa::path(
    post,
    path = "/projects/{id}/media/{media_id}/subtitle-files",
    tag = "subtitles",
    operation_id = "addSubtitleFile",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
    ),
    request_body = AddSubtitleFileRequest,
    responses(
        (status = 201, description = "The added subtitles file with its cues", body = SubtitleFile),
        (status = 400, description = "The text could not be parsed", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "The token may not read local paths", body = ApiError),
        (status = 404, description = "No such media file in the project, or no file at the given path", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn add_subtitle_file(
    State(state): State<AppState>,
    Extension(token): Extension<TokenKind>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
    Json(request): Json<AddSubtitleFileRequest>,
) -> Result<(StatusCode, Json<SubtitleFile>), ApiFailure> {
    load_media_file(&state, project_id, media_id.clone()).await?;
    let text = resolve_text_source(&state, token, request.source).await?;
    let track = parse_timed_text(&text, request.format)?;
    let file = NewSubtitleFile {
        name: request.name,
        language: request.language,
        text,
        format: track.format,
    };
    let stored = state
        .with_storage(move |storage| storage.add_subtitle_file(&media_id, &file))
        .await?;
    Ok((
        StatusCode::CREATED,
        Json(to_subtitle_file(stored, track.cues)),
    ))
}

#[utoipa::path(
    delete,
    path = "/projects/{id}/media/{media_id}/subtitle-files/{file_id}",
    tag = "subtitles",
    operation_id = "removeSubtitleFile",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
        ("file_id" = String, Path, description = "The subtitles file id"),
    ),
    responses(
        (status = 204, description = "The file was removed, and the subtitle selection no longer names it"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such subtitles file of the media file", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn remove_subtitle_file(
    State(state): State<AppState>,
    Path((project_id, media_id, file_id)): Path<(ProjectId, MediaFileId, SubtitleFileId)>,
) -> Result<StatusCode, ApiFailure> {
    load_media_file(&state, project_id, media_id.clone()).await?;
    state
        .with_storage(move |storage| storage.remove_subtitle_file(&media_id, &file_id))
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Saves which subtitles are shown. Each id is `embedded:<stream index>` or
/// `file:<subtitles file id>`.
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
        (status = 204, description = "The choice was saved"),
        (status = 400, description = "An id names no embedded track or subtitles file of the media file", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such media file in the project", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn set_subtitle_selection(
    State(state): State<AppState>,
    Path((project_id, media_id)): Path<(ProjectId, MediaFileId)>,
    Json(selection): Json<SubtitleSelection>,
) -> Result<StatusCode, ApiFailure> {
    load_media_file(&state, project_id, media_id.clone()).await?;
    let file_ids = state
        .with_storage({
            let media_id = media_id.clone();
            move |storage| storage.list_subtitle_files(&media_id)
        })
        .await?
        .iter()
        .map(|file| subtitle_file_track_id(&file.id))
        .collect::<Vec<_>>();
    for track_id in [&selection.target, &selection.translation]
        .into_iter()
        .flatten()
    {
        validate_track_id(track_id, &file_ids)?;
    }
    state
        .with_storage(move |storage| storage.set_subtitle_selection(&media_id, &selection))
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Converts an embedded subtitle stream to cues with ffmpeg.
#[utoipa::path(
    get,
    path = "/projects/{id}/media/{media_id}/subtitle-tracks/{index}/cues",
    tag = "subtitles",
    operation_id = "getEmbeddedSubtitleCues",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
        ("index" = u32, Path, description = "The stream index of the subtitle track, as ffmpeg counts it"),
    ),
    responses(
        (status = 200, description = "The track's cues", body = TimedTextTrack),
        (status = 400, description = "The index names no text subtitle stream, or the file could not be probed", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "The token may not read local paths", body = ApiError),
        (status = 404, description = "No such media file, no file at its path, or a browser-held file (code `not_resolvable`)", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 500, description = "ffmpeg failed (code `conversion_failed`)", body = ApiError),
        (status = 503, description = "This server has no ffmpeg (code `conversion_unavailable`)", body = ApiError),
    ),
)]
pub async fn get_embedded_subtitle_cues(
    State(state): State<AppState>,
    Extension(token): Extension<TokenKind>,
    Path((project_id, media_id, index)): Path<(ProjectId, MediaFileId, u32)>,
) -> Result<Json<TimedTextTrack>, ApiFailure> {
    let media_file = load_media_file(&state, project_id, media_id).await?;
    let path = resolve_source_path(&state, token, &media_file).await?;
    let service = require_conversion(&state)?.clone();
    ensure_text_subtitle(&*probe_media(&state, &path).await?, index)?;
    let vtt = service
        .subtitle_vtt(FilePath::new(&path), index)
        .await
        .map_err(conversion_failure)?;
    Ok(Json(parse_vtt(&vtt)?))
}

fn ensure_text_subtitle(container: &ContainerInfo, index: u32) -> Result<(), ApiFailure> {
    match container.track(index) {
        Some(track)
            if track.kind == TrackKind::Subtitle
                && TEXT_SUBTITLE_CODECS.contains(&track.codec.as_str()) =>
        {
            Ok(())
        }
        _ => Err(bad_request(format!(
            "stream {index} is not a text subtitle stream"
        ))),
    }
}

fn validate_track_id(track_id: &str, file_track_ids: &[String]) -> Result<(), ApiFailure> {
    let is_embedded = track_id
        .strip_prefix("embedded:")
        .is_some_and(|index| index.parse::<u32>().is_ok());
    if is_embedded || file_track_ids.iter().any(|file| file == track_id) {
        Ok(())
    } else {
        Err(bad_request(format!(
            "{track_id:?} names no embedded track or subtitles file of this media file"
        )))
    }
}

fn with_cues(stored: StoredSubtitleFile) -> Result<SubtitleFile, ApiFailure> {
    let track = parse_timed_text(&stored.text, Some(stored.format)).map_err(|error| {
        internal(format!(
            "the stored subtitles file {:?} no longer parses: {error}",
            stored.id.0
        ))
    })?;
    Ok(to_subtitle_file(stored, track.cues))
}

fn to_subtitle_file(
    stored: StoredSubtitleFile,
    cues: Vec<easyimmerse_core::timed_text::Cue>,
) -> SubtitleFile {
    SubtitleFile {
        id: stored.id,
        media_file_id: stored.media_file_id,
        name: stored.name,
        language: stored.language,
        cues,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn file_ids() -> Vec<String> {
        vec!["file:abc".to_string()]
    }

    #[test]
    fn accepts_an_embedded_track_id() {
        assert_eq!(validate_track_id("embedded:3", &file_ids()), Ok(()));
    }

    #[test]
    fn accepts_the_id_of_a_file_of_the_media_file() {
        assert_eq!(validate_track_id("file:abc", &file_ids()), Ok(()));
    }

    #[test]
    fn refuses_the_id_of_an_unknown_file() {
        assert!(validate_track_id("file:xyz", &file_ids()).is_err());
    }

    #[test]
    fn refuses_an_embedded_id_without_a_number() {
        assert!(validate_track_id("embedded:x", &file_ids()).is_err());
    }
}

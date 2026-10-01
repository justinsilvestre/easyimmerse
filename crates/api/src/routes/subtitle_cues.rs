use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::{Extension, Json};
use easyimmerse_core::media_file::{MediaFile, MediaSource, SubtitleTrackSource};
use easyimmerse_core::timed_text::{Cue, TimedTextFormat, TimedTextTrack, parse_timed_text};
use easyimmerse_media::{
    ContainerFormat, TrackKind, detect_container_format, extract_mov_text_cues, probe_container,
};
use easyimmerse_storage::StorageError;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure, internal};
use crate::auth::token_kind::TokenKind;
use crate::config::ApiConfig;
use crate::local_path::{resolve_local_path, resolve_local_text};
use crate::media_source::{load_media_file, local_source_path};
use crate::state::AppState;

/// A subtitle track stored inside a media container.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct EmbeddedSubtitleTrack {
    /// The container's own id for the track.
    pub track_id: u32,
    /// The language tag stored in the container, when there is one.
    pub language: Option<String>,
    /// The container's own name for the codec, such as `S_TEXT/UTF8` in Matroska.
    pub codec: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct EmbeddedSubtitlesResponse {
    pub tracks: Vec<EmbeddedSubtitleTrack>,
}

/// Returns the cues of a subtitle track. Cues extracted from an MP4 `mov_text` track
/// report the SubRip format, since they carry the same inline markup.
#[utoipa::path(
    get,
    path = "/projects/{id}/media/{media_id}/subtitle-tracks/{track_id}/cues",
    tag = "media",
    operation_id = "getSubtitleCues",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
        ("track_id" = String, Path, description = "The subtitle track id"),
    ),
    responses(
        (status = 200, description = "The cues of the subtitle track", body = TimedTextTrack),
        (status = 400, description = "The subtitles could not be read from the file", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "The token may not read local paths", body = ApiError),
        (status = 404, description = "No such track, or the browser holds its file", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_subtitle_cues(
    State(state): State<AppState>,
    Extension(token): Extension<TokenKind>,
    Path((id, media_id, track_id)): Path<(String, String, String)>,
) -> Result<Json<TimedTextTrack>, ApiFailure> {
    let media = load_media_file(&state, id, media_id).await?;
    let track = match find_track_source(&media, &track_id)? {
        SubtitleTrackSource::File { source } => {
            read_subtitle_file(token, &state.config, source).await?
        }
        SubtitleTrackSource::Embedded { track_id } => {
            read_embedded_track(token, &state.config, &media.source, *track_id).await?
        }
    };
    Ok(Json(track))
}

#[utoipa::path(
    get,
    path = "/projects/{id}/media/{media_id}/embedded-subtitles",
    tag = "media",
    operation_id = "listEmbeddedSubtitles",
    security(("bearer_token" = [])),
    params(
        ("id" = String, Path, description = "The project id"),
        ("media_id" = String, Path, description = "The media file id"),
    ),
    responses(
        (status = 200, description = "The subtitle tracks inside the media container", body = EmbeddedSubtitlesResponse),
        (status = 400, description = "The container could not be read", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "The token may not read local paths", body = ApiError),
        (status = 404, description = "No such media file, or the browser holds it", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn list_embedded_subtitles(
    State(state): State<AppState>,
    Extension(token): Extension<TokenKind>,
    Path((id, media_id)): Path<(String, String)>,
) -> Result<Json<EmbeddedSubtitlesResponse>, ApiFailure> {
    let media = load_media_file(&state, id, media_id).await?;
    let bytes = read_media_bytes(token, &state.config, &media.source).await?;
    let info = run_blocking(move || probe_container(&bytes)).await??;
    let tracks = info
        .tracks
        .into_iter()
        .filter(|track| track.kind == TrackKind::Subtitle)
        .map(|track| EmbeddedSubtitleTrack {
            track_id: track.id,
            language: track.language,
            codec: track.codec,
        })
        .collect();
    Ok(Json(EmbeddedSubtitlesResponse { tracks }))
}

fn find_track_source<'a>(
    media: &'a MediaFile,
    track_id: &str,
) -> Result<&'a SubtitleTrackSource, ApiFailure> {
    media
        .subtitle_tracks
        .iter()
        .find(|track| track.id == track_id)
        .map(|track| &track.source)
        .ok_or_else(|| StorageError::SubtitleTrackNotFound(track_id.to_string()).into())
}

async fn read_subtitle_file(
    token: TokenKind,
    config: &ApiConfig,
    source: &MediaSource,
) -> Result<TimedTextTrack, ApiFailure> {
    let text = resolve_local_text(token, config, local_source_path(source)?).await?;
    Ok(parse_timed_text(&text, None)?)
}

async fn read_embedded_track(
    token: TokenKind,
    config: &ApiConfig,
    source: &MediaSource,
    track_id: u32,
) -> Result<TimedTextTrack, ApiFailure> {
    let bytes = read_media_bytes(token, config, source).await?;
    let cues = run_blocking(move || extract_embedded_cues(&bytes, track_id)).await??;
    Ok(TimedTextTrack {
        format: TimedTextFormat::Srt,
        cues,
    })
}

/// Reads the whole media file into memory, since the container parsers work on a byte
/// slice. A feature-length video therefore costs its full size in memory for the duration
/// of the request; streaming parsers can replace this later.
async fn read_media_bytes(
    token: TokenKind,
    config: &ApiConfig,
    source: &MediaSource,
) -> Result<Vec<u8>, ApiFailure> {
    resolve_local_path(token, config, local_source_path(source)?).await
}

fn extract_embedded_cues(bytes: &[u8], track_id: u32) -> Result<Vec<Cue>, ApiFailure> {
    match detect_container_format(bytes) {
        Some(ContainerFormat::Mp4) => Ok(extract_mov_text_cues(bytes, track_id)?),
        _ => Err(ApiFailure::new(
            StatusCode::BAD_REQUEST,
            "embedded_subtitles_unsupported",
            "subtitles can only be extracted from MP4 files so far",
        )),
    }
}

/// Runs CPU-bound media parsing on the blocking thread pool.
async fn run_blocking<T: Send + 'static>(
    operation: impl FnOnce() -> T + Send + 'static,
) -> Result<T, ApiFailure> {
    tokio::task::spawn_blocking(operation)
        .await
        .map_err(|error| internal(format!("media task failed: {error}")))
}

//! Serves the playlist, init segment, and media segments of a conversion by its cache key.
//! The token's permission to read local paths was checked when the conversion was registered.

use axum::extract::{Path, State};
use axum::http::header::CONTENT_TYPE;
use axum::response::{IntoResponse, Response};
use easyimmerse_conversion::{ConversionKey, parse_segment_file_name};

use crate::auth::error_body::{ApiError, ApiFailure, internal, not_found};
use crate::routes::media_support::{conversion_failure, require_conversion};
use crate::state::AppState;

const PLAYLIST_CONTENT_TYPE: &str = "application/vnd.apple.mpegurl";
const SEGMENT_CONTENT_TYPE: &str = "video/mp4";

#[utoipa::path(
    get,
    path = "/conversions/{key}/index.m3u8",
    tag = "conversions",
    operation_id = "getConversionPlaylist",
    security(("bearer_token" = [])),
    params(("key" = String, Path, description = "The conversion's cache key")),
    responses(
        (status = 200, description = "The on-demand HLS playlist", body = String, content_type = "application/vnd.apple.mpegurl"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No conversion has this key", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 503, description = "This server does not convert media (code `conversion_unavailable`)", body = ApiError),
    ),
)]
pub async fn get_conversion_playlist(
    State(state): State<AppState>,
    Path(key): Path<String>,
) -> Result<Response, ApiFailure> {
    let service = require_conversion(&state)?;
    let playlist = service
        .playlist(&parse_key(&key)?)
        .await
        .map_err(conversion_failure)?;
    Ok(([(CONTENT_TYPE, PLAYLIST_CONTENT_TYPE)], playlist).into_response())
}

#[utoipa::path(
    get,
    path = "/conversions/{key}/init.mp4",
    tag = "conversions",
    operation_id = "getConversionInitSegment",
    security(("bearer_token" = [])),
    params(("key" = String, Path, description = "The conversion's cache key")),
    responses(
        (status = 200, description = "The fragmented MP4 init segment", body = Vec<u8>, content_type = "video/mp4"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No conversion has this key", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 500, description = "ffmpeg failed (code `conversion_failed`)", body = ApiError),
        (status = 503, description = "This server does not convert media (code `conversion_unavailable`)", body = ApiError),
        (status = 504, description = "The segment was not produced in time (code `segment_timeout`)", body = ApiError),
    ),
)]
pub async fn get_conversion_init_segment(
    State(state): State<AppState>,
    Path(key): Path<String>,
) -> Result<Response, ApiFailure> {
    let service = require_conversion(&state)?;
    let path = service
        .init_segment(&parse_key(&key)?)
        .await
        .map_err(conversion_failure)?;
    serve_segment_file(&path).await
}

#[utoipa::path(
    get,
    path = "/conversions/{key}/{segment}",
    tag = "conversions",
    operation_id = "getConversionSegment",
    security(("bearer_token" = [])),
    params(
        ("key" = String, Path, description = "The conversion's cache key"),
        ("segment" = String, Path, description = "A segment file name from the playlist, such as `s00042.m4s`"),
    ),
    responses(
        (status = 200, description = "The fragmented MP4 media segment", body = Vec<u8>, content_type = "video/mp4"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No conversion has this key, or the playlist has no such segment", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 500, description = "ffmpeg failed (code `conversion_failed`)", body = ApiError),
        (status = 503, description = "This server does not convert media (code `conversion_unavailable`)", body = ApiError),
        (status = 504, description = "The segment was not produced in time (code `segment_timeout`)", body = ApiError),
    ),
)]
pub async fn get_conversion_segment(
    State(state): State<AppState>,
    Path((key, segment)): Path<(String, String)>,
) -> Result<Response, ApiFailure> {
    let service = require_conversion(&state)?;
    let index = parse_segment_file_name(&segment)
        .ok_or_else(|| not_found(format!("no segment named {segment:?}")))?;
    let path = service
        .segment(&parse_key(&key)?, index)
        .await
        .map_err(conversion_failure)?;
    serve_segment_file(&path).await
}

fn parse_key(text: &str) -> Result<ConversionKey, ApiFailure> {
    ConversionKey::parse(text).ok_or_else(|| not_found(format!("no conversion with key {text:?}")))
}

/// Segments are at most a few megabytes, so they are read whole.
async fn serve_segment_file(path: &std::path::Path) -> Result<Response, ApiFailure> {
    let bytes = tokio::fs::read(path)
        .await
        .map_err(|error| internal(format!("could not read {}: {error}", path.display())))?;
    Ok(([(CONTENT_TYPE, SEGMENT_CONTENT_TYPE)], bytes).into_response())
}

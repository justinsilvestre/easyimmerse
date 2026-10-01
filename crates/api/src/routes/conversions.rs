use std::path::PathBuf;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::http::header::CONTENT_TYPE;
use axum::response::{IntoResponse, Response};
use easyimmerse_conversion::{ConversionKey, ConversionService};

use crate::auth::error_body::{ApiError, ApiFailure, internal, not_found};
use crate::state::AppState;

const PLAYLIST_TYPE: &str = "application/vnd.apple.mpegurl";
const INIT_SEGMENT_TYPE: &str = "video/mp4";
const MEDIA_SEGMENT_TYPE: &str = "video/iso.segment";

/// Returns the server path of a conversion's HLS playlist.
pub fn playlist_path(key: &ConversionKey) -> String {
    format!("/conversions/{key}/index.m3u8")
}

/// Serves the HLS playlist of a registered conversion.
#[utoipa::path(
    get,
    path = "/conversions/{key}/index.m3u8",
    tag = "conversions",
    operation_id = "getConversionPlaylist",
    security(("bearer_token" = [])),
    params(("key" = String, Path, description = "The conversion key from the playback plan")),
    responses(
        (status = 200, description = "The HLS playlist", content_type = "application/vnd.apple.mpegurl", body = String),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No conversion is registered under this key", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 500, description = "The conversion's cache entry could not be updated", body = ApiError),
        (status = 503, description = "This server cannot convert media", body = ApiError),
    ),
)]
pub async fn get_conversion_playlist(
    State(state): State<AppState>,
    Path(key): Path<String>,
) -> Result<Response, ApiFailure> {
    let playlist = service(&state)?.playlist(&parse_key(&key)?).await?;
    Ok(([(CONTENT_TYPE, PLAYLIST_TYPE)], playlist).into_response())
}

/// Serves the initialization segment of a conversion, converting the start of the file when necessary.
#[utoipa::path(
    get,
    path = "/conversions/{key}/init.mp4",
    tag = "conversions",
    operation_id = "getConversionInitSegment",
    security(("bearer_token" = [])),
    params(("key" = String, Path, description = "The conversion key from the playback plan")),
    responses(
        (status = 200, description = "The fragmented MP4 initialization segment", content_type = "video/mp4"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No conversion is registered under this key", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 500, description = "ffmpeg failed", body = ApiError),
        (status = 503, description = "This server cannot convert media, or the segment took too long", body = ApiError),
    ),
)]
pub async fn get_conversion_init_segment(
    State(state): State<AppState>,
    Path(key): Path<String>,
) -> Result<Response, ApiFailure> {
    let path = service(&state)?.init_segment(&parse_key(&key)?).await?;
    file_response(path, INIT_SEGMENT_TYPE).await
}

/// Serves a media segment of a conversion, converting the part of the file around it when necessary.
#[utoipa::path(
    get,
    path = "/conversions/{key}/{segment}",
    tag = "conversions",
    operation_id = "getConversionSegment",
    security(("bearer_token" = [])),
    params(
        ("key" = String, Path, description = "The conversion key from the playback plan"),
        ("segment" = String, Path, description = "The segment file name from the playlist, such as `seg-0.m4s`"),
    ),
    responses(
        (status = 200, description = "The fragmented MP4 media segment", content_type = "video/iso.segment"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such conversion or segment", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
        (status = 500, description = "ffmpeg failed", body = ApiError),
        (status = 503, description = "This server cannot convert media, or the segment took too long", body = ApiError),
    ),
)]
pub async fn get_conversion_segment(
    State(state): State<AppState>,
    Path((key, segment)): Path<(String, String)>,
) -> Result<Response, ApiFailure> {
    let index = segment_index(&segment).ok_or_else(|| not_found("no such segment"))?;
    let path = service(&state)?.segment(&parse_key(&key)?, index).await?;
    file_response(path, MEDIA_SEGMENT_TYPE).await
}

fn service(state: &AppState) -> Result<&ConversionService, ApiFailure> {
    state.conversions.as_ref().ok_or_else(|| {
        ApiFailure::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "conversion_unavailable",
            "this server cannot convert media, because ffmpeg or a cache directory is missing",
        )
    })
}

fn parse_key(text: &str) -> Result<ConversionKey, ApiFailure> {
    ConversionKey::parse(text)
        .ok_or_else(|| not_found("no conversion is registered under this key"))
}

/// Reads the index from a segment file name of the form `seg-<index>.m4s`.
fn segment_index(file_name: &str) -> Option<u32> {
    let digits = file_name.strip_prefix("seg-")?.strip_suffix(".m4s")?;
    let is_number = !digits.is_empty() && digits.bytes().all(|byte| byte.is_ascii_digit());
    if !is_number {
        return None;
    }
    digits.parse().ok()
}

async fn file_response(path: PathBuf, content_type: &'static str) -> Result<Response, ApiFailure> {
    let bytes = tokio::fs::read(&path)
        .await
        .map_err(|error| internal(format!("could not read {path:?}: {error}")))?;
    Ok(([(CONTENT_TYPE, content_type)], bytes).into_response())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_the_index_of_a_segment_name() {
        assert_eq!(segment_index("seg-12.m4s"), Some(12));
    }

    #[test]
    fn rejects_a_segment_name_without_digits() {
        assert_eq!(segment_index("seg-.m4s"), None);
    }

    #[test]
    fn rejects_a_signed_segment_index() {
        assert_eq!(segment_index("seg-+1.m4s"), None);
    }

    #[test]
    fn rejects_another_extension() {
        assert_eq!(segment_index("seg-1.mp4"), None);
    }

    #[test]
    fn rejects_an_index_that_overflows() {
        assert_eq!(segment_index("seg-99999999999.m4s"), None);
    }

    #[test]
    fn places_the_playlist_under_its_key() {
        let key = ConversionKey::parse(&"a".repeat(64)).expect("a well-formed key");
        assert_eq!(
            playlist_path(&key),
            format!("/conversions/{}/index.m3u8", "a".repeat(64))
        );
    }
}

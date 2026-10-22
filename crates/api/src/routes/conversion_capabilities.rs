//! What this server's conversion can do: the ffmpeg build it runs and the video encoder it found.

use axum::Json;
use axum::extract::State;
use easyimmerse_conversion::ConversionService;
use easyimmerse_media_ffmpeg::FfmpegPaths;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::ApiError;
use crate::state::AppState;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ConversionCapabilities {
    /// None when the server has no conversion service (no ffmpeg found or no cache directory).
    pub ffmpeg: Option<FfmpegBuild>,
    /// Whether encoder discovery has finished. While false, `video_encoder` is not known yet.
    pub encoder_discovery_finished: bool,
    /// The H.264 encoder that conversion uses. None when none works.
    pub video_encoder: Option<VideoEncoder>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct FfmpegBuild {
    /// The path of the ffmpeg executable.
    pub path: String,
    /// The version that `ffmpeg -version` reports, such as `8.1.2`.
    pub version: String,
    /// True when the server was given an ffmpeg directory, and false when it searched the usual places.
    pub is_custom: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct VideoEncoder {
    /// The ffmpeg encoder name, such as `h264_videotoolbox` or `libx264`.
    pub name: String,
    /// Whether the encoder runs on the processor rather than on video hardware.
    pub software: bool,
}

/// Without a conversion service, `ffmpeg` is null and no encoder is reported.
#[utoipa::path(
    get,
    path = "/conversion/capabilities",
    tag = "conversions",
    operation_id = "getConversionCapabilities",
    security(("bearer_token" = [])),
    responses(
        (status = 200, description = "The ffmpeg build and the video encoder conversion uses", body = ConversionCapabilities),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_conversion_capabilities(
    State(state): State<AppState>,
) -> Json<ConversionCapabilities> {
    Json(
        state
            .conversion
            .as_ref()
            .map_or_else(no_conversion, |service| {
                capabilities_of(service, is_custom_build(&state.ffmpeg_paths))
            }),
    )
}

fn no_conversion() -> ConversionCapabilities {
    ConversionCapabilities {
        ffmpeg: None,
        encoder_discovery_finished: false,
        video_encoder: None,
    }
}

fn capabilities_of(service: &ConversionService, is_custom: bool) -> ConversionCapabilities {
    let discovery = service.encoder_discovery();
    ConversionCapabilities {
        ffmpeg: Some(FfmpegBuild {
            path: service.ffmpeg_path().to_string_lossy().into_owned(),
            version: service.ffmpeg_version().to_owned(),
            is_custom,
        }),
        encoder_discovery_finished: discovery.finished,
        video_encoder: discovery.encoder.map(|encoder| VideoEncoder {
            name: encoder.name,
            software: encoder.software,
        }),
    }
}

/// The server names the ffmpeg binary only when it was given an ffmpeg directory.
fn is_custom_build(paths: &FfmpegPaths) -> bool {
    paths.ffmpeg.is_some()
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::*;

    #[test]
    fn counts_a_build_found_in_the_usual_places_as_not_custom() {
        assert!(!is_custom_build(&FfmpegPaths::default()));
    }

    #[test]
    fn counts_a_build_in_a_given_directory_as_custom() {
        assert!(is_custom_build(&FfmpegPaths::in_dir(Path::new(
            "/opt/homebrew/bin"
        ))));
    }
}

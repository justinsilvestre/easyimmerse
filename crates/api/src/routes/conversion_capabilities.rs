//! What this server's conversion can do: the ffmpeg build it runs and the video encoder it found.

use axum::Json;
use axum::extract::State;
use easyimmerse_conversion::ConversionService;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::ApiError;
use crate::state::AppState;

/// The file names of the bundled ffmpeg sidecars start with this.
const BUNDLED_SIDECAR_PREFIX: &str = "easyimmerse-";

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
    /// True when the build is not the bundled sidecar.
    pub custom: bool,
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
            .map_or_else(no_conversion, capabilities_of),
    )
}

fn no_conversion() -> ConversionCapabilities {
    ConversionCapabilities {
        ffmpeg: None,
        encoder_discovery_finished: false,
        video_encoder: None,
    }
}

fn capabilities_of(service: &ConversionService) -> ConversionCapabilities {
    let discovery = service.encoder_discovery();
    let path = service.ffmpeg_path();
    let bundled = path
        .file_name()
        .is_some_and(|name| name.to_string_lossy().starts_with(BUNDLED_SIDECAR_PREFIX));
    ConversionCapabilities {
        ffmpeg: Some(FfmpegBuild {
            path: path.to_string_lossy().into_owned(),
            version: service.ffmpeg_version().to_owned(),
            custom: !bundled,
        }),
        encoder_discovery_finished: discovery.finished,
        video_encoder: discovery.encoder.map(|encoder| VideoEncoder {
            name: encoder.name,
            software: encoder.software,
        }),
    }
}

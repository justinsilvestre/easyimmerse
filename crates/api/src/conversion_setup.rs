//! Starting the conversion service when the server has what it needs.

use std::path::PathBuf;

use easyimmerse_conversion::ConversionService;
use easyimmerse_media_ffmpeg::FfmpegPaths;

/// Starts the conversion service with conversions cached under `cache_dir`.
/// Returns `None`, and logs why, when there is no cache directory or ffmpeg cannot be found.
pub fn start_conversion_service(cache_dir: Option<PathBuf>) -> Option<ConversionService> {
    let Some(cache_dir) = cache_dir else {
        tracing::warn!("no cache directory was given, so media conversion is unavailable");
        return None;
    };
    ConversionService::new(cache_dir, FfmpegPaths::default())
        .inspect_err(|error| tracing::warn!("media conversion is unavailable: {error}"))
        .ok()
}

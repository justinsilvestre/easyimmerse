use serde::Deserialize;

use crate::easyimmerse::plugin::{
    fs, http, log, run_command,
    types::{MediaMetadata, PluginError, ProgressEvent, ResolvedMedia, SubtitleTrack},
};

/// The JSON that the bundled `fetch-locator` script prints for a locator.
#[derive(Deserialize)]
struct LocatorInfo {
    media_url: String,
    subtitle_url: String,
    title: String,
}

pub fn resolve(locator: &str, output_dir: &str) -> Result<ResolvedMedia, PluginError> {
    let info = fetch_locator(locator)?;
    report(0.0, "resolved locator");
    let media_path = format!("{output_dir}/media.mp4");
    download(&info.media_url, &media_path)?;
    report(0.5, "downloaded media");
    let subtitle_path = format!("{output_dir}/subtitles.srt");
    download(&info.subtitle_url, &subtitle_path)?;
    report(1.0, "downloaded subtitles");
    Ok(resolved_media(info, media_path, subtitle_path))
}

fn fetch_locator(locator: &str) -> Result<LocatorInfo, PluginError> {
    let output = run_command::run("fetch-locator", &[locator.to_string()])?;
    serde_json::from_str(&output.stdout)
        .map_err(|error| PluginError::InvalidInput(format!("fetch-locator output: {error}")))
}

fn download(url: &str, path: &str) -> Result<(), PluginError> {
    let response = http::get(url)?;
    fs::write_file(path, &response.body)
}

fn report(fraction: f32, message: &str) {
    log::progress(&ProgressEvent {
        fraction,
        message: message.to_string(),
    });
}

fn resolved_media(info: LocatorInfo, media_path: String, subtitle_path: String) -> ResolvedMedia {
    ResolvedMedia {
        metadata: MediaMetadata {
            title: info.title,
            duration_ms: None,
            media_url: info.media_url,
        },
        subtitle_tracks: vec![SubtitleTrack {
            language: Some("en".to_string()),
            url: info.subtitle_url,
        }],
        media_path,
        subtitle_paths: vec![subtitle_path],
    }
}

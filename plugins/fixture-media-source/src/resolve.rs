use serde::Deserialize;

use crate::easyimmerse::plugin::{
    fs, http, log, run_command,
    types::{
        AvailableSubtitle, FetchedSubtitle, MediaDescription, MediaMetadata, PluginError,
        ProgressEvent, ResolvedMedia,
    },
};

/// The id the fixture offers its one English subtitle track under.
const SUBTITLE_ID: &str = "en";

/// The JSON that the bundled `fetch-locator` script prints for a locator.
#[derive(Deserialize)]
struct LocatorInfo {
    media_url: String,
    subtitle_url: String,
    title: String,
}

pub fn describe(locator: &str) -> Result<MediaDescription, PluginError> {
    let info = fetch_locator(locator)?;
    Ok(MediaDescription {
        metadata: metadata(&info),
        subtitles: vec![AvailableSubtitle {
            id: SUBTITLE_ID.to_string(),
            language: Some("en".to_string()),
            name: "English".to_string(),
        }],
    })
}

pub fn resolve(
    locator: &str,
    output_dir: &str,
    subtitles: &[String],
) -> Result<ResolvedMedia, PluginError> {
    let info = fetch_locator(locator)?;
    report(0.0, "resolved locator");
    let media_path = format!("{output_dir}/media.mp4");
    download(&info.media_url, &media_path)?;
    report(0.5, "downloaded media");
    let subtitles = write_subtitles(&info, output_dir, subtitles)?;
    report(1.0, "downloaded subtitles");
    Ok(ResolvedMedia {
        metadata: metadata(&info),
        media_path,
        subtitles,
    })
}

pub fn fetch_subtitles(
    locator: &str,
    output_dir: &str,
    subtitles: &[String],
) -> Result<Vec<FetchedSubtitle>, PluginError> {
    let info = fetch_locator(locator)?;
    write_subtitles(&info, output_dir, subtitles)
}

/// Writes the one subtitle track when it was asked for; any other id is unknown.
fn write_subtitles(
    info: &LocatorInfo,
    output_dir: &str,
    subtitles: &[String],
) -> Result<Vec<FetchedSubtitle>, PluginError> {
    let mut fetched = Vec::new();
    for id in subtitles {
        if id != SUBTITLE_ID {
            return Err(PluginError::NotFound(format!("no subtitle track {id:?}")));
        }
        let path = format!("{output_dir}/subtitles.srt");
        download(&info.subtitle_url, &path)?;
        fetched.push(FetchedSubtitle {
            id: id.clone(),
            language: Some("en".to_string()),
            name: "English".to_string(),
            path,
        });
    }
    Ok(fetched)
}

fn metadata(info: &LocatorInfo) -> MediaMetadata {
    MediaMetadata {
        title: info.title.clone(),
        duration_ms: None,
        media_url: info.media_url.clone(),
    }
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

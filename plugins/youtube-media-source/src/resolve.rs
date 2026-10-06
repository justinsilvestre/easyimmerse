use crate::easyimmerse::plugin::{
    log,
    types::{MediaMetadata, PluginError, ProgressEvent, ResolvedMedia, SubtitleTrack},
};
use crate::locator::video_url;
use crate::ytdlp::{Description, Download, FORMAT, describe, download, version};

/// The suffix yt-dlp gives the automatic captions in the video's own language.
const ORIGINAL_SUFFIX: &str = "-orig";
/// YouTube lists the live chat replay among the subtitles.
const LIVE_CHAT: &str = "live_chat";

pub fn resolve(locator: &str, output_dir: &str) -> Result<ResolvedMedia, PluginError> {
    let url = video_url(locator)?;
    log::info(&format!("resolving {url}"));
    log::info(&format!("yt-dlp {}", version()?));
    report(0.0, "reading the video's description");
    let description = describe(&url)?;
    log::info(&format!(
        "{:?}: {} s, subtitles in {:?}, automatic captions in {} languages",
        description.title,
        description
            .duration
            .map_or("unknown".to_string(), |seconds| seconds.to_string()),
        description.subtitles.languages().collect::<Vec<_>>(),
        description.automatic_captions.languages().count()
    ));
    let languages = languages_to_fetch(&description);
    if languages.is_empty() {
        log::warn("the video has no subtitles to fetch");
    } else {
        log::info(&format!("fetching subtitles in {}", languages.join(", ")));
    }
    log::info(&format!("downloading with the format selector {FORMAT:?}"));
    report(0.1, "downloading the video and subtitles");
    let downloaded = download(&url, output_dir, &languages)?;
    log::info(&format!("downloaded {}", downloaded.filepath));
    report(1.0, "downloaded");
    Ok(resolved_media(description, downloaded))
}

/// Every subtitle track the uploader provided, except the live chat, and the automatic
/// captions in the video's own language. The automatic translations are left out.
fn languages_to_fetch(description: &Description) -> Vec<String> {
    let manual = description
        .subtitles
        .languages()
        .filter(|language| *language != LIVE_CHAT);
    let original_captions = description
        .automatic_captions
        .languages()
        .filter(|language| language.ends_with(ORIGINAL_SUFFIX));
    manual
        .chain(original_captions)
        .map(str::to_string)
        .collect()
}

fn resolved_media(description: Description, downloaded: Download) -> ResolvedMedia {
    let (subtitle_tracks, subtitle_paths): (Vec<_>, Vec<_>) = downloaded
        .requested_subtitles
        .unwrap_or_default()
        .into_iter()
        .filter_map(|(requested, subtitle)| {
            let path = subtitle.filepath?;
            let track = SubtitleTrack {
                language: Some(language_tag(&requested)),
                url: subtitle.url,
            };
            Some((track, path))
        })
        .unzip();
    ResolvedMedia {
        metadata: MediaMetadata {
            duration_ms: description.duration_ms(),
            title: description.title,
            media_url: description.webpage_url,
        },
        subtitle_tracks,
        media_path: downloaded.filepath,
        subtitle_paths,
    }
}

/// The language of a requested subtitle: `ja-orig` is the original captions in `ja`.
fn language_tag(requested: &str) -> String {
    requested
        .strip_suffix(ORIGINAL_SUFFIX)
        .unwrap_or(requested)
        .to_string()
}

fn report(fraction: f32, message: &str) {
    log::progress(&ProgressEvent {
        fraction,
        message: message.to_string(),
    });
}

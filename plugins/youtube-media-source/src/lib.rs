//! A media-source plugin for YouTube. It takes a video URL or id and asks the host to run
//! the bundled `youtube` script, which runs yt-dlp, to download the video as MP4 together
//! with its subtitles as WebVTT. A proof of concept, not meant to be published.

mod locator;
mod resolve;
mod ytdlp;

wit_bindgen::generate!({
    world: "media-source-plugin",
    path: "../../crates/plugin-api/wit",
});

use easyimmerse::plugin::types::{PluginError, ResolvedMedia};
use exports::easyimmerse::plugin::media_source;

struct YoutubeMediaSource;

impl media_source::Guest for YoutubeMediaSource {
    fn resolve(locator: String, output_dir: String) -> Result<ResolvedMedia, PluginError> {
        resolve::resolve(&locator, &output_dir)
    }
}

export!(YoutubeMediaSource);

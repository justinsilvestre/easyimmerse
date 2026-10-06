use crate::easyimmerse::plugin::types::PluginError;

const VIDEO_ID_LENGTH: usize = 11;

/// The URL to hand to yt-dlp: a URL as given, or the watch page of a bare video id.
pub fn video_url(locator: &str) -> Result<String, PluginError> {
    let locator = locator.trim();
    if locator.starts_with("https://") || locator.starts_with("http://") {
        return Ok(locator.to_string());
    }
    if is_video_id(locator) {
        return Ok(format!("https://www.youtube.com/watch?v={locator}"));
    }
    Err(PluginError::InvalidInput(format!(
        "{locator:?} is neither a YouTube URL nor a video id"
    )))
}

fn is_video_id(text: &str) -> bool {
    text.len() == VIDEO_ID_LENGTH
        && text
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'_')
}

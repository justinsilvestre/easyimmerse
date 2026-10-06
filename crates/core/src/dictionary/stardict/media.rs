use std::collections::HashSet;

use crate::dictionary::{DictionaryError, DictionaryMedia, DictionarySink, DictionarySource};

/// Passes every file under the dictionary's `res/` directory to the sink, with its path relative to `res/`,
/// except those whose paths were already sent.
pub fn import_media(
    source: &mut DictionarySource,
    resource_prefix: &str,
    sent_paths: &HashSet<String>,
    sink: &mut dyn DictionarySink,
) -> Result<(), DictionaryError> {
    for name in resource_names(source, resource_prefix) {
        let path = name[resource_prefix.len()..].to_string();
        if sent_paths.contains(&path) {
            continue;
        }
        let bytes = source.read(&name)?;
        let media_type = media_type(&path).to_string();
        sink.media(DictionaryMedia {
            path,
            media_type,
            bytes,
        })?;
    }
    Ok(())
}

fn resource_names(source: &DictionarySource, resource_prefix: &str) -> Vec<String> {
    source
        .names()
        .filter(|name| name.len() > resource_prefix.len() && name.starts_with(resource_prefix))
        .map(String::from)
        .collect()
}

/// Guesses a MIME type from a file's extension, falling back to `application/octet-stream`.
pub fn media_type(path: &str) -> &'static str {
    let extension = path.rsplit_once('.').map_or("", |(_, extension)| extension);
    match extension.to_ascii_lowercase().as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        "wav" => "audio/wav",
        "mp3" => "audio/mpeg",
        "ogg" | "oga" | "spx" | "opus" => "audio/ogg",
        "m4a" | "aac" => "audio/mp4",
        "flac" => "audio/flac",
        "mp4" => "video/mp4",
        "webm" => "video/webm",
        "css" => "text/css",
        "js" => "text/javascript",
        "ttf" => "font/ttf",
        "otf" => "font/otf",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        _ => "application/octet-stream",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recognizes_an_image_by_its_extension() {
        assert_eq!(media_type("pictures/cat.PNG"), "image/png");
    }

    #[test]
    fn recognizes_a_sound_by_its_extension() {
        assert_eq!(media_type("meow.mp3"), "audio/mpeg");
    }

    #[test]
    fn falls_back_to_a_generic_type() {
        assert_eq!(media_type("data.bin"), "application/octet-stream");
    }
}

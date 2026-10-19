//! Files that definitions refer to, such as images.

use super::super::dictionary_media::DictionaryMedia;
use super::super::error::DictionaryError;
use super::super::source::{DictionarySource, file_name};
use super::yomitan_import::YomitanImport;

/// Lists the path of every image, audio and font file, with its MIME type.
pub fn media_files(source: &DictionarySource) -> Vec<(String, &'static str)> {
    source
        .names()
        .filter_map(|name| Some((name.to_string(), media_type(name)?)))
        .collect()
}

/// Sends every image, audio and font file to the sink, under its path within the source, counting each file as read once sent.
pub fn import_media(import: &mut YomitanImport) -> Result<(), DictionaryError> {
    for (path, media_type) in media_files(import.source) {
        let bytes = import.source.read(&path)?;
        import.sink.media(DictionaryMedia {
            path: path.clone(),
            media_type: media_type.to_string(),
            bytes,
        })?;
        import.file_read(&path)?;
    }
    Ok(())
}

/// Returns the MIME type of an image, audio or font file, judging by its extension.
/// Other files have none.
fn media_type(name: &str) -> Option<&'static str> {
    let (_, extension) = file_name(name).rsplit_once('.')?;
    let media_type = match extension.to_ascii_lowercase().as_str() {
        "apng" => "image/apng",
        "avif" => "image/avif",
        "bmp" => "image/bmp",
        "gif" => "image/gif",
        "ico" | "cur" => "image/x-icon",
        "jpg" | "jpeg" | "jpe" | "jfif" | "pjpeg" | "pjp" => "image/jpeg",
        "png" => "image/png",
        "svg" => "image/svg+xml",
        "tif" | "tiff" => "image/tiff",
        "webp" => "image/webp",
        "aac" => "audio/aac",
        "flac" => "audio/flac",
        "m4a" => "audio/mp4",
        "mp3" => "audio/mpeg",
        "oga" | "ogg" => "audio/ogg",
        "opus" => "audio/opus",
        "wav" => "audio/wav",
        "weba" => "audio/webm",
        "otf" => "font/otf",
        "ttf" => "font/ttf",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        _ => return None,
    };
    Some(media_type)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dictionary::media_collector::MediaCollector;
    use crate::test_support::read_fixture_bytes;

    #[test]
    fn sends_the_media_of_the_fixture() {
        let mut collector = MediaCollector::default();
        let mut source = DictionarySource::single(
            "sample-yomitan.zip",
            read_fixture_bytes("sample-yomitan.zip"),
        )
        .unwrap();
        let names: Vec<String> = media_files(&source)
            .into_iter()
            .map(|(path, _)| path)
            .collect();
        let mut import = YomitanImport::new(&mut source, &mut collector, &names).unwrap();
        import_media(&mut import).unwrap();
        assert_eq!(
            collector.described(),
            [("images/cat.png".to_string(), "image/png".to_string())]
        );
    }

    #[test]
    fn recognizes_an_image() {
        assert_eq!(media_type("images/cat.png"), Some("image/png"));
    }

    #[test]
    fn ignores_the_case_of_the_extension() {
        assert_eq!(media_type("cat.JPG"), Some("image/jpeg"));
    }

    #[test]
    fn recognizes_audio() {
        assert_eq!(media_type("audio/neko.mp3"), Some("audio/mpeg"));
    }

    #[test]
    fn recognizes_a_font() {
        assert_eq!(media_type("fonts/glyphs.woff2"), Some("font/woff2"));
    }

    #[test]
    fn has_no_type_for_json() {
        assert_eq!(media_type("term_bank_1.json"), None);
    }

    #[test]
    fn has_no_type_without_an_extension() {
        assert_eq!(media_type("images.d/README"), None);
    }
}

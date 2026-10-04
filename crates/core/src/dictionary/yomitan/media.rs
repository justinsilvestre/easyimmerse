//! Files that definitions refer to, such as images.

use super::super::dictionary_media::DictionaryMedia;
use super::super::error::DictionaryError;
use super::super::sink::DictionarySink;
use super::super::source::{DictionarySource, file_name};

/// Sends every image, audio and font file to the sink, under its path within the source.
pub fn import_media(
    source: &mut DictionarySource,
    sink: &mut dyn DictionarySink,
) -> Result<(), DictionaryError> {
    let media: Vec<(String, &str)> = source
        .names()
        .filter_map(|name| Some((name.to_string(), media_type(name)?)))
        .collect();
    for (path, media_type) in media {
        let bytes = source.read(&path)?;
        sink.media(DictionaryMedia {
            path,
            media_type: media_type.to_string(),
            bytes,
        })?;
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
    use crate::dictionary::sink::SinkResult;
    use crate::dictionary::{
        DictionaryMetadata, KanjiEntry, KanjiMeta, TagDefinition, TermEntry, TermMeta,
    };
    use crate::test_support::read_fixture_bytes;

    #[derive(Default)]
    struct MediaCollector {
        media: Vec<DictionaryMedia>,
    }

    impl DictionarySink for MediaCollector {
        fn begin(&mut self, _: DictionaryMetadata) -> SinkResult {
            Ok(())
        }
        fn term_entry(&mut self, _: TermEntry) -> SinkResult {
            Ok(())
        }
        fn term_meta(&mut self, _: TermMeta) -> SinkResult {
            Ok(())
        }
        fn tag(&mut self, _: TagDefinition) -> SinkResult {
            Ok(())
        }
        fn kanji_entry(&mut self, _: KanjiEntry) -> SinkResult {
            Ok(())
        }
        fn kanji_meta(&mut self, _: KanjiMeta) -> SinkResult {
            Ok(())
        }
        fn media(&mut self, media: DictionaryMedia) -> SinkResult {
            self.media.push(media);
            Ok(())
        }
    }

    #[test]
    fn sends_the_media_of_the_fixture() {
        let mut collector = MediaCollector::default();
        let mut source = DictionarySource::single(
            "sample-yomitan.zip",
            read_fixture_bytes("sample-yomitan.zip"),
        )
        .unwrap();
        import_media(&mut source, &mut collector).unwrap();
        let media: Vec<_> = collector
            .media
            .iter()
            .map(|media| (media.path.as_str(), media.media_type.as_str()))
            .collect();
        assert_eq!(media, vec![("images/cat.png", "image/png")]);
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

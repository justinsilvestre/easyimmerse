use std::collections::HashSet;

use crate::dictionary::{
    DictionaryError, DictionaryMedia, DictionarySink, DictionarySource, file_name,
};

use super::mdict_file::{FileKind, MdictFile};

/// Reads every `.mdd` resource file of the source into the sink.
///
/// Volumes are read in order (`name.mdd`, then `name.1.mdd`, `name.2.mdd`, and so on),
/// and when two volumes hold the same path, the first wins.
pub fn import_media(
    source: &mut DictionarySource,
    sink: &mut dyn DictionarySink,
) -> Result<(), DictionaryError> {
    let mut seen_paths = HashSet::new();
    for name in resource_file_names(source) {
        let file = MdictFile::open(source.open(&name)?, FileKind::Resources)?;
        file.for_each_record(|group, bytes| {
            for key in &group.keys {
                let path = media_path(key);
                if seen_paths.insert(path.clone()) {
                    sink.media(DictionaryMedia {
                        media_type: media_type(&path).to_string(),
                        path,
                        bytes: bytes.to_vec(),
                    })?;
                }
            }
            Ok::<(), DictionaryError>(())
        })?;
    }
    Ok(())
}

fn resource_file_names(source: &DictionarySource) -> Vec<String> {
    let mut names: Vec<String> = source
        .names()
        .filter(|name| file_name(name).to_ascii_lowercase().ends_with(".mdd"))
        .map(String::from)
        .collect();
    names.sort_by_key(|name| (volume_number(name), name.clone()));
    names
}

/// Reads the volume number of `name.N.mdd`; the first volume, `name.mdd`, has none.
fn volume_number(name: &str) -> u32 {
    let stem = &name[..name.len() - ".mdd".len()];
    stem.rsplit_once('.')
        .and_then(|(_, number)| number.parse().ok())
        .unwrap_or(0)
}

/// Turns a resource key such as `\images\a.png` into the relative path `images/a.png` that entries use.
pub fn media_path(key: &str) -> String {
    key.replace('\\', "/").trim_start_matches('/').to_string()
}

fn media_type(path: &str) -> &'static str {
    let extension = path.rsplit_once('.').map_or("", |(_, extension)| extension);
    match extension.to_ascii_lowercase().as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        "mp3" => "audio/mpeg",
        "wav" => "audio/wav",
        "ogg" | "oga" => "audio/ogg",
        "spx" => "audio/x-speex",
        "m4a" => "audio/mp4",
        "mp4" => "video/mp4",
        "css" => "text/css",
        "js" => "text/javascript",
        "html" | "htm" => "text/html",
        "txt" => "text/plain",
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
    use crate::dictionary::SourceFile;

    #[test]
    fn turns_a_resource_key_into_a_relative_path() {
        assert_eq!(media_path(r"\images\cat.png"), "images/cat.png");
    }

    #[test]
    fn names_the_type_of_an_image() {
        assert_eq!(media_type("images/cat.PNG"), "image/png");
    }

    #[test]
    fn falls_back_to_a_generic_type() {
        assert_eq!(media_type("data.bin"), "application/octet-stream");
    }

    #[test]
    fn orders_resource_volumes_by_number() {
        let files = ["d.10.mdd", "d.2.mdd", "d.mdd", "d.mdx"].map(|name| SourceFile {
            name: name.into(),
            bytes: Vec::new(),
        });
        let source = DictionarySource::new(files.to_vec()).unwrap();
        assert_eq!(
            resource_file_names(&source),
            ["d.mdd", "d.2.mdd", "d.10.mdd"]
        );
    }
}

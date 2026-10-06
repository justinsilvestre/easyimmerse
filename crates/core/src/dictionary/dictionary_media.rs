use super::metadata::DictionaryFormatKind;

/// A file stored inside a dictionary, such as an image that its definitions show.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DictionaryMedia {
    /// The path by which definitions refer to the file.
    pub path: String,
    /// The MIME type, such as `image/png`.
    pub media_type: String,
    pub bytes: Vec<u8>,
}

/// The scheme by which MDict definitions link to a sound stored with the dictionary, as in `sound://dog.mp3`.
const SOUND_SCHEME: &str = "sound://";

/// Turns a path by which a definition may refer to a stored file into the key that the file is stored under.
///
/// Storage applies this both to the paths of imported files and to the paths that definitions request,
/// so that the spellings `cat.png`, `/cat.png`, `\cat.png` and `sound://cat.png` all find one file.
/// MDict matches resource names without regard to case, so its keys are also lowercased.
pub fn media_key(format: DictionaryFormatKind, path: &str) -> String {
    let path = path.strip_prefix(SOUND_SCHEME).unwrap_or(path);
    let key = path.replace('\\', "/").trim_start_matches('/').to_string();
    match format {
        DictionaryFormatKind::Mdict => key.to_lowercase(),
        _ => key,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn mdict_key(path: &str) -> String {
        media_key(DictionaryFormatKind::Mdict, path)
    }

    #[test]
    fn keeps_a_relative_path() {
        assert_eq!(mdict_key("img/x.png"), "img/x.png");
    }

    #[test]
    fn drops_a_leading_slash() {
        assert_eq!(mdict_key("/cat.png"), "cat.png");
    }

    #[test]
    fn turns_backslashes_into_slashes() {
        assert_eq!(mdict_key(r"\img\x.png"), "img/x.png");
    }

    #[test]
    fn drops_the_sound_scheme() {
        assert_eq!(mdict_key("sound://dog.mp3"), "dog.mp3");
    }

    #[test]
    fn drops_the_sound_scheme_before_a_backslash() {
        assert_eq!(mdict_key(r"sound://\dog.mp3"), "dog.mp3");
    }

    #[test]
    fn lowercases_an_mdict_key() {
        assert_eq!(mdict_key(r"\Img\Cat.PNG"), "img/cat.png");
    }

    #[test]
    fn keeps_the_case_of_a_yomitan_key() {
        assert_eq!(
            media_key(DictionaryFormatKind::Yomitan, "img/Cat.png"),
            "img/Cat.png"
        );
    }

    #[test]
    fn drops_a_leading_slash_from_a_stardict_key() {
        assert_eq!(
            media_key(DictionaryFormatKind::Stardict, "/Cat.png"),
            "Cat.png"
        );
    }
}

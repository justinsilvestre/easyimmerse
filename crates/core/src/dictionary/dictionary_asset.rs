use base64::Engine;
use base64::engine::general_purpose::STANDARD;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use ts_rs::TS;

/// A file from the dictionary archive that structured content can refer to, such as an image.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct DictionaryAsset {
    /// The file's path inside the archive, as glossary items refer to it.
    pub path: String,
    /// The MIME type, guessed from the file extension.
    pub media_type: String,
    /// The file's contents, base64 encoded in JSON.
    #[serde(serialize_with = "to_base64", deserialize_with = "from_base64")]
    #[ts(type = "string")]
    pub bytes: Vec<u8>,
}

/// Guesses a MIME type from the extension of a path inside a dictionary archive.
pub fn media_type_for_path(path: &str) -> &'static str {
    let extension = path.rsplit_once('.').map(|(_, extension)| extension);
    match extension.map(str::to_ascii_lowercase).as_deref() {
        Some("svg") => "image/svg+xml",
        Some("png") => "image/png",
        Some("jpg" | "jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("avif") => "image/avif",
        Some("bmp") => "image/bmp",
        Some("ico") => "image/x-icon",
        Some("tif" | "tiff") => "image/tiff",
        Some("css") => "text/css",
        _ => "application/octet-stream",
    }
}

fn to_base64<S: Serializer>(bytes: &[u8], serializer: S) -> Result<S::Ok, S::Error> {
    serializer.serialize_str(&STANDARD.encode(bytes))
}

fn from_base64<'de, D: Deserializer<'de>>(deserializer: D) -> Result<Vec<u8>, D::Error> {
    let text = String::deserialize(deserializer)?;
    STANDARD.decode(text).map_err(serde::de::Error::custom)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recognizes_an_svg_image() {
        assert_eq!(media_type_for_path("img/cat.svg"), "image/svg+xml");
    }

    #[test]
    fn ignores_the_case_of_the_extension() {
        assert_eq!(media_type_for_path("img/CAT.PNG"), "image/png");
    }

    #[test]
    fn falls_back_to_binary_data_for_an_unknown_extension() {
        assert_eq!(media_type_for_path("notes"), "application/octet-stream");
    }

    #[test]
    fn round_trips_the_bytes_through_json() {
        let asset = DictionaryAsset {
            path: "a.png".into(),
            media_type: "image/png".into(),
            bytes: vec![0, 255, 7],
        };
        let json = serde_json::to_string(&asset).unwrap();
        assert_eq!(
            serde_json::from_str::<DictionaryAsset>(&json).unwrap(),
            asset
        );
    }
}

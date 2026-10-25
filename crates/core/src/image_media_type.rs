//! Telling the type of a picture from its first bytes, for the pictures the server keeps and shows in image elements.

/// The media type of a JPEG, PNG, GIF or WebP picture, told from the signature its bytes begin with.
/// Returns None for any other bytes, including SVG, which can carry scripts.
pub fn image_media_type(bytes: &[u8]) -> Option<&'static str> {
    if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        Some("image/jpeg")
    } else if bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        Some("image/png")
    } else if bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a") {
        Some("image/gif")
    } else if bytes.len() >= 12 && bytes.starts_with(b"RIFF") && &bytes[8..12] == b"WEBP" {
        Some("image/webp")
    } else {
        None
    }
}

/// The file extension for a media type that `image_media_type` returns.
pub fn image_extension(media_type: &str) -> Option<&'static str> {
    match media_type {
        "image/jpeg" => Some("jpg"),
        "image/png" => Some("png"),
        "image/gif" => Some("gif"),
        "image/webp" => Some("webp"),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tells_a_jpeg() {
        assert_eq!(
            image_media_type(&[0xFF, 0xD8, 0xFF, 0xE0]),
            Some("image/jpeg")
        );
    }

    #[test]
    fn tells_a_png() {
        assert_eq!(
            image_media_type(b"\x89PNG\r\n\x1a\n\0\0\0\rIHDR"),
            Some("image/png")
        );
    }

    #[test]
    fn tells_a_webp() {
        assert_eq!(
            image_media_type(b"RIFF\x10\0\0\0WEBPVP8 "),
            Some("image/webp")
        );
    }

    #[test]
    fn refuses_an_svg() {
        assert_eq!(
            image_media_type(b"<svg xmlns=\"http://www.w3.org/2000/svg\"/>"),
            None
        );
    }

    #[test]
    fn names_the_extension_of_a_png() {
        assert_eq!(image_extension("image/png"), Some("png"));
    }
}

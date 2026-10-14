//! The values Anki derives from a note's first field to sort notes and to find duplicates.

use sha1::{Digest, Sha1};

/// Removes HTML tags from a field value and decodes the entities that escaping text produces.
pub(crate) fn strip_html(html: &str) -> String {
    let mut text = String::with_capacity(html.len());
    let mut is_in_tag = false;
    for character in html.chars() {
        match character {
            '<' => is_in_tag = true,
            '>' if is_in_tag => is_in_tag = false,
            _ if !is_in_tag => text.push(character),
            _ => {}
        }
    }
    decode_entities(&text).trim().to_owned()
}

/// The first four bytes of the SHA-1 digest of the stripped field, read as a big-endian number.
pub(crate) fn field_checksum(stripped: &str) -> u32 {
    let digest = Sha1::digest(stripped.as_bytes());
    u32::from_be_bytes([digest[0], digest[1], digest[2], digest[3]])
}

fn decode_entities(text: &str) -> String {
    text.replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_tags_and_decodes_entities() {
        assert_eq!(strip_html("<em>Tom</em> &amp; Jerry"), "Tom & Jerry");
    }

    #[test]
    fn computes_the_checksum_from_the_sha1_digest() {
        assert_eq!(field_checksum("Haus"), 582_454_829);
    }
}

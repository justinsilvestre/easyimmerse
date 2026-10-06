use chardetng::EncodingDetector;
use encoding_rs::Encoding;

/// Decodes a text file, honouring a UTF-8 or UTF-16 byte order mark and otherwise guessing the encoding.
pub fn decode_text(bytes: Vec<u8>) -> String {
    if let Some((encoding, bom_length)) = Encoding::for_bom(&bytes) {
        return decode_with(encoding, &bytes[bom_length..]);
    }
    String::from_utf8(bytes).unwrap_or_else(|error| decode_legacy(error.as_bytes()))
}

fn decode_legacy(bytes: &[u8]) -> String {
    let mut detector = EncodingDetector::new();
    detector.feed(bytes, true);
    decode_with(detector.guess(None, false), bytes)
}

fn decode_with(encoding: &'static Encoding, bytes: &[u8]) -> String {
    encoding.decode_without_bom_handling(bytes).0.into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn utf16(text: &str, to_bytes: fn(u16) -> [u8; 2]) -> Vec<u8> {
        text.encode_utf16().flat_map(to_bytes).collect()
    }

    #[test]
    fn decodes_utf8_without_a_byte_order_mark() {
        assert_eq!(decode_text("猫\tcat".as_bytes().to_vec()), "猫\tcat");
    }

    #[test]
    fn strips_a_utf8_byte_order_mark() {
        assert_eq!(decode_text(b"\xEF\xBB\xBFcat".to_vec()), "cat");
    }

    #[test]
    fn decodes_utf16_little_endian_by_its_byte_order_mark() {
        assert_eq!(
            decode_text(utf16("\u{FEFF}猫\tcat", u16::to_le_bytes)),
            "猫\tcat"
        );
    }

    #[test]
    fn decodes_utf16_big_endian_by_its_byte_order_mark() {
        assert_eq!(
            decode_text(utf16("\u{FEFF}猫\tcat", u16::to_be_bytes)),
            "猫\tcat"
        );
    }

    #[test]
    fn guesses_shift_jis_when_the_bytes_are_not_utf8() {
        let text = "日本語の辞書,にほんごのじしょ,ことばの意味を調べるための本";
        let (bytes, _, _) = encoding_rs::SHIFT_JIS.encode(text);
        assert_eq!(decode_text(bytes.into_owned()), text);
    }

    #[test]
    fn guesses_windows_1252_for_western_european_text() {
        let text = "café,a small restaurant where coffee is served";
        let (bytes, _, _) = encoding_rs::WINDOWS_1252.encode(text);
        assert_eq!(decode_text(bytes.into_owned()), text);
    }
}

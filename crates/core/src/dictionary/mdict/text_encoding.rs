use encoding_rs::{Encoding, GB18030, UTF_8, UTF_16LE};

use super::error::MdictError;

/// The encoding of the keys and records of an MDict file, named by the header's `Encoding` attribute.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct TextEncoding(&'static Encoding);

impl TextEncoding {
    pub const UTF_16LE: Self = Self(UTF_16LE);

    /// Resolves an `Encoding` attribute. An empty value means UTF-8, and `UTF-16` means little-endian UTF-16.
    pub fn from_label(label: &str) -> Result<Self, MdictError> {
        let label = label.trim();
        if label.is_empty() {
            return Ok(Self(UTF_8));
        }
        if is_simplified_chinese(label) {
            return Ok(Self(GB18030));
        }
        Encoding::for_label(label.as_bytes())
            .map(Self)
            .ok_or_else(|| MdictError::UnknownEncoding(label.to_string()))
    }

    /// The width in bytes of one code unit, by which key lengths are counted.
    pub fn unit_width(self) -> usize {
        if self.0 == UTF_16LE { 2 } else { 1 }
    }

    pub fn decode(self, bytes: &[u8]) -> String {
        self.0.decode_without_bom_handling(bytes).0.into_owned()
    }

    /// Finds the byte position of the first NUL code unit.
    pub fn nul_position(self, bytes: &[u8]) -> Option<usize> {
        let width = self.unit_width();
        bytes
            .chunks_exact(width)
            .position(|unit| unit.iter().all(|&byte| byte == 0))
            .map(|index| index * width)
    }

    /// Encodes ASCII text, such as a marker that records start with.
    pub fn encode_ascii(self, text: &str) -> Vec<u8> {
        let padding = vec![0; self.unit_width() - 1];
        text.bytes()
            .flat_map(|byte| std::iter::once(byte).chain(padding.iter().copied()))
            .collect()
    }

    /// Encodes text, for writing test files. `encoding_rs` encodes no UTF-16, so that case is handled here.
    #[cfg(test)]
    pub fn encode(self, text: &str) -> Vec<u8> {
        if self == Self::UTF_16LE {
            text.encode_utf16().flat_map(u16::to_le_bytes).collect()
        } else {
            self.0.encode(text).0.into_owned()
        }
    }
}

/// GBK and GB2312 are subsets of GB18030, which decodes them all.
fn is_simplified_chinese(label: &str) -> bool {
    ["GBK", "GB2312", "GB18030"]
        .iter()
        .any(|name| label.eq_ignore_ascii_case(name))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_an_empty_label_as_utf8() {
        assert_eq!(TextEncoding::from_label("").unwrap(), TextEncoding(UTF_8));
    }

    #[test]
    fn reads_utf16_as_little_endian() {
        assert_eq!(
            TextEncoding::from_label("UTF-16").unwrap(),
            TextEncoding::UTF_16LE
        );
    }

    #[test]
    fn reads_gbk_as_gb18030() {
        assert_eq!(
            TextEncoding::from_label("GBK").unwrap(),
            TextEncoding(GB18030)
        );
    }

    #[test]
    fn rejects_an_unknown_label() {
        assert!(matches!(
            TextEncoding::from_label("KLINGON"),
            Err(MdictError::UnknownEncoding(_))
        ));
    }

    #[test]
    fn decodes_big5() {
        let big5 = TextEncoding::from_label("Big5").unwrap();
        assert_eq!(big5.decode(&[0xA4, 0xA4]), "中");
    }

    #[test]
    fn finds_an_aligned_utf16_nul() {
        let bytes = [0x00, 0x4E, 0x61, 0x00, 0x00, 0x00];
        assert_eq!(TextEncoding::UTF_16LE.nul_position(&bytes), Some(4));
    }

    #[test]
    fn encodes_ascii_as_utf16() {
        assert_eq!(TextEncoding::UTF_16LE.encode_ascii("@"), [b'@', 0]);
    }
}

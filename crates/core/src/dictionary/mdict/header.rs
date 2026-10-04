use std::io::Read;

use super::byte_cursor::{ByteCursor, read_stream_bytes};
use super::error::MdictError;
use super::header_attributes::HeaderAttributes;
use super::text_encoding::TextEncoding;

/// The layouts this reader supports, chosen by the header's `GeneratedByEngineVersion`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FormatVersion {
    /// Version 1.2 and earlier, with 4-byte numbers.
    V1,
    /// Version 2.0, with 8-byte numbers and a checksummed, compressed key block index.
    V2,
}

impl FormatVersion {
    pub fn number_width(self) -> usize {
        match self {
            Self::V1 => 4,
            Self::V2 => 8,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Header {
    pub version: FormatVersion,
    pub attributes: HeaderAttributes,
    /// Whether the key block index is obfuscated (bit 1 of `Encrypted`).
    pub key_info_encrypted: bool,
}

/// Reads the header: a big-endian length, that many bytes of UTF-16LE text holding one element,
/// and a little-endian Adler-32 checksum of the text.
pub fn read_header(reader: &mut impl Read) -> Result<Header, MdictError> {
    let length =
        ByteCursor::new(&read_stream_bytes(reader, 4, "header")?, "header").read_number(4)?;
    let text = read_stream_bytes(reader, length, "header")?;
    let checksum = read_stream_bytes(reader, 4, "header")?;
    if checksum != adler2::adler32_slice(&text).to_le_bytes() {
        return Err(MdictError::Checksum("header"));
    }
    let attributes = HeaderAttributes::parse(&TextEncoding::UTF_16LE.decode(&text));
    interpret(attributes)
}

fn interpret(attributes: HeaderAttributes) -> Result<Header, MdictError> {
    let version = parse_version(&attributes)?;
    let encryption = parse_encryption(attributes.get("Encrypted").unwrap_or(""));
    if encryption & 1 != 0 {
        return Err(MdictError::RegistrationRequired);
    }
    Ok(Header {
        version,
        attributes,
        key_info_encrypted: encryption & 2 != 0,
    })
}

fn parse_version(attributes: &HeaderAttributes) -> Result<FormatVersion, MdictError> {
    let text = attributes
        .non_empty("GeneratedByEngineVersion")
        .ok_or(MdictError::MissingVersion)?;
    let unsupported = || MdictError::UnsupportedVersion(text.to_string());
    match text.parse::<f64>().map_err(|_| unsupported())? {
        number if number < 2.0 => Ok(FormatVersion::V1),
        number if number < 3.0 => Ok(FormatVersion::V2),
        _ => Err(unsupported()),
    }
}

/// Reads the `Encrypted` bit field, which files also write as `Yes` or `No`.
fn parse_encryption(value: &str) -> u8 {
    match value.trim().to_ascii_lowercase().as_str() {
        "yes" => 1,
        number => number.parse().unwrap_or(0),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dictionary::mdict::test_writer::encode_header;

    fn header_with(attributes: &str) -> Result<Header, MdictError> {
        read_header(&mut encode_header(&format!("<Dictionary {attributes}/>")).as_slice())
    }

    #[test]
    fn reads_version_2() {
        let header = header_with(r#"GeneratedByEngineVersion="2.0""#).unwrap();
        assert_eq!(header.version, FormatVersion::V2);
    }

    #[test]
    fn reads_version_1_2() {
        let header = header_with(r#"GeneratedByEngineVersion="1.2""#).unwrap();
        assert_eq!(header.version, FormatVersion::V1);
    }

    #[test]
    fn rejects_version_3() {
        assert!(matches!(
            header_with(r#"GeneratedByEngineVersion="3.0""#),
            Err(MdictError::UnsupportedVersion(version)) if version == "3.0"
        ));
    }

    #[test]
    fn rejects_a_header_without_a_version() {
        assert!(matches!(
            header_with(r#"Title="x""#),
            Err(MdictError::MissingVersion)
        ));
    }

    #[test]
    fn rejects_a_dictionary_that_needs_a_registration_code() {
        assert!(matches!(
            header_with(r#"GeneratedByEngineVersion="2.0" Encrypted="Yes""#),
            Err(MdictError::RegistrationRequired)
        ));
    }

    #[test]
    fn notes_an_encrypted_key_block_index() {
        let header = header_with(r#"GeneratedByEngineVersion="2.0" Encrypted="2""#).unwrap();
        assert!(header.key_info_encrypted);
    }

    #[test]
    fn rejects_a_header_whose_checksum_differs() {
        let mut bytes = encode_header(r#"<Dictionary GeneratedByEngineVersion="2.0"/>"#);
        let last = bytes.len() - 1;
        bytes[last] ^= 0xff;
        assert!(matches!(
            read_header(&mut bytes.as_slice()),
            Err(MdictError::Checksum("header"))
        ));
    }
}

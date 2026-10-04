use std::collections::HashMap;

use super::byte_cursor::decode_text;
use super::error::StardictError;
use super::idx::OffsetBits;

/// The `.ifo` file of a StarDict dictionary: its metadata and the settings needed to read its other files.
#[derive(Debug)]
pub struct Ifo {
    values: HashMap<String, String>,
    pub offset_bits: OffsetBits,
}

const DICT_MAGIC: &str = "StarDict's dict ifo file";
const TREEDICT_MAGIC: &str = "StarDict's treedict ifo file";
const SUPPORTED_MAJOR_VERSIONS: [&str; 2] = ["2.", "3."];

impl Ifo {
    /// Parses an `.ifo` file, rejecting the kinds of dictionary that cannot be imported.
    pub fn parse(bytes: &[u8]) -> Result<Self, StardictError> {
        let text = decode_text(bytes);
        let mut lines = text.trim_start_matches('\u{feff}').lines();
        check_magic(lines.next().unwrap_or_default().trim())?;
        let values: HashMap<_, _> = lines.filter_map(parse_line).collect();
        let offset_bits = parse_offset_bits(values.get("idxoffsetbits"))?;
        let ifo = Self {
            values,
            offset_bits,
        };
        ifo.check_version()?;
        ifo.check_dict_type()?;
        Ok(ifo)
    }

    /// Returns the value of a key, treating an empty value as missing.
    pub fn get(&self, key: &str) -> Option<&str> {
        self.values
            .get(key)
            .map(String::as_str)
            .filter(|value| !value.is_empty())
    }

    /// Returns the type letters that every entry has in order, when the dictionary omits them from its data.
    pub fn same_type_sequence(&self) -> Option<&[u8]> {
        self.get("sametypesequence").map(str::as_bytes)
    }

    fn check_version(&self) -> Result<(), StardictError> {
        let version = self.get("version").unwrap_or_default();
        if SUPPORTED_MAJOR_VERSIONS
            .iter()
            .any(|major| version.starts_with(major))
        {
            Ok(())
        } else {
            Err(StardictError::UnsupportedVersion(version.to_string()))
        }
    }

    fn check_dict_type(&self) -> Result<(), StardictError> {
        match self.get("dicttype") {
            Some(dict_type) => Err(StardictError::UnsupportedDictType(dict_type.to_string())),
            None => Ok(()),
        }
    }
}

fn check_magic(first_line: &str) -> Result<(), StardictError> {
    match first_line {
        DICT_MAGIC => Ok(()),
        TREEDICT_MAGIC => Err(StardictError::TreeDictionary),
        _ => Err(StardictError::NotAnIfo),
    }
}

fn parse_line(line: &str) -> Option<(String, String)> {
    let (key, value) = line.split_once('=')?;
    Some((key.trim().to_string(), value.trim().to_string()))
}

fn parse_offset_bits(value: Option<&String>) -> Result<OffsetBits, StardictError> {
    match value.map(|value| value.as_str()) {
        None | Some("32") => Ok(OffsetBits::ThirtyTwo),
        Some("64") => Ok(OffsetBits::SixtyFour),
        Some(other) => Err(StardictError::InvalidOffsetBits(other.to_string())),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(lines: &str) -> Result<Ifo, StardictError> {
        Ifo::parse(format!("{DICT_MAGIC}\n{lines}").as_bytes())
    }

    #[test]
    fn tolerates_a_byte_order_mark_and_crlf_line_endings() {
        let bytes = format!("\u{feff}{DICT_MAGIC}\r\nversion=3.0.0\r\nbookname=Sample\r\n");
        assert_eq!(
            Ifo::parse(bytes.as_bytes()).unwrap().metadata("").title,
            "Sample"
        );
    }

    #[test]
    fn defaults_to_32_bit_offsets() {
        assert_eq!(
            parse("version=2.4.2").unwrap().offset_bits,
            OffsetBits::ThirtyTwo
        );
    }

    #[test]
    fn reads_64_bit_offsets() {
        assert_eq!(
            parse("version=3.0.0\nidxoffsetbits=64")
                .unwrap()
                .offset_bits,
            OffsetBits::SixtyFour
        );
    }

    #[test]
    fn reads_the_same_type_sequence() {
        assert_eq!(
            parse("version=2.4.2\nsametypesequence=tm")
                .unwrap()
                .same_type_sequence(),
            Some(&b"tm"[..])
        );
    }

    #[test]
    fn rejects_an_invalid_offset_width() {
        assert!(matches!(
            parse("version=3.0.0\nidxoffsetbits=16"),
            Err(StardictError::InvalidOffsetBits(_))
        ));
    }

    #[test]
    fn rejects_an_unknown_version() {
        assert!(matches!(
            parse("version=4.0.0"),
            Err(StardictError::UnsupportedVersion(_))
        ));
    }

    #[test]
    fn rejects_a_wordnet_dictionary() {
        assert!(matches!(
            parse("version=2.4.2\ndicttype=wordnet"),
            Err(StardictError::UnsupportedDictType(_))
        ));
    }

    #[test]
    fn rejects_a_tree_dictionary() {
        let bytes = format!("{TREEDICT_MAGIC}\nversion=2.4.2\n");
        assert!(matches!(
            Ifo::parse(bytes.as_bytes()),
            Err(StardictError::TreeDictionary)
        ));
    }

    #[test]
    fn rejects_a_file_without_the_header() {
        assert!(matches!(
            Ifo::parse(b"version=2.4.2\n"),
            Err(StardictError::NotAnIfo)
        ));
    }
}

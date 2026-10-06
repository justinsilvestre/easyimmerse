//! Conversions between dictionary values and the column types they are stored in.

use std::io::Read;

use flate2::read::DeflateDecoder;
use flate2::{Compress, Compression, FlushCompress, Status};
use rusqlite::Row;
use rusqlite::types::Type;
use serde::Serialize;
use serde::de::DeserializeOwned;

use crate::error::StorageError;

/// Serializes values to JSON and compresses each with raw deflate.
/// One deflater serves a whole import, since setting up compression costs more than compressing a short entry.
pub struct JsonDeflater {
    compress: Compress,
    json: Vec<u8>,
}

impl JsonDeflater {
    pub fn new() -> Self {
        Self {
            compress: Compress::new(Compression::default(), false),
            json: Vec::new(),
        }
    }

    pub fn deflate<T: Serialize>(&mut self, value: &T) -> Result<Vec<u8>, StorageError> {
        self.json.clear();
        serde_json::to_writer(&mut self.json, value)?;
        self.compress.reset();
        let mut output = Vec::with_capacity(self.json.len() / 2 + 64);
        loop {
            let consumed = usize::try_from(self.compress.total_in()).unwrap_or(usize::MAX);
            let input = self.json.get(consumed..).unwrap_or_default();
            let status = self
                .compress
                .compress_vec(input, &mut output, FlushCompress::Finish)
                .map_err(std::io::Error::other)?;
            if status == Status::StreamEnd {
                return Ok(output);
            }
            output.reserve(output.capacity().max(64));
        }
    }
}

/// Decompresses raw deflate and parses the JSON within.
pub fn inflate_json<T: DeserializeOwned>(bytes: &[u8]) -> Result<T, StorageError> {
    let mut json = Vec::new();
    DeflateDecoder::new(bytes).read_to_end(&mut json)?;
    Ok(serde_json::from_slice(&json)?)
}

/// Stores a unit enum as the text it serializes to, such as `yomitan` or `rank-based`.
pub fn enum_text<T: Serialize>(value: &T) -> Result<String, StorageError> {
    match serde_json::to_value(value)? {
        serde_json::Value::String(text) => Ok(text),
        other => Ok(other.to_string()),
    }
}

pub fn join_words(words: &[String]) -> String {
    words.join(" ")
}

pub fn split_words(text: &str) -> Vec<String> {
    text.split_whitespace().map(String::from).collect()
}

/// Reads a column written by `enum_text`.
pub fn get_enum<T: DeserializeOwned>(row: &Row, index: usize) -> rusqlite::Result<T> {
    let text: String = row.get(index)?;
    from_json_value(serde_json::Value::String(text), index)
}

pub fn get_optional_enum<T: DeserializeOwned>(
    row: &Row,
    index: usize,
) -> rusqlite::Result<Option<T>> {
    let text: Option<String> = row.get(index)?;
    text.map(|text| from_json_value(serde_json::Value::String(text), index))
        .transpose()
}

pub fn get_json<T: DeserializeOwned>(row: &Row, index: usize) -> rusqlite::Result<T> {
    let text: String = row.get(index)?;
    serde_json::from_str(&text).map_err(|error| conversion_error(index, Type::Text, error))
}

pub fn get_deflated_json<T: DeserializeOwned>(row: &Row, index: usize) -> rusqlite::Result<T> {
    let bytes: Vec<u8> = row.get(index)?;
    inflate_json(&bytes).map_err(|error| conversion_error(index, Type::Blob, error))
}

/// SQLite stores integers signed; counts and timestamps are never negative.
pub fn get_unsigned(row: &Row, index: usize) -> rusqlite::Result<u64> {
    let value: i64 = row.get(index)?;
    u64::try_from(value).map_err(|error| conversion_error(index, Type::Integer, error))
}

fn from_json_value<T: DeserializeOwned>(
    value: serde_json::Value,
    index: usize,
) -> rusqlite::Result<T> {
    serde_json::from_value(value).map_err(|error| conversion_error(index, Type::Text, error))
}

fn conversion_error(
    index: usize,
    column_type: Type,
    error: impl std::error::Error + Send + Sync + 'static,
) -> rusqlite::Error {
    rusqlite::Error::FromSqlConversionFailure(index, column_type, Box::new(error))
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::dictionary::{Definition, DictionaryFormatKind, FrequencyMode};

    use super::*;

    #[test]
    fn round_trips_definitions_through_deflate() {
        let definitions = vec![Definition::text("cat"), Definition::text("a small feline")];
        let bytes = JsonDeflater::new().deflate(&definitions).unwrap();
        assert_eq!(
            inflate_json::<Vec<Definition>>(&bytes).unwrap(),
            definitions
        );
    }

    #[test]
    fn round_trips_a_value_deflated_after_a_longer_one() {
        let mut deflater = JsonDeflater::new();
        deflater
            .deflate(&vec![Definition::text("x".repeat(5_000))])
            .unwrap();
        let definitions = vec![Definition::text("cat")];
        let bytes = deflater.deflate(&definitions).unwrap();
        assert_eq!(
            inflate_json::<Vec<Definition>>(&bytes).unwrap(),
            definitions
        );
    }

    #[test]
    fn compresses_repetitive_json() {
        let definitions = vec![Definition::text("cat ".repeat(100))];
        let json_length = serde_json::to_vec(&definitions).unwrap().len();
        let bytes = JsonDeflater::new().deflate(&definitions).unwrap();
        assert!(bytes.len() < json_length / 4);
    }

    #[test]
    fn writes_a_format_as_its_serialized_name() {
        assert_eq!(
            enum_text(&DictionaryFormatKind::Stardict).unwrap(),
            "stardict"
        );
    }

    #[test]
    fn writes_a_frequency_mode_in_kebab_case() {
        assert_eq!(enum_text(&FrequencyMode::RankBased).unwrap(), "rank-based");
    }

    #[test]
    fn splits_words_on_spaces() {
        assert_eq!(split_words("v1 vt"), vec!["v1", "vt"]);
    }

    #[test]
    fn splits_an_empty_column_into_no_words() {
        assert!(split_words("").is_empty());
    }
}

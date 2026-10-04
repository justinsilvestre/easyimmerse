//! Conversions between Rust values and the column types SQLite stores.

use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::Row;
use serde::Serialize;
use serde::de::DeserializeOwned;
use serde_json::Value;

use crate::error::StorageError;

/// SQLite stores only signed integers, so unsigned values are stored as `i64`.
pub fn to_stored_integer(value: u64) -> i64 {
    i64::try_from(value).unwrap_or(i64::MAX)
}

/// Reads an unsigned value stored by `to_stored_integer`, or a count, which is never negative.
pub fn read_unsigned(row: &Row, index: usize) -> rusqlite::Result<u64> {
    let value: i64 = row.get(index)?;
    Ok(u64::try_from(value).unwrap_or(0))
}

/// Stores a unit enum as the string serde names it, such as `yomitan` or `srt`.
pub fn enum_to_text<T: Serialize>(value: &T) -> Result<String, StorageError> {
    match serde_json::to_value(value)? {
        Value::String(text) => Ok(text),
        other => Ok(other.to_string()),
    }
}

pub fn enum_from_text<T: DeserializeOwned>(text: String) -> Result<T, StorageError> {
    Ok(serde_json::from_value(Value::String(text))?)
}

/// Sixteen random bytes, hex encoded.
pub fn random_id() -> String {
    hex::encode(rand::random::<[u8; 16]>())
}

/// The clock is only ever behind the epoch on a misconfigured machine; such a time is stored as zero.
pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| u64::try_from(elapsed.as_millis()).unwrap_or(u64::MAX))
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::timed_text::TimedTextFormat;

    use super::*;

    #[test]
    fn stores_an_enum_as_its_serde_name() {
        assert_eq!(enum_to_text(&TimedTextFormat::Srt).unwrap(), "srt");
    }

    #[test]
    fn reads_an_enum_from_its_serde_name() {
        let format: TimedTextFormat = enum_from_text("vtt".to_string()).unwrap();
        assert_eq!(format, TimedTextFormat::Vtt);
    }

    #[test]
    fn generates_a_32_character_hex_id() {
        assert_eq!(random_id().len(), 32);
    }

    #[test]
    fn generates_distinct_ids() {
        assert_ne!(random_id(), random_id());
    }
}

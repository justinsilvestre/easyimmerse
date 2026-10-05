//! SQLite stores only signed integers, so unsigned values cross the boundary as `i64`.

use rusqlite::Row;

pub fn to_stored_integer(value: u64) -> i64 {
    i64::try_from(value).unwrap_or(i64::MAX)
}

pub fn read_unsigned(row: &Row, index: usize) -> rusqlite::Result<u64> {
    let value: i64 = row.get(index)?;
    Ok(u64::try_from(value).unwrap_or(0))
}

/// Reads a JSON column in a row callback, reporting a malformed value as a column type error
/// so that the callback stays within rusqlite's error type.
pub fn read_json<T: serde::de::DeserializeOwned>(row: &Row, index: usize) -> rusqlite::Result<T> {
    let text: String = row.get(index)?;
    serde_json::from_str(&text).map_err(|error| {
        rusqlite::Error::FromSqlConversionFailure(
            index,
            rusqlite::types::Type::Text,
            Box::new(error),
        )
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clamps_a_value_beyond_the_signed_range() {
        assert_eq!(to_stored_integer(u64::MAX), i64::MAX);
    }
}

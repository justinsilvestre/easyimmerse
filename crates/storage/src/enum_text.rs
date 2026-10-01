//! Stores unit enum variants as their serde names, such as `video`, rather than as JSON.

use serde::Serialize;
use serde::de::DeserializeOwned;
use serde_json::Value;

use crate::error::StorageError;

pub fn to_enum_text<T: Serialize>(value: &T) -> Result<String, StorageError> {
    match serde_json::to_value(value)? {
        Value::String(text) => Ok(text),
        other => Ok(other.to_string()),
    }
}

pub fn from_enum_text<T: DeserializeOwned>(text: &str) -> Result<T, StorageError> {
    Ok(serde_json::from_value(Value::String(text.to_string()))?)
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::media_file::MediaKind;

    use super::*;

    #[test]
    fn writes_a_variant_as_its_serde_name() {
        assert_eq!(to_enum_text(&MediaKind::Document).unwrap(), "document");
    }

    #[test]
    fn reads_a_variant_from_its_serde_name() {
        assert_eq!(
            from_enum_text::<MediaKind>("audio").unwrap(),
            MediaKind::Audio
        );
    }
}

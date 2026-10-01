use std::fmt::Display;

use serde::Serialize;
use serde::de::DeserializeOwned;

/// Why a call through the JSON facade failed.
#[derive(Debug, thiserror::Error)]
pub enum JsonCallError {
    #[error("invalid input JSON: {0}")]
    InvalidInput(#[source] serde_json::Error),
    #[error("could not serialize the result: {0}")]
    InvalidOutput(#[source] serde_json::Error),
    #[error("local paths are not available offline")]
    LocalPathsUnavailable,
    #[error("{0}")]
    Failed(String),
}

/// Deserializes a JSON input string into the requested type.
pub fn parse_input<T: DeserializeOwned>(json: &str) -> Result<T, JsonCallError> {
    serde_json::from_str(json).map_err(JsonCallError::InvalidInput)
}

/// Serializes a successful result to JSON and turns a failure into its message.
pub fn to_json_result<T: Serialize, E: Display>(
    result: Result<T, E>,
) -> Result<String, JsonCallError> {
    let value = result.map_err(|error| JsonCallError::Failed(error.to_string()))?;
    serde_json::to_string(&value).map_err(JsonCallError::InvalidOutput)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_malformed_input() {
        assert!(matches!(
            parse_input::<u32>("not json"),
            Err(JsonCallError::InvalidInput(_))
        ));
    }

    #[test]
    fn serializes_a_successful_result() {
        let json = to_json_result(Ok::<_, String>(vec![1, 2])).unwrap();
        assert_eq!(json, "[1,2]");
    }

    #[test]
    fn carries_the_message_of_a_failed_result() {
        let error = to_json_result(Err::<u32, _>("boom")).unwrap_err();
        assert_eq!(error.to_string(), "boom");
    }
}

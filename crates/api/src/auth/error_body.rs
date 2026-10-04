use axum::Json;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use easyimmerse_core::dictionary::DictionaryError;
use easyimmerse_core::document::DocumentError;
use easyimmerse_core::timed_text::TimedTextError;
use easyimmerse_storage::StorageError;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

/// The body of every error response.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ApiError {
    /// A stable, machine-readable identifier such as `unauthorized`.
    pub code: String,
    pub message: String,
}

/// An error response: a status code and the body to send with it.
#[derive(Debug, Clone, PartialEq)]
pub struct ApiFailure {
    pub status: StatusCode,
    pub error: ApiError,
}

impl ApiFailure {
    pub fn new(status: StatusCode, code: &str, message: impl Into<String>) -> Self {
        Self {
            status,
            error: ApiError {
                code: code.to_string(),
                message: message.into(),
            },
        }
    }
}

impl IntoResponse for ApiFailure {
    fn into_response(self) -> Response {
        (self.status, Json(self.error)).into_response()
    }
}

pub fn unauthorized() -> ApiFailure {
    ApiFailure::new(
        StatusCode::UNAUTHORIZED,
        "unauthorized",
        "a valid bearer token is required",
    )
}

pub fn misdirected() -> ApiFailure {
    ApiFailure::new(
        StatusCode::MISDIRECTED_REQUEST,
        "misdirected",
        "the Host header does not name this server",
    )
}

pub fn forbidden(message: impl Into<String>) -> ApiFailure {
    ApiFailure::new(StatusCode::FORBIDDEN, "forbidden", message)
}

pub fn bad_request(message: impl Into<String>) -> ApiFailure {
    ApiFailure::new(StatusCode::BAD_REQUEST, "bad_request", message)
}

pub fn not_found(message: impl Into<String>) -> ApiFailure {
    ApiFailure::new(StatusCode::NOT_FOUND, "not_found", message)
}

pub fn internal(message: impl Into<String>) -> ApiFailure {
    ApiFailure::new(StatusCode::INTERNAL_SERVER_ERROR, "internal", message)
}

impl From<StorageError> for ApiFailure {
    fn from(error: StorageError) -> Self {
        match error {
            StorageError::DictionaryNotFound(_)
            | StorageError::DictionaryMediaNotFound { .. }
            | StorageError::ProjectNotFound(_)
            | StorageError::MediaFileNotFound(_) => not_found(error.to_string()),
            StorageError::Dictionary(_) => bad_request(error.to_string()),
            _ => internal(error.to_string()),
        }
    }
}

impl From<TimedTextError> for ApiFailure {
    fn from(error: TimedTextError) -> Self {
        bad_request(error.to_string())
    }
}

impl From<DocumentError> for ApiFailure {
    fn from(error: DocumentError) -> Self {
        bad_request(error.to_string())
    }
}

impl From<DictionaryError> for ApiFailure {
    fn from(error: DictionaryError) -> Self {
        bad_request(error.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_missing_dictionary_maps_to_not_found() {
        let failure = ApiFailure::from(StorageError::DictionaryNotFound("x".to_string()));
        assert_eq!(failure.status, StatusCode::NOT_FOUND);
    }

    #[test]
    fn a_parser_error_maps_to_bad_request() {
        let failure = ApiFailure::from(TimedTextError::MissingWebVttHeader);
        assert_eq!(failure.status, StatusCode::BAD_REQUEST);
    }

    #[test]
    fn a_parser_error_keeps_its_display_text() {
        let failure = ApiFailure::from(TimedTextError::MissingWebVttHeader);
        assert_eq!(
            failure.error.message,
            "the text does not start with a WEBVTT header"
        );
    }
}

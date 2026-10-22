use axum::Json;
use axum::http::StatusCode;
use axum::http::header::RETRY_AFTER;
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
    /// Sent as the `Retry-After` header, in seconds, when the client must wait before trying again.
    pub retry_after_secs: Option<u64>,
}

impl ApiFailure {
    pub fn new(status: StatusCode, code: &str, message: impl Into<String>) -> Self {
        Self {
            status,
            error: ApiError {
                code: code.to_string(),
                message: message.into(),
            },
            retry_after_secs: None,
        }
    }

    pub fn with_retry_after(self, retry_after_secs: u64) -> Self {
        Self {
            retry_after_secs: Some(retry_after_secs),
            ..self
        }
    }
}

impl IntoResponse for ApiFailure {
    fn into_response(self) -> Response {
        if self.status == StatusCode::INTERNAL_SERVER_ERROR {
            tracing::error!(code = %self.error.code, "{}", self.error.message);
        }
        let retry_after = self
            .retry_after_secs
            .map(|seconds| [(RETRY_AFTER, seconds.to_string())]);
        (self.status, retry_after, Json(self.error)).into_response()
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

pub fn conflict(message: impl Into<String>) -> ApiFailure {
    ApiFailure::new(StatusCode::CONFLICT, "conflict", message)
}

/// The answer to the launch principal on a route that only an account may use.
pub fn not_an_account() -> ApiFailure {
    ApiFailure::new(
        StatusCode::FORBIDDEN,
        "not_an_account",
        "only an account may do this, and the launch token belongs to none",
    )
}

/// The answer on a route that needs email when the server sends none.
pub fn mail_unavailable() -> ApiFailure {
    ApiFailure::new(
        StatusCode::SERVICE_UNAVAILABLE,
        "mail_unavailable",
        "this server does not send email",
    )
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
            | StorageError::MediaFileNotFound(_)
            | StorageError::FlashcardNotFound(_)
            | StorageError::SubtitleTrackNotFound(_)
            | StorageError::AlignmentNotFound(_)
            | StorageError::UserNotFound(_)
            | StorageError::SessionNotFound(_)
            | StorageError::ReviewAnswerNotFound(_) => not_found(error.to_string()),
            StorageError::PairedWithItself(_) => bad_request(error.to_string()),
            StorageError::FlashcardIdTaken(_) | StorageError::ReviewAnswerNotLatest(_) => {
                conflict(error.to_string())
            }
            StorageError::EmailTaken(_) => {
                ApiFailure::new(StatusCode::CONFLICT, "email_taken", error.to_string())
            }
            StorageError::LastAdministrator(_) => ApiFailure::new(
                StatusCode::CONFLICT,
                "last_administrator",
                error.to_string(),
            ),
            StorageError::DictionaryAlreadyImported(_) => ApiFailure::new(
                StatusCode::CONFLICT,
                "dictionary_already_imported",
                error.to_string(),
            ),
            StorageError::Dictionary(error) => error.into(),
            StorageError::UnknownSyncTable(_) => ApiFailure::new(
                StatusCode::BAD_REQUEST,
                "unknown_sync_table",
                error.to_string(),
            ),
            StorageError::SyncColumnMissing { .. } => ApiFailure::new(
                StatusCode::BAD_REQUEST,
                "sync_column_missing",
                error.to_string(),
            ),
            StorageError::SyncValueUnsupported { .. } => ApiFailure::new(
                StatusCode::BAD_REQUEST,
                "sync_value_unsupported",
                error.to_string(),
            ),
            StorageError::RemoteNotLinked => {
                ApiFailure::new(StatusCode::NOT_FOUND, "not_linked", error.to_string())
            }
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
        match error {
            DictionaryError::UnrecognizedFormat => ApiFailure::new(
                StatusCode::BAD_REQUEST,
                "unsupported_dictionary_format",
                error.to_string(),
            ),
            _ => bad_request(error.to_string()),
        }
    }
}

#[cfg(test)]
mod tests {
    use std::io;
    use std::sync::{Arc, Mutex};

    use super::*;

    struct CapturedLog(Arc<Mutex<Vec<u8>>>);

    impl io::Write for CapturedLog {
        fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
            self.0.lock().unwrap().extend_from_slice(bytes);
            Ok(bytes.len())
        }

        fn flush(&mut self) -> io::Result<()> {
            Ok(())
        }
    }

    fn log_of_response(failure: ApiFailure) -> String {
        let buffer = Arc::new(Mutex::new(Vec::new()));
        let writer = buffer.clone();
        let subscriber = tracing_subscriber::fmt()
            .with_ansi(false)
            .with_writer(move || CapturedLog(writer.clone()))
            .finish();
        tracing::subscriber::with_default(subscriber, || failure.into_response());
        String::from_utf8(buffer.lock().unwrap().clone()).unwrap()
    }

    #[test]
    fn an_internal_failure_logs_its_message_when_sent() {
        let log = log_of_response(internal("no such column: target_language"));
        assert!(log.contains("no such column: target_language"));
    }

    #[test]
    fn a_client_failure_logs_nothing_when_sent() {
        let log = log_of_response(not_found("no such project"));
        assert_eq!(log, "");
    }

    #[test]
    fn a_missing_dictionary_maps_to_not_found() {
        let failure = ApiFailure::from(StorageError::DictionaryNotFound("x".to_string()));
        assert_eq!(failure.status, StatusCode::NOT_FOUND);
    }

    #[test]
    fn a_missing_session_maps_to_not_found() {
        let failure = ApiFailure::from(StorageError::SessionNotFound("x".to_string()));
        assert_eq!(failure.status, StatusCode::NOT_FOUND);
    }

    #[test]
    fn a_table_that_does_not_sync_has_its_own_code() {
        let failure = ApiFailure::from(StorageError::UnknownSyncTable("users".to_string()));
        assert_eq!(failure.error.code, "unknown_sync_table");
    }

    #[test]
    fn a_missing_link_maps_to_not_found() {
        let failure = ApiFailure::from(StorageError::RemoteNotLinked);
        assert_eq!(failure.status, StatusCode::NOT_FOUND);
    }

    #[test]
    fn an_unrecognized_dictionary_format_has_its_own_code() {
        let failure = ApiFailure::from(StorageError::Dictionary(
            DictionaryError::UnrecognizedFormat,
        ));
        assert_eq!(failure.error.code, "unsupported_dictionary_format");
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

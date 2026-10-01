//! The error responses for failed conversions.

use axum::http::StatusCode;
use easyimmerse_conversion::ConversionError;

use crate::auth::error_body::{ApiFailure, not_found};

impl From<ConversionError> for ApiFailure {
    fn from(error: ConversionError) -> Self {
        match error {
            ConversionError::UnknownConversion | ConversionError::SegmentOutOfRange(_) => {
                not_found(error.to_string())
            }
            ConversionError::Timeout | ConversionError::ShutDown => ApiFailure::new(
                StatusCode::SERVICE_UNAVAILABLE,
                "conversion_not_ready",
                error.to_string(),
            ),
            _ => ApiFailure::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                "conversion_failed",
                error.to_string(),
            ),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn an_unknown_key_maps_to_not_found() {
        let failure = ApiFailure::from(ConversionError::UnknownConversion);
        assert_eq!(failure.status, StatusCode::NOT_FOUND);
    }

    #[test]
    fn a_segment_past_the_end_maps_to_not_found() {
        let failure = ApiFailure::from(ConversionError::SegmentOutOfRange(9));
        assert_eq!(failure.status, StatusCode::NOT_FOUND);
    }

    #[test]
    fn a_timeout_maps_to_service_unavailable() {
        let failure = ApiFailure::from(ConversionError::Timeout);
        assert_eq!(failure.status, StatusCode::SERVICE_UNAVAILABLE);
    }

    #[test]
    fn a_failed_ffmpeg_run_maps_to_an_internal_error() {
        let failure = ApiFailure::from(ConversionError::RunFailed("exit 1".to_string()));
        assert_eq!(failure.status, StatusCode::INTERNAL_SERVER_ERROR);
    }
}

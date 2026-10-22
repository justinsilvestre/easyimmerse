//! The error answers of the device-side sync routes.

use axum::http::StatusCode;

use super::remote_client::RemoteError;
use crate::auth::error_body::ApiFailure;
use crate::auth::principal::Principal;

/// The remote's errors that a link passes on as they came, so that the person reads the remote's own reason.
const PASSED_THROUGH_STATUSES: [u16; 5] = [400, 401, 403, 409, 429];

pub fn not_linked() -> ApiFailure {
    ApiFailure::new(
        StatusCode::NOT_FOUND,
        "not_linked",
        "this device is not linked to a server",
    )
}

pub fn remote_logged_out() -> ApiFailure {
    ApiFailure::new(
        StatusCode::UNAUTHORIZED,
        "remote_logged_out",
        "the linked server logged this device out; log in to it again",
    )
}

pub fn invalid_server_url(message: impl Into<String>) -> ApiFailure {
    ApiFailure::new(StatusCode::BAD_REQUEST, "invalid_server_url", message)
}

/// Refuses an account principal: only the holder of the launch token links the device's own data.
pub fn require_launch(principal: &Principal) -> Result<(), ApiFailure> {
    match principal {
        Principal::Launch => Ok(()),
        Principal::Account { .. } => Err(ApiFailure::new(
            StatusCode::FORBIDDEN,
            "forbidden",
            "only the device's own app may link this server to another",
        )),
    }
}

/// Answers for an error of the remote: its refusals of a link pass through, the rest is a bad gateway.
pub fn remote_failure(error: RemoteError) -> ApiFailure {
    match error {
        RemoteError::Unreachable(reason) => ApiFailure::new(
            StatusCode::BAD_GATEWAY,
            "remote_unreachable",
            format!("the server could not be reached: {reason}"),
        ),
        RemoteError::LoggedOut => remote_logged_out(),
        RemoteError::Refused {
            status,
            code,
            message,
            retry_after_secs,
        } if PASSED_THROUGH_STATUSES.contains(&status) => {
            let status = StatusCode::from_u16(status).unwrap_or(StatusCode::BAD_GATEWAY);
            let failure = ApiFailure::new(status, &code, message);
            match retry_after_secs {
                Some(seconds) => failure.with_retry_after(seconds),
                None => failure,
            }
        }
        RemoteError::Refused { message, .. } | RemoteError::Protocol(message) => {
            ApiFailure::new(StatusCode::BAD_GATEWAY, "remote_failed", message)
        }
    }
}

/// Checks a server address and returns it without a trailing slash.
pub fn checked_server_url(text: &str) -> Result<String, ApiFailure> {
    let url = text.trim().trim_end_matches('/');
    let uri: ureq::http::Uri = url
        .parse()
        .map_err(|_| invalid_server_url("the server address is not a URL"))?;
    let is_http = matches!(uri.scheme_str(), Some("http" | "https"));
    if !is_http || uri.host().is_none_or(str::is_empty) {
        return Err(invalid_server_url(
            "the server address must start with http:// or https:// and name a host",
        ));
    }
    if uri.query().is_some() {
        return Err(invalid_server_url("the server address must have no query"));
    }
    Ok(url.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_server_url_loses_its_trailing_slash() {
        assert_eq!(
            checked_server_url("https://cloud.example.com/").unwrap(),
            "https://cloud.example.com"
        );
    }

    #[test]
    fn a_server_url_without_a_scheme_is_refused() {
        assert!(checked_server_url("cloud.example.com").is_err());
    }

    #[test]
    fn a_server_url_of_another_scheme_is_refused() {
        assert!(checked_server_url("ftp://cloud.example.com").is_err());
    }

    #[test]
    fn a_refused_login_keeps_the_remotes_code() {
        let failure = remote_failure(RemoteError::Refused {
            status: 401,
            code: "invalid_credentials".to_string(),
            message: "wrong".to_string(),
            retry_after_secs: None,
        });
        assert_eq!(failure.error.code, "invalid_credentials");
    }

    #[test]
    fn a_throttled_login_keeps_its_retry_after() {
        let failure = remote_failure(RemoteError::Refused {
            status: 429,
            code: "too_many_attempts".to_string(),
            message: "wait".to_string(),
            retry_after_secs: Some(60),
        });
        assert_eq!(failure.retry_after_secs, Some(60));
    }

    #[test]
    fn a_server_error_of_the_remote_is_a_bad_gateway() {
        let failure = remote_failure(RemoteError::Refused {
            status: 500,
            code: "internal".to_string(),
            message: "broken".to_string(),
            retry_after_secs: None,
        });
        assert_eq!(failure.status, StatusCode::BAD_GATEWAY);
    }
}

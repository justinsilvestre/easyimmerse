//! A blocking HTTP client for the remote that a built-in server syncs with.

use std::time::Duration;

use axum::http::Method;
use easyimmerse_core::sync::{SyncChangesPage, SyncPushBatch, SyncPushOutcomes};
use serde::Serialize;
use serde::de::DeserializeOwned;
use ureq::Agent;
use ureq::http::Request;
use ureq::http::header::{AUTHORIZATION, CONTENT_TYPE, RETRY_AFTER};

use crate::auth::error_body::ApiError;
use crate::routes::auth_server::ServerAuthInfo;
use crate::routes::current_principal::CurrentPrincipal;
use crate::routes::sessions::{LoginRequest, SessionCreated, SignupRequest};

const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const JSON_CALL_TIMEOUT: Duration = Duration::from_secs(60);
/// The longest response body read into memory, enough for a page of 2,000 rows.
const MAX_RESPONSE_BYTES: u64 = 64 * 1024 * 1024;

/// Why a request to the remote did not succeed.
#[derive(Debug, Clone, PartialEq)]
pub enum RemoteError {
    /// The remote could not be reached, or did not answer in time.
    Unreachable(String),
    /// The remote no longer accepts this server's session.
    LoggedOut,
    /// The remote answered with an error.
    Refused {
        status: u16,
        code: String,
        message: String,
        retry_after_secs: Option<u64>,
    },
    /// The remote answered in a way this server does not understand.
    Protocol(String),
}

/// A response of the remote, passed on as it came.
pub struct RemoteResponse {
    pub status: u16,
    pub content_type: Option<String>,
    pub retry_after: Option<String>,
    pub body: Vec<u8>,
}

/// Sends requests to one remote, with this server's session there when it has one.
pub struct RemoteClient {
    agent: Agent,
    server_url: String,
    token: Option<String>,
}

impl RemoteClient {
    /// A client whose calls each take at most a minute.
    pub fn new(server_url: &str, token: Option<String>) -> Self {
        Self::with_timeout(server_url, token, JSON_CALL_TIMEOUT)
    }

    pub fn with_timeout(server_url: &str, token: Option<String>, timeout: Duration) -> Self {
        let agent = Agent::config_builder()
            .http_status_as_error(false)
            .max_redirects(0)
            .timeout_connect(Some(CONNECT_TIMEOUT.min(timeout)))
            .timeout_global(Some(timeout))
            .user_agent(user_agent())
            .build()
            .into();
        Self {
            agent,
            server_url: server_url.trim_end_matches('/').to_string(),
            token,
        }
    }

    pub fn auth_info(&self) -> Result<ServerAuthInfo, RemoteError> {
        self.call_json(Method::GET, "/auth/server", None::<&()>)
    }

    pub fn log_in(&self, email: &str, password: &str) -> Result<SessionCreated, RemoteError> {
        let request = LoginRequest {
            email: email.to_string(),
            password: password.to_string(),
        };
        self.call_json(Method::POST, "/auth/login", Some(&request))
    }

    pub fn sign_up(&self, email: &str, password: &str) -> Result<SessionCreated, RemoteError> {
        let request = SignupRequest {
            email: email.to_string(),
            password: password.to_string(),
        };
        self.call_json(Method::POST, "/auth/signup", Some(&request))
    }

    pub fn me(&self) -> Result<CurrentPrincipal, RemoteError> {
        self.call_json(Method::GET, "/auth/me", None::<&()>)
    }

    pub fn log_out(&self) -> Result<(), RemoteError> {
        let response = self.send(Method::POST, "/auth/logout", None, Vec::new())?;
        checked(response).map(|_| ())
    }

    pub fn changes_since(&self, since: u64, limit: u32) -> Result<SyncChangesPage, RemoteError> {
        let path = format!("/sync/changes?since={since}&limit={limit}");
        self.call_json(Method::GET, &path, None::<&()>)
    }

    pub fn push(&self, batch: &SyncPushBatch) -> Result<SyncPushOutcomes, RemoteError> {
        self.call_json(Method::POST, "/sync/changes", Some(batch))
    }

    /// Sends a request as it came, and returns whatever the remote answered, except that a 401 means logged out.
    pub fn forward(
        &self,
        method: Method,
        path_and_query: &str,
        content_type: Option<&str>,
        body: Vec<u8>,
    ) -> Result<RemoteResponse, RemoteError> {
        self.send(method, path_and_query, content_type, body)
    }

    fn call_json<T: DeserializeOwned>(
        &self,
        method: Method,
        path: &str,
        body: Option<&impl Serialize>,
    ) -> Result<T, RemoteError> {
        let body = body
            .map(serde_json::to_vec)
            .transpose()
            .map_err(|error| RemoteError::Protocol(error.to_string()))?;
        let content_type = body.as_ref().map(|_| "application/json");
        let response = self.send(method, path, content_type, body.unwrap_or_default())?;
        let response = checked(response)?;
        serde_json::from_slice(&response.body).map_err(|error| {
            RemoteError::Protocol(format!("the remote answered {path} with {error}"))
        })
    }

    fn send(
        &self,
        method: Method,
        path: &str,
        content_type: Option<&str>,
        body: Vec<u8>,
    ) -> Result<RemoteResponse, RemoteError> {
        let mut builder = Request::builder()
            .method(method)
            .uri(format!("{}{path}", self.server_url));
        if let Some(token) = &self.token {
            builder = builder.header(AUTHORIZATION, format!("Bearer {token}"));
        }
        if let Some(content_type) = content_type {
            builder = builder.header(CONTENT_TYPE, content_type);
        }
        let request = builder
            .body(body)
            .map_err(|error| RemoteError::Protocol(error.to_string()))?;
        let mut response = self.agent.run(request).map_err(transport_error)?;
        let status = response.status().as_u16();
        if status == 401 && self.token.is_some() {
            return Err(RemoteError::LoggedOut);
        }
        let header = |name| {
            response
                .headers()
                .get(name)
                .and_then(|value: &ureq::http::HeaderValue| value.to_str().ok())
                .map(str::to_string)
        };
        let content_type = header(CONTENT_TYPE);
        let retry_after = header(RETRY_AFTER);
        let body = response
            .body_mut()
            .with_config()
            .limit(MAX_RESPONSE_BYTES)
            .read_to_vec()
            .map_err(transport_error)?;
        Ok(RemoteResponse {
            status,
            content_type,
            retry_after,
            body,
        })
    }
}

/// `easyImmerse/<version> (<operating system>)`, which the remote's list of sessions shows to name this device.
fn user_agent() -> String {
    format!(
        "easyImmerse/{} ({})",
        env!("CARGO_PKG_VERSION"),
        std::env::consts::OS
    )
}

/// Passes a successful response on, and turns an error status into `Refused` with the remote's code and message.
fn checked(response: RemoteResponse) -> Result<RemoteResponse, RemoteError> {
    if (200..300).contains(&response.status) {
        return Ok(response);
    }
    let error: Option<ApiError> = serde_json::from_slice(&response.body).ok();
    let (code, message) = match error {
        Some(error) => (error.code, error.message),
        None => (
            "remote_failed".to_string(),
            format!("the remote answered {}", response.status),
        ),
    };
    Err(RemoteError::Refused {
        status: response.status,
        code,
        message,
        retry_after_secs: response
            .retry_after
            .and_then(|seconds| seconds.trim().parse().ok()),
    })
}

fn transport_error(error: ureq::Error) -> RemoteError {
    match error {
        ureq::Error::Timeout(_)
        | ureq::Error::Io(_)
        | ureq::Error::HostNotFound
        | ureq::Error::ConnectionFailed => RemoteError::Unreachable(error.to_string()),
        other => RemoteError::Protocol(other.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_the_app_and_its_version_in_the_user_agent() {
        assert!(user_agent().starts_with(&format!("easyImmerse/{} (", env!("CARGO_PKG_VERSION"))));
    }

    #[test]
    fn an_error_status_carries_the_remotes_code() {
        let response = RemoteResponse {
            status: 409,
            content_type: None,
            retry_after: None,
            body: br#"{"code":"email_taken","message":"taken"}"#.to_vec(),
        };
        let Err(RemoteError::Refused { code, .. }) = checked(response) else {
            panic!("expected a refusal");
        };
        assert_eq!(code, "email_taken");
    }

    #[test]
    fn an_error_status_carries_the_remotes_retry_after() {
        let response = RemoteResponse {
            status: 429,
            content_type: None,
            retry_after: Some("30".to_string()),
            body: Vec::new(),
        };
        let Err(RemoteError::Refused {
            retry_after_secs, ..
        }) = checked(response)
        else {
            panic!("expected a refusal");
        };
        assert_eq!(retry_after_secs, Some(30));
    }
}

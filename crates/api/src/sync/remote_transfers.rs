//! Requests to the remote that move whole dictionaries and media files, which may take far longer than a minute.
//!
//! ureq has no timeout for each read, only budgets for a whole call or a whole body.
//! A transfer therefore gets a budget that grows with its size, which still ends a stalled connection.

use std::io::Read;
use std::time::Duration;

use axum::http::Method;
use easyimmerse_core::sync::DictionaryStored;
use ureq::http::header::{AUTHORIZATION, CONTENT_LENGTH, CONTENT_TYPE};
use ureq::http::{Request, Response};
use ureq::{AsSendBody, Body, SendBody};

use super::remote_client::{RemoteClient, RemoteError, RemoteResponse, checked, transport_error};

/// The slowest transfer rate that counts as progress; a body that moves slower runs out of time.
const MIN_BYTES_PER_SECOND: u64 = 32 * 1024;
/// The time a transfer gets before its size counts.
const BASE_BUDGET: Duration = Duration::from_secs(60);
/// The time a transfer of unknown size gets, such as a streamed dictionary.
const UNKNOWN_SIZE_BUDGET: Duration = Duration::from_secs(2 * 60 * 60);
/// How long the remote may take to answer once the body is sent, as when it imports a large dictionary first.
const ANSWER_TIMEOUT: Duration = Duration::from_secs(10 * 60);
/// The longest error body read from a transfer that failed.
const MAX_ERROR_BYTES: u64 = 64 * 1024;

/// How the remote answered an uploaded dictionary.
#[derive(Debug, Clone, PartialEq)]
pub enum DictionaryUpload {
    Stored {
        updated_at_ms: u64,
    },
    /// The remote already holds a dictionary with this id or title.
    AlreadyThere,
}

/// The time a body of the given size may take.
pub fn transfer_budget(bytes: Option<u64>) -> Duration {
    match bytes {
        Some(bytes) => BASE_BUDGET + Duration::from_secs(bytes / MIN_BYTES_PER_SECOND),
        None => UNKNOWN_SIZE_BUDGET,
    }
}

impl RemoteClient {
    /// Opens the NDJSON dump of one of the account's dictionaries.
    pub fn download_dictionary(&self, id: &str) -> Result<ureq::BodyReader<'static>, RemoteError> {
        let path = format!("/sync/dictionaries/{id}/content");
        let response = self.transfer(Method::GET, &path, None, None, (), None)?;
        Ok(response.into_body().into_reader())
    }

    /// Uploads the NDJSON dump of a dictionary under its id.
    pub fn upload_dictionary(
        &self,
        id: &str,
        dump: impl Read + 'static,
    ) -> Result<DictionaryUpload, RemoteError> {
        let path = format!("/sync/dictionaries/{id}/content");
        let body = SendBody::from_owned_reader(dump);
        let content_type = Some(crate::routes::sync_dictionaries::NDJSON);
        match self.transfer(Method::PUT, &path, content_type, None, body, None) {
            Ok(response) => {
                let stored: DictionaryStored = read_json(response)?;
                Ok(DictionaryUpload::Stored {
                    updated_at_ms: stored.updated_at_ms,
                })
            }
            Err(RemoteError::Refused { status: 409, .. }) => Ok(DictionaryUpload::AlreadyThere),
            Err(error) => Err(error),
        }
    }

    /// Sends a transfer and passes on a successful response with its body unread.
    /// `size` is the size of the request body, or of the expected response body for a download.
    pub(super) fn transfer(
        &self,
        method: Method,
        path: &str,
        content_type: Option<&str>,
        content_length: Option<u64>,
        body: impl AsSendBody,
        size: Option<u64>,
    ) -> Result<Response<Body>, RemoteError> {
        let mut builder = Request::builder()
            .method(method)
            .uri(format!("{}{path}", self.server_url));
        if let Some(token) = &self.token {
            builder = builder.header(AUTHORIZATION, format!("Bearer {token}"));
        }
        if let Some(content_type) = content_type {
            builder = builder.header(CONTENT_TYPE, content_type);
        }
        if let Some(length) = content_length {
            builder = builder.header(CONTENT_LENGTH, length);
        }
        let request = builder
            .body(body)
            .map_err(|error| RemoteError::Protocol(error.to_string()))?;
        let budget = transfer_budget(size);
        let request = self
            .agent
            .configure_request(request)
            .timeout_global(None)
            .timeout_per_call(None)
            .timeout_send_body(Some(budget))
            .timeout_recv_response(Some(ANSWER_TIMEOUT))
            .timeout_recv_body(Some(budget))
            .build();
        let response = self.agent.run(request).map_err(transport_error)?;
        let status = response.status().as_u16();
        if status == 401 && self.token.is_some() {
            return Err(RemoteError::LoggedOut);
        }
        if (200..300).contains(&status) {
            return Ok(response);
        }
        Err(refusal_of(response))
    }
}

/// Reads a short JSON answer of a successful transfer.
pub(super) fn read_json<T: serde::de::DeserializeOwned>(
    mut response: Response<Body>,
) -> Result<T, RemoteError> {
    let body = response
        .body_mut()
        .with_config()
        .limit(MAX_ERROR_BYTES)
        .read_to_vec()
        .map_err(transport_error)?;
    serde_json::from_slice(&body).map_err(|error| RemoteError::Protocol(error.to_string()))
}

fn refusal_of(mut response: Response<Body>) -> RemoteError {
    let status = response.status().as_u16();
    let body = response
        .body_mut()
        .with_config()
        .limit(MAX_ERROR_BYTES)
        .read_to_vec()
        .unwrap_or_default();
    let answer = RemoteResponse {
        status,
        content_type: None,
        retry_after: None,
        body,
    };
    match checked(answer) {
        Err(error) => error,
        Ok(_) => RemoteError::Protocol(format!("the remote answered {status}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_larger_transfer_gets_more_time() {
        assert!(transfer_budget(Some(100 * 1024 * 1024)) > transfer_budget(Some(1024)));
    }

    #[test]
    fn a_small_transfer_gets_the_base_budget() {
        assert_eq!(transfer_budget(Some(0)), BASE_BUDGET);
    }
}

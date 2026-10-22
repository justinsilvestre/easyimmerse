//! Passes the account routes of the linked remote through this server, under `/sync/remote`,
//! so that the app manages the remote account without ever holding the remote's session token.

use axum::Extension;
use axum::body::{Body, to_bytes};
use axum::extract::State;
use axum::http::header::{CONTENT_TYPE, RETRY_AFTER};
use axum::http::{HeaderMap, Method, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use easyimmerse_storage::{OwnerId, RemoteKind, StoredRemote};

use super::failures::{not_linked, remote_failure, remote_logged_out, require_launch};
use super::remote_client::{RemoteClient, RemoteError, RemoteResponse};
use crate::auth::error_body::{ApiFailure, internal};
use crate::auth::principal::Principal;
use crate::state::AppState;

pub const PROXY_PREFIX: &str = "/sync/remote";
const MAX_PROXIED_BODY_BYTES: usize = 16 * 1024;

/// The remote routes that pass through. `{x}` stands for one path segment.
/// Logging in, signing up, logging out and every data route are left out on purpose: linking and unlinking do those.
const PROXIED_ROUTES: &[(Method, &str)] = &[
    (Method::GET, "/auth/me"),
    (Method::GET, "/auth/server"),
    (Method::GET, "/auth/sessions"),
    (Method::DELETE, "/auth/sessions/{id}"),
    (Method::POST, "/auth/confirmation-email"),
    (Method::PUT, "/auth/password"),
    (Method::GET, "/users"),
    (Method::POST, "/users"),
    (Method::PUT, "/users/{id}/role"),
    (Method::DELETE, "/users/{id}"),
    (Method::GET, "/storage"),
];

/// Whether the method and path name a route that passes through.
pub fn is_proxied(method: &Method, path: &str) -> bool {
    let segments: Vec<&str> = path.split('/').skip(1).collect();
    if segments
        .iter()
        .any(|segment| matches!(*segment, "" | "." | ".."))
    {
        return false;
    }
    PROXIED_ROUTES.iter().any(|(allowed_method, pattern)| {
        let pattern: Vec<&str> = pattern.split('/').skip(1).collect();
        allowed_method == method
            && pattern.len() == segments.len()
            && pattern
                .iter()
                .zip(&segments)
                .all(|(expected, segment)| expected.starts_with('{') || expected == segment)
    })
}

/// Forwards a request to the linked remote with this server's session there, and answers with the remote's response.
/// A 401 from the remote means it logged this device out: the session is forgotten and the answer is `remote_logged_out`.
pub async fn forward_to_remote(
    State(state): State<AppState>,
    Extension(principal): Extension<Principal>,
    method: Method,
    uri: Uri,
    headers: HeaderMap,
    body: Body,
) -> Result<Response, ApiFailure> {
    require_launch(&principal)?;
    let path = uri.path().strip_prefix(PROXY_PREFIX).unwrap_or_default();
    if !is_proxied(&method, path) {
        return Err(ApiFailure::new(
            StatusCode::NOT_FOUND,
            "not_proxied",
            "the linked server's route does not pass through this server",
        ));
    }
    let path_and_query = match uri.query() {
        Some(query) => format!("{path}?{query}"),
        None => path.to_string(),
    };
    let content_type = headers
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .map(str::to_string);
    let body = to_bytes(body, MAX_PROXIED_BODY_BYTES).await.map_err(|_| {
        ApiFailure::new(
            StatusCode::PAYLOAD_TOO_LARGE,
            "payload_too_large",
            "a request to the linked server may hold at most 16 KiB",
        )
    })?;
    let remote = state
        .with_storage(|storage| storage.get_sync_remote(&OwnerId::launch(), RemoteKind::Account))
        .await?
        .ok_or_else(not_linked)?;
    let remote_id = remote.id.clone();
    let response = tokio::task::spawn_blocking(move || {
        send(
            &remote,
            method,
            &path_and_query,
            content_type,
            body.to_vec(),
        )
    })
    .await
    .map_err(|error| internal(format!("the proxy task failed: {error}")))?;
    match response {
        Ok(response) => Ok(response_of(response)),
        Err(RemoteError::LoggedOut) => {
            state
                .with_storage(move |storage| storage.forget_sync_session_token(&remote_id))
                .await?;
            Err(remote_logged_out())
        }
        Err(error) => Err(remote_failure(error)),
    }
}

fn send(
    remote: &StoredRemote,
    method: Method,
    path_and_query: &str,
    content_type: Option<String>,
    body: Vec<u8>,
) -> Result<RemoteResponse, RemoteError> {
    let Some(token) = &remote.session_token else {
        return Err(RemoteError::LoggedOut);
    };
    RemoteClient::new(&remote.server_url, Some(token.clone())).forward(
        method,
        path_and_query,
        content_type.as_deref(),
        body,
    )
}

fn response_of(remote: RemoteResponse) -> Response {
    let status = StatusCode::from_u16(remote.status).unwrap_or(StatusCode::BAD_GATEWAY);
    let mut response = (status, remote.body).into_response();
    let headers = response.headers_mut();
    for (name, value) in [
        (CONTENT_TYPE, remote.content_type),
        (RETRY_AFTER, remote.retry_after),
    ] {
        if let Some(value) = value.and_then(|value| value.parse().ok()) {
            headers.insert(name, value);
        }
    }
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn passes_the_current_principal_through() {
        assert!(is_proxied(&Method::GET, "/auth/me"));
    }

    #[test]
    fn passes_a_route_with_an_id_through() {
        assert!(is_proxied(&Method::DELETE, "/auth/sessions/abc"));
    }

    #[test]
    fn keeps_a_data_route_back() {
        assert!(!is_proxied(&Method::GET, "/projects"));
    }

    #[test]
    fn keeps_another_method_on_a_passed_path_back() {
        assert!(!is_proxied(&Method::POST, "/auth/me"));
    }

    #[test]
    fn keeps_logging_out_back() {
        assert!(!is_proxied(&Method::POST, "/auth/logout"));
    }

    #[test]
    fn keeps_a_path_that_climbs_back() {
        assert!(!is_proxied(&Method::DELETE, "/users/.."));
    }

    #[test]
    fn keeps_a_longer_path_back() {
        assert!(!is_proxied(&Method::GET, "/users/abc/role"));
    }
}

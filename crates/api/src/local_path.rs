//! The one gate for every request that names a file on the server's own file system.

use std::io::ErrorKind;

use axum::http::StatusCode;

use crate::auth::error_body::{ApiFailure, bad_request, not_found};
use crate::auth::token_kind::TokenKind;
use crate::config::ApiConfig;

/// Reads the file at `path` when the request's token kind allows local paths.
pub async fn resolve_local_path(
    token: TokenKind,
    config: &ApiConfig,
    path: &str,
) -> Result<Vec<u8>, ApiFailure> {
    ensure_local_paths_allowed(token, config)?;
    tokio::fs::read(path)
        .await
        .map_err(|error| describe_read_error(path, error))
}

/// Reads the file at `path` as UTF-8 text when the request's token kind allows local paths.
pub async fn resolve_local_text(
    token: TokenKind,
    config: &ApiConfig,
    path: &str,
) -> Result<String, ApiFailure> {
    ensure_local_paths_allowed(token, config)?;
    tokio::fs::read_to_string(path)
        .await
        .map_err(|error| describe_read_error(path, error))
}

fn ensure_local_paths_allowed(token: TokenKind, config: &ApiConfig) -> Result<(), ApiFailure> {
    if token.allows_local_paths(config) {
        Ok(())
    } else {
        Err(ApiFailure::new(
            StatusCode::FORBIDDEN,
            "local_paths_not_allowed",
            "this token may not read files on the server",
        ))
    }
}

fn describe_read_error(path: &str, error: std::io::Error) -> ApiFailure {
    match error.kind() {
        ErrorKind::NotFound => not_found(format!("no file at {path:?}")),
        _ => bad_request(format!("could not read {path:?}: {error}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config(allow_local_paths: bool) -> ApiConfig {
        ApiConfig::for_loopback(1, "t".to_string(), allow_local_paths)
    }

    fn fixture(name: &str) -> String {
        format!("{}/../../fixtures/{name}", env!("CARGO_MANIFEST_DIR"))
    }

    #[tokio::test]
    async fn reads_a_file_when_allowed() {
        let text = resolve_local_text(TokenKind::Launch, &config(true), &fixture("sample.srt"))
            .await
            .unwrap();
        assert!(text.contains("-->"));
    }

    #[tokio::test]
    async fn refuses_with_forbidden_when_not_allowed() {
        let failure = resolve_local_text(TokenKind::Launch, &config(false), &fixture("sample.srt"))
            .await
            .unwrap_err();
        assert_eq!(failure.status, StatusCode::FORBIDDEN);
    }

    #[tokio::test]
    async fn names_the_refusal_code() {
        let failure = resolve_local_path(TokenKind::Launch, &config(false), &fixture("sample.srt"))
            .await
            .unwrap_err();
        assert_eq!(failure.error.code, "local_paths_not_allowed");
    }

    #[tokio::test]
    async fn reports_a_missing_file_as_not_found() {
        let failure = resolve_local_path(TokenKind::Launch, &config(true), &fixture("missing"))
            .await
            .unwrap_err();
        assert_eq!(failure.status, StatusCode::NOT_FOUND);
    }
}

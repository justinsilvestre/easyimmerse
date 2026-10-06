//! The one gate for every request that names a file on the server's own file system.
//! A file inside one of the server's own directories is readable with any token, since
//! the server put it there itself; any other path needs a token allowed to read local paths.

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
    ensure_local_path_readable(token, config, path)?;
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
    ensure_local_path_readable(token, config, path)?;
    tokio::fs::read_to_string(path)
        .await
        .map_err(|error| describe_read_error(path, error))
}

/// Checks that a file exists at `path` without reading it, when the request's token kind
/// allows local paths.
pub async fn ensure_local_file_exists(
    token: TokenKind,
    config: &ApiConfig,
    path: &str,
) -> Result<(), ApiFailure> {
    ensure_local_path_readable(token, config, path)?;
    let metadata = tokio::fs::metadata(path)
        .await
        .map_err(|error| describe_read_error(path, error))?;
    if metadata.is_file() {
        Ok(())
    } else {
        Err(not_found(format!("no file at {path:?}")))
    }
}

/// Checks that the request may read the file at `path`: any token may read a file in one
/// of the server's own directories, and a token allowed to read local paths may read any.
pub fn ensure_local_path_readable(
    token: TokenKind,
    config: &ApiConfig,
    path: &str,
) -> Result<(), ApiFailure> {
    if config.is_server_path(path) {
        return Ok(());
    }
    ensure_local_paths_allowed(token, config)
}

/// Checks that the request may name any file on the server's machine.
pub fn ensure_local_paths_allowed(token: TokenKind, config: &ApiConfig) -> Result<(), ApiFailure> {
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
    async fn reads_a_file_in_a_server_dir_when_local_paths_are_not_allowed() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("a.srt");
        std::fs::write(&file, "1\n00:00:00,000 --> 00:00:01,000\nhi\n").unwrap();
        let mut config = config(false);
        config.server_dirs.push(dir.path().to_path_buf());
        let text = resolve_local_text(TokenKind::Launch, &config, &file.to_string_lossy())
            .await
            .unwrap();
        assert!(text.contains("-->"));
    }

    #[tokio::test]
    async fn confirms_an_existing_file_without_reading_it() {
        let result =
            ensure_local_file_exists(TokenKind::Launch, &config(true), &fixture("sample.mp4"))
                .await;
        assert_eq!(result, Ok(()));
    }

    #[tokio::test]
    async fn reports_a_directory_as_not_found() {
        let failure = ensure_local_file_exists(TokenKind::Launch, &config(true), &fixture(""))
            .await
            .unwrap_err();
        assert_eq!(failure.status, StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn reports_a_missing_file_as_not_found() {
        let failure = resolve_local_path(TokenKind::Launch, &config(true), &fixture("missing"))
            .await
            .unwrap_err();
        assert_eq!(failure.status, StatusCode::NOT_FOUND);
    }
}

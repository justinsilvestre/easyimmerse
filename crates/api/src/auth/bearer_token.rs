use std::sync::Arc;

use axum::extract::{Request, State};
use axum::http::header::AUTHORIZATION;
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};

use crate::auth::error_body::unauthorized;
use crate::auth::token_kind::TokenKind;
use crate::config::ApiConfig;

/// Requires `Authorization: Bearer <token>` and records the token's kind on the request.
pub async fn require_bearer_token(
    State(config): State<Arc<ApiConfig>>,
    mut request: Request,
    next: Next,
) -> Response {
    match presented_token(&request) {
        Some(token) if bytes_are_equal(token.as_bytes(), config.token.as_bytes()) => {
            request.extensions_mut().insert(TokenKind::Launch);
            next.run(request).await
        }
        _ => unauthorized().into_response(),
    }
}

fn presented_token(request: &Request) -> Option<&str> {
    request
        .headers()
        .get(AUTHORIZATION)?
        .to_str()
        .ok()?
        .strip_prefix("Bearer ")
}

/// Compares in time that depends only on the length of the input, so that a caller cannot
/// learn how many leading bytes matched. The length itself is not hidden.
fn bytes_are_equal(presented: &[u8], expected: &[u8]) -> bool {
    if presented.len() != expected.len() {
        return false;
    }
    let mut difference = 0u8;
    for (left, right) in presented.iter().zip(expected) {
        difference |= left ^ right;
    }
    difference == 0
}

#[cfg(test)]
mod tests {
    use axum::http::StatusCode;
    use axum::middleware::from_fn_with_state;
    use axum::routing::get;
    use axum::{Extension, Router};
    use tower::ServiceExt;

    use super::*;

    fn app() -> Router {
        let config = Arc::new(ApiConfig::for_loopback(1, "secret".to_string(), false));
        Router::new()
            .route(
                "/",
                get(|Extension(kind): Extension<TokenKind>| async move { format!("{kind:?}") }),
            )
            .layer(from_fn_with_state(config, require_bearer_token))
    }

    fn request_with(header: Option<&str>) -> Request {
        let builder = Request::builder().uri("/");
        let builder = match header {
            Some(value) => builder.header(AUTHORIZATION, value),
            None => builder,
        };
        builder.body(axum::body::Body::empty()).unwrap()
    }

    #[tokio::test]
    async fn accepts_the_configured_token() {
        let response = app()
            .oneshot(request_with(Some("Bearer secret")))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn records_the_launch_token_kind() {
        let response = app()
            .oneshot(request_with(Some("Bearer secret")))
            .await
            .unwrap();
        let body = axum::body::to_bytes(response.into_body(), 1024)
            .await
            .unwrap();
        assert_eq!(body, "Launch");
    }

    #[tokio::test]
    async fn rejects_a_wrong_token() {
        let response = app()
            .oneshot(request_with(Some("Bearer other")))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn rejects_a_missing_header() {
        let response = app().oneshot(request_with(None)).await.unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn rejects_a_non_bearer_scheme() {
        let response = app()
            .oneshot(request_with(Some("Basic secret")))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[test]
    fn treats_different_lengths_as_unequal() {
        assert!(!bytes_are_equal(b"abc", b"abcd"));
    }
}

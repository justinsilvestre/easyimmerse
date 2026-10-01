use std::sync::Arc;

use axum::extract::{Request, State};
use axum::http::header::HOST;
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};

use crate::auth::error_body::misdirected;
use crate::config::ApiConfig;

/// Rejects requests whose `Host` header is missing or is not one of the expected hosts.
///
/// A malicious web page can point its own domain at the loopback address; its requests then
/// carry that domain as the `Host` header and are rejected here.
pub async fn check_host(
    State(config): State<Arc<ApiConfig>>,
    request: Request,
    next: Next,
) -> Response {
    let host = request
        .headers()
        .get(HOST)
        .and_then(|value| value.to_str().ok());
    match host {
        Some(host)
            if config
                .expected_hosts
                .iter()
                .any(|expected| expected == host) =>
        {
            next.run(request).await
        }
        _ => misdirected().into_response(),
    }
}

#[cfg(test)]
mod tests {
    use axum::Router;
    use axum::http::StatusCode;
    use axum::middleware::from_fn_with_state;
    use axum::routing::get;
    use tower::ServiceExt;

    use super::*;

    fn app() -> Router {
        let config = Arc::new(ApiConfig::for_loopback(8787, "t".to_string(), false));
        Router::new()
            .route("/", get(|| async { "ok" }))
            .layer(from_fn_with_state(config, check_host))
    }

    async fn status_for(request: Request) -> StatusCode {
        app().oneshot(request).await.unwrap().status()
    }

    #[tokio::test]
    async fn accepts_the_expected_host() {
        let request = Request::builder()
            .uri("/")
            .header(HOST, "127.0.0.1:8787")
            .body(axum::body::Body::empty())
            .unwrap();
        assert_eq!(status_for(request).await, StatusCode::OK);
    }

    #[tokio::test]
    async fn rejects_an_unexpected_host() {
        let request = Request::builder()
            .uri("/")
            .header(HOST, "evil.test")
            .body(axum::body::Body::empty())
            .unwrap();
        assert_eq!(status_for(request).await, StatusCode::MISDIRECTED_REQUEST);
    }

    #[tokio::test]
    async fn rejects_a_missing_host() {
        let request = Request::builder()
            .uri("/")
            .body(axum::body::Body::empty())
            .unwrap();
        assert_eq!(status_for(request).await, StatusCode::MISDIRECTED_REQUEST);
    }
}

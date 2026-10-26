use std::sync::Arc;

use axum::extract::{MatchedPath, Query, Request, State};
use axum::http::HeaderMap;
use axum::http::header::AUTHORIZATION;
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use serde::Deserialize;

use crate::accounts::{find_session, refresh_in_background};
use crate::auth::error_body::{ApiFailure, unauthorized};
use crate::auth::principal::Principal;
use crate::config::ApiConfig;
use crate::now_ms::now_ms;
use crate::routes::dictionary_media::DICTIONARY_MEDIA_ROUTE_PATH;
use crate::routes::library_cover::LIBRARY_COVER_ROUTE_PATH;
use crate::routes::library_files::LIBRARY_FILE_ROUTE_PATH;
use crate::routes::media_clip::CLIP_ROUTE_PATH;
use crate::routes::media_frame::FRAME_ROUTE_PATH;
use crate::routes::media_stream::STREAM_ROUTE_PATH;
use crate::state::AppState;

/// Requires `Authorization: Bearer <token>` and records on the request the principal the token belongs to:
/// the launch principal for the launch token, or the user of the session with that token.
///
/// The media stream, frame, clip, dictionary media, library file and library cover routes also accept the token as the `token` query parameter,
/// because media and image elements cannot send headers.
/// No other route does, since a token in a URL ends up in logs and browser history more easily than one in a header.
pub async fn require_bearer_token(
    State(state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Response {
    let Some(token) = presented_token(&request) else {
        return unauthorized().into_response();
    };
    match authenticate(&state, token).await {
        Ok(Some(principal)) => {
            request.extensions_mut().insert(principal);
            next.run(request).await
        }
        Ok(None) => unauthorized().into_response(),
        Err(failure) => failure.into_response(),
    }
}

/// The token of the `Authorization: Bearer <token>` header, if there is one.
pub fn header_token(headers: &HeaderMap) -> Option<&str> {
    headers
        .get(AUTHORIZATION)?
        .to_str()
        .ok()?
        .strip_prefix("Bearer ")
}

/// Tries the launch token first, then the sessions when the server has accounts.
async fn authenticate(state: &AppState, token: String) -> Result<Option<Principal>, ApiFailure> {
    if is_launch_token(&state.config, &token) {
        return Ok(Some(Principal::Launch));
    }
    if state.config.accounts.is_none() {
        return Ok(None);
    }
    let found = state
        .with_storage(move |storage| find_session(storage, &token, now_ms()))
        .await?;
    let Some(found) = found else {
        return Ok(None);
    };
    if let Some(refresh) = found.refresh {
        let storage = Arc::clone(&state.storage);
        refresh_in_background(storage, Arc::clone(&state.session_refreshes), refresh);
    }
    Ok(Some(Principal::of_session(&found.user, &found.id)))
}

#[derive(Deserialize)]
struct TokenQuery {
    token: Option<String>,
}

fn presented_token(request: &Request) -> Option<String> {
    header_token(request.headers())
        .map(str::to_string)
        .or_else(|| query_token(request))
}

fn query_token(request: &Request) -> Option<String> {
    if !accepts_query_token(request) {
        return None;
    }
    Query::<TokenQuery>::try_from_uri(request.uri())
        .ok()?
        .0
        .token
}

fn accepts_query_token(request: &Request) -> bool {
    request
        .extensions()
        .get::<MatchedPath>()
        .is_some_and(|matched| {
            [
                STREAM_ROUTE_PATH,
                FRAME_ROUTE_PATH,
                CLIP_ROUTE_PATH,
                DICTIONARY_MEDIA_ROUTE_PATH,
                LIBRARY_FILE_ROUTE_PATH,
                LIBRARY_COVER_ROUTE_PATH,
            ]
            .contains(&matched.as_str())
        })
}

fn is_launch_token(config: &ApiConfig, token: &str) -> bool {
    config
        .launch_token
        .as_ref()
        .is_some_and(|launch_token| bytes_are_equal(token.as_bytes(), launch_token.as_bytes()))
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
        let config = ApiConfig::for_loopback(1, "secret".to_string(), false);
        let storage = easyimmerse_storage::Storage::open_in_memory().unwrap();
        let state = AppState::new(storage, config, None, None);
        Router::new()
            .route(
                "/",
                get(|Extension(principal): Extension<Principal>| async move {
                    format!("{principal:?}")
                }),
            )
            .route(STREAM_ROUTE_PATH, get(|| async { "streamed" }))
            .route(FRAME_ROUTE_PATH, get(|| async { "framed" }))
            .route(CLIP_ROUTE_PATH, get(|| async { "clipped" }))
            .route(DICTIONARY_MEDIA_ROUTE_PATH, get(|| async { "image" }))
            .route(LIBRARY_FILE_ROUTE_PATH, get(|| async { "file" }))
            .route(LIBRARY_COVER_ROUTE_PATH, get(|| async { "cover" }))
            .route("/other/{id}", get(|| async { "other" }))
            .layer(from_fn_with_state(state, require_bearer_token))
    }

    fn request_with(header: Option<&str>) -> Request {
        request_to("/", header)
    }

    fn request_to(uri: &str, header: Option<&str>) -> Request {
        let builder = Request::builder().uri(uri);
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
    async fn records_the_launch_principal() {
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

    #[tokio::test]
    async fn accepts_a_query_token_on_the_stream_route() {
        let response = app()
            .oneshot(request_to("/projects/p/media/m/stream?token=secret", None))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn accepts_a_query_token_on_the_frame_route() {
        let response = app()
            .oneshot(request_to(
                "/projects/p/media/m/frame?at_ms=1&token=secret",
                None,
            ))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn accepts_a_query_token_on_the_clip_route() {
        let response = app()
            .oneshot(request_to(
                "/projects/p/media/m/clip?start_ms=1&end_ms=2&token=secret",
                None,
            ))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn rejects_a_wrong_query_token_on_the_stream_route() {
        let response = app()
            .oneshot(request_to("/projects/p/media/m/stream?token=other", None))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn accepts_a_query_token_on_the_dictionary_media_route() {
        let response = app()
            .oneshot(request_to(
                "/dictionaries/d/media/img%2Fa.png?token=secret",
                None,
            ))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn accepts_a_query_token_on_the_library_file_route() {
        let response = app()
            .oneshot(request_to("/library/items/i/file?token=secret", None))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn accepts_a_query_token_on_the_library_cover_route() {
        let response = app()
            .oneshot(request_to("/library/items/i/cover?token=secret", None))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn ignores_a_query_token_on_other_routes() {
        let response = app()
            .oneshot(request_to("/other/x?token=secret", None))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[test]
    fn treats_different_lengths_as_unequal() {
        assert!(!bytes_are_equal(b"abc", b"abcd"));
    }
}

//! Serves the files of the built web app at every path the API does not use.

use std::convert::Infallible;
use std::path::{Path, PathBuf};

use axum::Router;
use axum::body::Body;
use axum::extract::Request;
use axum::http::header::{ACCEPT, CACHE_CONTROL};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::middleware::{Next, from_fn};
use axum::response::{IntoResponse, Response};
use axum::routing::get_service;
use tower::{ServiceExt, service_fn};
use tower_http::services::{ServeDir, ServeFile};

/// The files under this directory carry a hash of their contents in their names,
/// so a browser may keep them for as long as it likes.
const HASHED_ASSETS_PREFIX: &str = "/assets/";
const LONG_CACHE: &str = "public, max-age=31536000, immutable";
/// Makes the browser check for a newer version before using a file it kept,
/// so that `index.html` and the service worker always lead to the current assets.
const REVALIDATE: &str = "no-cache";

/// Serves the file at the request's path from `dir`.
/// A request that accepts HTML, for a path without a file extension that names no file,
/// is for one of the web app's own pages, so it gets `index.html`.
/// Any other request for a missing file gets 404, as do methods other than GET and HEAD.
pub fn web_app_router(dir: &Path) -> Router {
    let files = ServeDir::new(dir).fallback(index_for_pages(dir.join("index.html")));
    let method_router =
        get_service(files).fallback(|| async { StatusCode::NOT_FOUND.into_response() });
    Router::new()
        .fallback_service(method_router)
        .layer(from_fn(set_cache_control))
}

fn index_for_pages(
    index_html: PathBuf,
) -> impl tower::Service<Request, Response = Response, Error = Infallible, Future: Send> + Clone {
    let index = ServeFile::new(index_html);
    service_fn(move |request: Request| {
        let index = index.clone();
        async move {
            let is_page = !has_extension(request.uri().path()) && accepts_html(request.headers());
            let response = if is_page {
                index.oneshot(request).await?.map(Body::new)
            } else {
                StatusCode::NOT_FOUND.into_response()
            };
            Ok::<_, Infallible>(response)
        }
    })
}

fn has_extension(path: &str) -> bool {
    path.rsplit('/')
        .next()
        .is_some_and(|segment| segment.contains('.'))
}

fn accepts_html(headers: &HeaderMap) -> bool {
    headers
        .get_all(ACCEPT)
        .iter()
        .filter_map(|value| value.to_str().ok())
        .any(|value| value.to_ascii_lowercase().contains("text/html"))
}

async fn set_cache_control(request: Request, next: Next) -> Response {
    let cache_control = if request.uri().path().starts_with(HASHED_ASSETS_PREFIX) {
        LONG_CACHE
    } else {
        REVALIDATE
    };
    let mut response = next.run(request).await;
    let status = response.status();
    if status.is_success() || status == StatusCode::NOT_MODIFIED {
        response
            .headers_mut()
            .insert(CACHE_CONTROL, HeaderValue::from_static(cache_control));
    }
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sees_an_extension_in_the_last_segment() {
        assert!(has_extension("/assets/index-abc123.js"));
    }

    #[test]
    fn sees_no_extension_in_a_page_path() {
        assert!(!has_extension("/projects/1"));
    }

    #[test]
    fn ignores_a_dot_in_an_earlier_segment() {
        assert!(!has_extension("/v1.2/projects"));
    }

    fn headers_accepting(accept: &'static str) -> HeaderMap {
        HeaderMap::from_iter([(ACCEPT, HeaderValue::from_static(accept))])
    }

    #[test]
    fn sees_that_a_browser_navigation_accepts_html() {
        let headers = headers_accepting("text/html,application/xhtml+xml,*/*;q=0.8");
        assert!(accepts_html(&headers));
    }

    #[test]
    fn sees_that_a_json_request_does_not_accept_html() {
        assert!(!accepts_html(&headers_accepting("application/json")));
    }

    #[test]
    fn sees_that_a_request_without_an_accept_header_does_not_accept_html() {
        assert!(!accepts_html(&HeaderMap::new()));
    }
}

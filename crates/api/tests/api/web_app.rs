//! The server serves the built web app from a directory at every path outside the API's prefix.

use std::path::Path;

use easyimmerse_api::ServeOptions;
use tempfile::TempDir;

use crate::support::{TestServer, seeded_storage, spawn_test_server_with_options};

const INDEX: &str = "<!doctype html><title>easyImmerse</title>";
const SCRIPT: &str = "console.log('easyImmerse');";

struct Fixture {
    server: TestServer,
    _web_app_dir: TempDir,
}

/// A server whose web app directory holds an `index.html` and one hashed asset.
async fn serve_web_app() -> Fixture {
    let web_app_dir = TempDir::new().expect("a web app directory");
    write_web_app(web_app_dir.path());
    let options = ServeOptions {
        web_app_dir: Some(web_app_dir.path().to_path_buf()),
        ..ServeOptions::default()
    };
    let server = spawn_test_server_with_options(false, seeded_storage(), options).await;
    Fixture {
        server,
        _web_app_dir: web_app_dir,
    }
}

fn write_web_app(dir: &Path) {
    std::fs::write(dir.join("index.html"), INDEX).expect("index.html");
    std::fs::create_dir(dir.join("assets")).expect("an assets directory");
    std::fs::write(dir.join("assets/index-abc123.js"), SCRIPT).expect("an asset");
}

async fn get_without_token(server: &TestServer, path: &str) -> crate::support::TestResponse {
    server
        .web_app_request("GET", path)
        .without_token()
        .send()
        .await
}

async fn get_page_without_token(
    server: &TestServer,
    path: &str,
    accept: &str,
) -> crate::support::TestResponse {
    server
        .web_app_request("GET", path)
        .without_token()
        .header("Accept", accept)
        .send()
        .await
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_index_html_at_the_root() {
    let fixture = serve_web_app().await;
    let response = get_without_token(&fixture.server, "/").await;
    assert_eq!(response.text(), INDEX);
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_an_asset_at_its_path() {
    let fixture = serve_web_app().await;
    let response = get_without_token(&fixture.server, "/assets/index-abc123.js").await;
    assert_eq!(response.text(), SCRIPT);
}

#[tokio::test(flavor = "multi_thread")]
async fn lets_browsers_keep_a_hashed_asset() {
    let fixture = serve_web_app().await;
    let response = get_without_token(&fixture.server, "/assets/index-abc123.js").await;
    assert_eq!(
        response.header("Cache-Control"),
        Some("public, max-age=31536000, immutable")
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn makes_browsers_revalidate_index_html() {
    let fixture = serve_web_app().await;
    let response = get_without_token(&fixture.server, "/").await;
    assert_eq!(response.header("Cache-Control"), Some("no-cache"));
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_index_html_at_an_unknown_path_without_an_extension_to_a_browser() {
    let fixture = serve_web_app().await;
    let response = get_page_without_token(&fixture.server, "/some/page", "text/html").await;
    assert_eq!(response.text(), INDEX);
}

#[tokio::test(flavor = "multi_thread")]
async fn answers_404_at_an_unknown_path_without_an_extension_to_a_request_for_json() {
    let fixture = serve_web_app().await;
    let response = get_page_without_token(&fixture.server, "/some/page", "application/json").await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn answers_404_for_a_missing_file_with_an_extension() {
    let fixture = serve_web_app().await;
    let response = get_without_token(&fixture.server, "/assets/missing.js").await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_index_html_to_a_browser_at_a_page_path_that_an_api_route_also_has() {
    let fixture = serve_web_app().await;
    let response = get_page_without_token(&fixture.server, "/projects", "text/html").await;
    assert_eq!(response.text(), INDEX);
}

#[tokio::test(flavor = "multi_thread")]
async fn still_requires_a_token_for_an_api_path() {
    let fixture = serve_web_app().await;
    let response = fixture
        .server
        .request("GET", "/projects")
        .without_token()
        .send()
        .await;
    assert_eq!(response.status, 401);
}

#[tokio::test(flavor = "multi_thread")]
async fn answers_404_to_a_browser_at_an_unknown_api_path() {
    let fixture = serve_web_app().await;
    let response = fixture
        .server
        .request("GET", "/some/page")
        .without_token()
        .header("Accept", "text/html")
        .send()
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn still_checks_the_host_of_a_request_for_a_file() {
    let fixture = serve_web_app().await;
    let response = fixture
        .server
        .web_app_request("GET", "/")
        .without_token()
        .header("Host", "evil.test")
        .send()
        .await;
    assert_eq!(response.status, 421);
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_no_file_without_a_web_app_dir() {
    let server =
        spawn_test_server_with_options(false, seeded_storage(), ServeOptions::default()).await;
    let response = server.web_app_request("GET", "/").send().await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_no_file_when_the_web_app_dir_is_missing() {
    let parent = TempDir::new().expect("a parent directory");
    let options = ServeOptions {
        web_app_dir: Some(parent.path().join("web")),
        ..ServeOptions::default()
    };
    let server = spawn_test_server_with_options(false, seeded_storage(), options).await;
    let response = server.web_app_request("GET", "/").send().await;
    assert_eq!(response.status, 404);
}

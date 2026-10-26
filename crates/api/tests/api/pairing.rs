//! Issuing a pairing code and exchanging it for the launch token.

use std::net::SocketAddr;
use std::sync::Arc;

use easyimmerse_api::pairing_codes::PairingCodeState;
use easyimmerse_api::{API_PATH_PREFIX, ApiConfig, AppState, build_router};
use serde_json::json;
use tokio::net::TcpListener;

use crate::support::{
    TOKEN, TestRequest, TestResponse, TestServer, seeded_storage, spawn_test_server,
    spawn_test_server_with_accounts,
};

async fn issue_code(server: &TestServer) -> String {
    let response = server.request("POST", "/pairing/code").send().await;
    response.json()["code"]
        .as_str()
        .expect("a pairing code")
        .to_string()
}

async fn claim(server: &TestServer, code: &str) -> TestResponse {
    server
        .request("POST", "/pairing/claim")
        .without_token()
        .json(&json!({ "code": code }))
        .send()
        .await
}

/// A code that differs from `code`, so that a claim of it fails.
fn other_code(code: &str) -> String {
    if code == "000000" { "000001" } else { "000000" }.to_string()
}

/// Starts a server whose pairing codes expire as soon as they are issued, and returns its URL.
async fn spawn_server_with_expiring_codes() -> String {
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .expect("a free loopback port");
    let port = listener.local_addr().expect("a bound address").port();
    let config = ApiConfig::for_loopback(port, TOKEN.to_string(), false);
    let mut state = AppState::new(seeded_storage(), config, None, None);
    state.pairing_code = Arc::new(PairingCodeState::with_validity_ms(0));
    let (router, _) = build_router(state);
    let service = router.into_make_service_with_connect_info::<SocketAddr>();
    tokio::spawn(axum::serve(listener, service).into_future());
    format!("http://127.0.0.1:{port}")
}

#[tokio::test(flavor = "multi_thread")]
async fn a_claimed_code_yields_the_launch_token() {
    let server = spawn_test_server(false).await;
    let code = issue_code(&server).await;
    let response = claim(&server, &code).await;
    assert_eq!(response.json(), json!({ "token": TOKEN }));
}

#[tokio::test(flavor = "multi_thread")]
async fn an_issued_code_has_six_characters() {
    let server = spawn_test_server(false).await;
    let code = issue_code(&server).await;
    assert_eq!(code.len(), 6);
}

#[tokio::test(flavor = "multi_thread")]
async fn an_issued_code_has_only_digits() {
    let server = spawn_test_server(false).await;
    let code = issue_code(&server).await;
    assert!(code.bytes().all(|byte| byte.is_ascii_digit()), "{code}");
}

async fn current_code(server: &TestServer) -> String {
    let response = server.request("POST", "/pairing/code/current").send().await;
    response.json()["code"]
        .as_str()
        .expect("a pairing code")
        .to_string()
}

#[tokio::test(flavor = "multi_thread")]
async fn a_code_claimed_before_is_reported_as_used() {
    let server = spawn_test_server(false).await;
    let code = issue_code(&server).await;
    claim(&server, &code).await;
    let response = claim(&server, &code).await;
    assert_eq!(response.json()["code"], "pairing_code_used");
}

#[tokio::test(flavor = "multi_thread")]
async fn the_current_code_is_the_issued_one() {
    let server = spawn_test_server(false).await;
    let code = issue_code(&server).await;
    assert_eq!(current_code(&server).await, code);
}

#[tokio::test(flavor = "multi_thread")]
async fn after_a_claim_the_current_code_can_be_claimed() {
    let server = spawn_test_server(false).await;
    let code = issue_code(&server).await;
    claim(&server, &code).await;
    let next = current_code(&server).await;
    let response = claim(&server, &next).await;
    assert_eq!(response.json(), json!({ "token": TOKEN }));
}

#[tokio::test(flavor = "multi_thread")]
async fn a_server_with_accounts_has_no_current_code() {
    let server = spawn_test_server_with_accounts(false).await;
    let response = server.request("POST", "/pairing/code/current").send().await;
    assert_eq!(response.json()["code"], "pairing_needs_launch_token");
}

#[tokio::test(flavor = "multi_thread")]
async fn a_wrong_code_is_not_found() {
    let server = spawn_test_server(false).await;
    let code = issue_code(&server).await;
    let response = claim(&server, &other_code(&code)).await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn an_expired_code_is_not_found() {
    let base_url = spawn_server_with_expiring_codes().await;
    let issued = TestRequest::to("POST", format!("{base_url}{API_PATH_PREFIX}/pairing/code"))
        .with_token(TOKEN)
        .send()
        .await;
    let code = issued.json()["code"]
        .as_str()
        .unwrap_or_default()
        .to_string();
    let response = TestRequest::to("POST", format!("{base_url}{API_PATH_PREFIX}/pairing/claim"))
        .json(&json!({ "code": code }))
        .send()
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn issuing_needs_a_token() {
    let server = spawn_test_server(false).await;
    let response = server
        .request("POST", "/pairing/code")
        .without_token()
        .send()
        .await;
    assert_eq!(response.status, 401);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_server_with_accounts_issues_no_code() {
    let server = spawn_test_server_with_accounts(false).await;
    let response = server.request("POST", "/pairing/code").send().await;
    assert_eq!(response.json()["code"], "pairing_needs_launch_token");
}

#[tokio::test(flavor = "multi_thread")]
async fn an_account_cannot_issue_a_code() {
    let server = spawn_test_server_with_accounts(true).await;
    let body = json!({ "email": "reader@example.com", "password": "correct horse" });
    let session = server
        .request("POST", "/auth/signup")
        .without_token()
        .json(&body)
        .send()
        .await;
    let token = session.json()["token"]
        .as_str()
        .unwrap_or_default()
        .to_string();
    let response = server
        .request("POST", "/pairing/code")
        .with_token(&token)
        .send()
        .await;
    assert_eq!(response.status, 409);
}

mod after_ten_wrong_claims {
    use super::*;

    async fn server_after_wrong_claims() -> (TestServer, String) {
        let server = spawn_test_server(false).await;
        let code = issue_code(&server).await;
        for _ in 0..10 {
            claim(&server, &other_code(&code)).await;
        }
        (server, code)
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn the_eleventh_claim_is_too_many() {
        let (server, code) = server_after_wrong_claims().await;
        let response = claim(&server, &other_code(&code)).await;
        assert_eq!(response.status, 429);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn the_eleventh_claim_tells_when_to_retry() {
        let (server, code) = server_after_wrong_claims().await;
        let response = claim(&server, &code).await;
        assert!(response.header("retry-after").is_some());
    }
}

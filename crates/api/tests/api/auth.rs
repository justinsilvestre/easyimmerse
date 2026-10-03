use crate::support::spawn_test_server;

#[tokio::test(flavor = "multi_thread")]
async fn a_request_without_a_token_is_unauthorized() {
    let server = spawn_test_server(false).await;
    let response = server
        .request("GET", "/projects")
        .without_token()
        .send()
        .await;
    assert_eq!(response.status, 401);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_request_with_a_wrong_token_is_unauthorized() {
    let server = spawn_test_server(false).await;
    let response = server
        .request("GET", "/projects")
        .without_token()
        .header("Authorization", "Bearer wrong")
        .send()
        .await;
    assert_eq!(response.status, 401);
}

#[tokio::test(flavor = "multi_thread")]
async fn an_unauthorized_response_carries_the_error_body() {
    let server = spawn_test_server(false).await;
    let response = server
        .request("GET", "/projects")
        .without_token()
        .send()
        .await;
    assert_eq!(response.json()["code"], "unauthorized");
}

#[tokio::test(flavor = "multi_thread")]
async fn a_request_with_a_wrong_host_header_is_misdirected() {
    let server = spawn_test_server(false).await;
    let response = server
        .request("GET", "/health")
        .header("Host", "evil.test")
        .send()
        .await;
    assert_eq!(response.status, 421);
}

#[tokio::test(flavor = "multi_thread")]
async fn the_health_check_needs_no_token() {
    let server = spawn_test_server(false).await;
    let response = server
        .request("GET", "/health")
        .without_token()
        .send()
        .await;
    assert_eq!(response.status, 200);
}

#[tokio::test(flavor = "multi_thread")]
async fn the_health_check_reports_ok() {
    let server = spawn_test_server(false).await;
    let response = server
        .request("GET", "/health")
        .without_token()
        .send()
        .await;
    assert_eq!(response.json(), serde_json::json!({ "status": "ok" }));
}

#[tokio::test(flavor = "multi_thread")]
async fn a_preflight_request_allows_the_authorization_header() {
    let server = spawn_test_server(false).await;
    let response = server
        .request("OPTIONS", "/projects")
        .without_token()
        .header("Origin", "http://localhost:5173")
        .header("Access-Control-Request-Method", "GET")
        .header("Access-Control-Request-Headers", "authorization")
        .send()
        .await;
    assert_eq!(
        response.header("access-control-allow-headers"),
        Some("authorization")
    );
}

use crate::support::spawn_test_server;
use serde_json::json;

#[tokio::test(flavor = "multi_thread")]
async fn an_unset_preference_is_null() {
    let server = spawn_test_server(false).await;
    let response = server.get("/preferences/theme").await;
    assert_eq!(response.json(), json!({ "value": null }));
}

#[tokio::test(flavor = "multi_thread")]
async fn setting_a_preference_returns_no_content() {
    let server = spawn_test_server(false).await;
    let response = server
        .request("PUT", "/preferences/theme")
        .json(&json!({ "value": "dark" }))
        .send()
        .await;
    assert_eq!(response.status, 204);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_set_preference_is_returned() {
    let server = spawn_test_server(false).await;
    server
        .request("PUT", "/preferences/theme")
        .json(&json!({ "value": "dark" }))
        .send()
        .await;
    let response = server.get("/preferences/theme").await;
    assert_eq!(response.json(), json!({ "value": "dark" }));
}

#[tokio::test(flavor = "multi_thread")]
async fn a_null_value_is_a_bad_request() {
    let server = spawn_test_server(false).await;
    let response = server
        .request("PUT", "/preferences/theme")
        .json(&json!({ "value": null }))
        .send()
        .await;
    assert_eq!(response.status, 400);
}

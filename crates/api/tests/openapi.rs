mod support;

use serde_json::Value;
use support::spawn_test_server;

fn committed_document() -> Value {
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/openapi.json");
    let text = std::fs::read_to_string(path).expect("crates/api/openapi.json should exist");
    serde_json::from_str(&text).expect("the committed document should be JSON")
}

#[tokio::test(flavor = "multi_thread")]
async fn the_served_document_equals_the_committed_file() {
    let server = spawn_test_server(false).await;
    let response = server.get("/openapi.json").await;
    assert_eq!(response.json(), committed_document());
}

#[test]
fn the_built_document_equals_the_committed_file() {
    let built = serde_json::to_value(easyimmerse_api::openapi_document()).unwrap();
    assert_eq!(built, committed_document());
}

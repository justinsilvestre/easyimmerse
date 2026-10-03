use crate::support::{TestServer, fixture_path, read_fixture, spawn_test_server};
use serde_json::json;

async fn import_fixture(server: &TestServer) -> crate::support::TestResponse {
    server
        .post_bytes(
            "/dictionaries",
            "application/zip",
            read_fixture("sample-yomitan.zip"),
        )
        .await
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_a_raw_zip_body_is_created() {
    let server = spawn_test_server(false).await;
    assert_eq!(import_fixture(&server).await.status, 201);
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_a_raw_zip_body_counts_three_entries() {
    let server = spawn_test_server(false).await;
    assert_eq!(import_fixture(&server).await.json()["entry_count"], 3);
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_a_local_archive_works_when_allowed() {
    let server = spawn_test_server(true).await;
    let response = server
        .post_json(
            "/dictionaries/import-local",
            &json!({ "path": fixture_path("sample-yomitan.zip") }),
        )
        .await;
    assert_eq!(response.json()["title"], "Sample Dictionary");
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_a_local_archive_is_refused_when_not_allowed() {
    let server = spawn_test_server(false).await;
    let response = server
        .post_json(
            "/dictionaries/import-local",
            &json!({ "path": fixture_path("sample-yomitan.zip") }),
        )
        .await;
    assert_eq!(response.status, 403);
}

#[tokio::test(flavor = "multi_thread")]
async fn lists_the_imported_dictionary() {
    let server = spawn_test_server(false).await;
    let imported = import_fixture(&server).await.json();
    let response = server.get("/dictionaries").await;
    assert_eq!(response.json()["dictionaries"], json!([imported]));
}

#[tokio::test(flavor = "multi_thread")]
async fn looks_up_the_cat_entry() {
    let server = spawn_test_server(false).await;
    let id = import_fixture(&server).await.json()["id"]
        .as_str()
        .unwrap()
        .to_string();
    let response = server
        .get(&format!("/dictionaries/{id}/lookup?term=%E7%8C%AB"))
        .await;
    assert_eq!(
        response.json()["entries"],
        json!([{ "term": "猫", "reading": "ねこ", "definitions": ["cat"], "tags": ["n"] }])
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn looking_up_an_unknown_dictionary_is_not_found() {
    let server = spawn_test_server(false).await;
    let response = server.get("/dictionaries/missing/lookup?term=x").await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_something_that_is_not_a_zip_is_a_bad_request() {
    let server = spawn_test_server(false).await;
    let response = server
        .post_bytes("/dictionaries", "application/zip", b"nope".to_vec())
        .await;
    assert_eq!(response.status, 400);
}

use serde_json::{Value, json};

use crate::support::{TestResponse, TestServer, fixture_path, read_fixture, spawn_test_server};

async fn import_fixture(server: &TestServer, source_language: &str) -> TestResponse {
    server
        .post_bytes(
            &format!("/dictionaries?source_language={source_language}&target_language=en"),
            "application/zip",
            read_fixture("sample-yomitan.zip"),
        )
        .await
}

async fn import_id(server: &TestServer, source_language: &str) -> String {
    let response = import_fixture(server, source_language).await;
    assert_eq!(response.status, 201, "{}", response.text());
    response.json()["id"].as_str().unwrap().to_owned()
}

fn listed_ids(list: &Value) -> Vec<Value> {
    list["dictionaries"]
        .as_array()
        .unwrap()
        .iter()
        .map(|dictionary| dictionary["id"].clone())
        .collect()
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_a_raw_zip_body_is_created() {
    let server = spawn_test_server(false).await;
    assert_eq!(import_fixture(&server, "ja").await.status, 201);
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_describes_the_dictionary() {
    let server = spawn_test_server(false).await;
    let mut summary = import_fixture(&server, "ja").await.json();
    summary["id"] = Value::Null;
    assert_eq!(
        summary,
        json!({
            "id": null,
            "title": "Sample Dictionary",
            "entry_count": 3,
            "format": "yomitan",
            "source_language": "ja",
            "target_language": "en",
            "is_enabled": true
        })
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_without_languages_names_the_missing_languages() {
    let server = spawn_test_server(false).await;
    let response = server
        .post_bytes(
            "/dictionaries",
            "application/zip",
            read_fixture("sample-yomitan.zip"),
        )
        .await;
    assert_eq!(
        (response.status, response.json()["code"].clone()),
        (400, json!("language_required"))
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_something_that_is_not_a_dictionary_names_the_unsupported_format() {
    let server = spawn_test_server(false).await;
    let response = server
        .post_bytes(
            "/dictionaries?source_language=ja&target_language=en",
            "application/zip",
            read_fixture("sample.epub"),
        )
        .await;
    assert_eq!(
        (response.status, response.json()["code"].clone()),
        (400, json!("unsupported_format"))
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_a_local_archive_works_when_allowed() {
    let server = spawn_test_server(true).await;
    let response = server
        .post_json(
            "/dictionaries/import-local",
            &json!({
                "path": fixture_path("sample-yomitan.zip"),
                "source_language": "ja",
                "target_language": "en"
            }),
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
    let imported = import_fixture(&server, "ja").await.json();
    let response = server.get("/dictionaries").await;
    assert_eq!(response.json()["dictionaries"], json!([imported]));
}

#[tokio::test(flavor = "multi_thread")]
async fn disables_a_dictionary() {
    let server = spawn_test_server(false).await;
    let id = import_id(&server, "ja").await;
    let response = server
        .put_json(
            &format!("/dictionaries/{id}"),
            &json!({ "is_enabled": false }),
        )
        .await;
    assert_eq!(response.json()["is_enabled"], false);
}

#[tokio::test(flavor = "multi_thread")]
async fn moves_a_dictionary_up() {
    let server = spawn_test_server(false).await;
    let first = import_id(&server, "ja").await;
    let second = import_id(&server, "ja").await;
    let response = server
        .post_json(
            &format!("/dictionaries/{second}/move"),
            &json!({ "direction": "up" }),
        )
        .await;
    assert_eq!(
        listed_ids(&response.json()),
        vec![json!(second), json!(first)]
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn deletes_a_dictionary() {
    let server = spawn_test_server(false).await;
    let id = import_id(&server, "ja").await;
    let response = server.delete(&format!("/dictionaries/{id}")).await;
    let listed = server.get("/dictionaries").await.json();
    assert_eq!((response.status, listed_ids(&listed)), (204, vec![]));
}

#[tokio::test(flavor = "multi_thread")]
async fn deleting_an_unknown_dictionary_is_not_found() {
    let server = spawn_test_server(false).await;
    assert_eq!(server.delete("/dictionaries/missing").await.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn looks_up_the_cat_entry() {
    let server = spawn_test_server(false).await;
    let id = import_id(&server, "ja").await;
    let response = server.get("/lookup?language=ja&term=%E7%8C%AB").await;
    assert_eq!(
        response.json(),
        json!({
            "dictionary_count": 1,
            "entries": [{
                "dictionary_id": id,
                "dictionary_title": "Sample Dictionary",
                "entry": { "term": "猫", "reading": "ねこ", "definitions": ["cat"], "tags": ["n"] }
            }]
        })
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn a_language_without_dictionaries_counts_none() {
    let server = spawn_test_server(false).await;
    import_id(&server, "ja").await;
    let response = server.get("/lookup?language=es&term=gato").await;
    assert_eq!(
        response.json(),
        json!({ "dictionary_count": 0, "entries": [] })
    );
}

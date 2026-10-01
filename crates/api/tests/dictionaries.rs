mod support;

use serde_json::json;
use support::{TestServer, fixture_path, id_of, read_fixture, spawn_test_server};

async fn import_fixture(server: &TestServer) -> support::TestResponse {
    import_named_fixture(server, "sample-yomitan.zip").await
}

async fn import_named_fixture(server: &TestServer, name: &str) -> support::TestResponse {
    server
        .post_bytes("/dictionaries", "application/zip", read_fixture(name))
        .await
}

/// Imports both dictionary fixtures and returns the id of the English-German one.
async fn import_both_fixtures(server: &TestServer) -> String {
    import_fixture(server).await;
    id_of(&import_named_fixture(server, "sample-yomitan-en.zip").await)
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

#[tokio::test(flavor = "multi_thread")]
async fn importing_reports_the_languages_the_archive_states() {
    let server = spawn_test_server(false).await;
    let response = import_named_fixture(&server, "sample-yomitan-en.zip").await;
    assert_eq!(response.json()["source_language"], "en");
}

#[tokio::test(flavor = "multi_thread")]
async fn looks_up_a_term_in_every_dictionary_that_has_it() {
    let server = spawn_test_server(false).await;
    let id = import_both_fixtures(&server).await;
    let response = server.get("/dictionaries/lookup?term=cat").await;
    assert_eq!(response.json()["results"][0]["dictionary"]["id"], id);
}

#[tokio::test(flavor = "multi_thread")]
async fn returns_only_the_dictionaries_with_a_match() {
    let server = spawn_test_server(false).await;
    import_both_fixtures(&server).await;
    let response = server.get("/dictionaries/lookup?term=cat").await;
    assert_eq!(response.json()["results"].as_array().unwrap().len(), 1);
}

#[tokio::test(flavor = "multi_thread")]
async fn returns_the_matching_entries_with_their_dictionary() {
    let server = spawn_test_server(false).await;
    import_both_fixtures(&server).await;
    let response = server.get("/dictionaries/lookup?term=cat").await;
    assert_eq!(
        response.json()["results"][0]["entries"],
        json!([{ "term": "cat", "reading": null, "definitions": ["Katze"], "tags": ["n"] }])
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn sets_the_languages_of_a_dictionary() {
    let server = spawn_test_server(false).await;
    let id = id_of(&import_fixture(&server).await);
    let response = server
        .put_json(
            &format!("/dictionaries/{id}/languages"),
            &json!({ "source_language": "ja", "target_language": "en" }),
        )
        .await;
    assert_eq!(response.json()["source_language"], "ja");
}

#[tokio::test(flavor = "multi_thread")]
async fn setting_the_languages_of_an_unknown_dictionary_is_not_found() {
    let server = spawn_test_server(false).await;
    let response = server
        .put_json(
            "/dictionaries/missing/languages",
            &json!({ "source_language": null, "target_language": null }),
        )
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn deleting_a_dictionary_has_no_content() {
    let server = spawn_test_server(false).await;
    let id = id_of(&import_fixture(&server).await);
    let response = server.delete(&format!("/dictionaries/{id}")).await;
    assert_eq!(response.status, 204);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_deleted_dictionary_is_no_longer_listed() {
    let server = spawn_test_server(false).await;
    let id = id_of(&import_fixture(&server).await);
    server.delete(&format!("/dictionaries/{id}")).await;
    let response = server.get("/dictionaries").await;
    assert_eq!(response.json()["dictionaries"], json!([]));
}

#[tokio::test(flavor = "multi_thread")]
async fn deleting_an_unknown_dictionary_is_not_found() {
    let server = spawn_test_server(false).await;
    assert_eq!(server.delete("/dictionaries/missing").await.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn looks_up_a_structured_content_entry_with_its_glossary_intact() {
    let server = spawn_test_server(false).await;
    let id = id_of(&import_named_fixture(&server, "sample-yomitan-structured.zip").await);
    let response = server
        .get(&format!("/dictionaries/{id}/lookup?term=%E7%8C%AB"))
        .await;
    assert_eq!(
        response.json()["entries"][0]["definitions"],
        json!([{
            "type": "structured-content",
            "content": [
                { "tag": "span", "data": { "content": "part-of-speech-info" }, "title": "noun", "content": "n" },
                { "tag": "ul", "data": { "content": "glossary" }, "content": { "tag": "li", "content": "cat" } },
                { "tag": "img", "path": "img/cat.svg", "width": 1.0, "height": 1.0, "sizeUnits": "em", "alt": "a cat" }
            ]
        }])
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn looks_up_a_deinflection_entry() {
    let server = spawn_test_server(false).await;
    let id = id_of(&import_named_fixture(&server, "sample-yomitan-structured.zip").await);
    let response = server
        .get(&format!(
            "/dictionaries/{id}/lookup?term=%E9%A3%9F%E3%81%B9%E3%81%9F"
        ))
        .await;
    assert_eq!(
        response.json()["entries"][0]["definitions"],
        json!([["食べる", ["past"]]])
    );
}

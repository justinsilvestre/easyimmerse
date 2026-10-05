use crate::support::{TestResponse, TestServer, fixture_path, read_fixture, spawn_test_server};
use serde_json::{Value, json};

async fn import_fixture(server: &TestServer) -> TestResponse {
    server
        .post_bytes(
            "/dictionaries?fileName=sample-yomitan.zip",
            "application/octet-stream",
            read_fixture("sample-yomitan.zip"),
        )
        .await
}

async fn imported_id(server: &TestServer) -> String {
    import_fixture(server).await.json()["id"]
        .as_str()
        .unwrap()
        .to_string()
}

async fn import_local(server: &TestServer, path: &str) -> TestResponse {
    server
        .post_json("/dictionaries/import-local", &json!({ "path": path }))
        .await
}

/// Writes an unpacked Yomitan dictionary with one entry into a new directory.
fn unpacked_dictionary() -> tempfile::TempDir {
    let directory = tempfile::tempdir().unwrap();
    let index = r#"{"title":"Birds","format":3,"revision":"1"}"#;
    let bank = r#"[["鳥","とり","n","",0,["bird"],1,""]]"#;
    std::fs::write(directory.path().join("index.json"), index).unwrap();
    std::fs::write(directory.path().join("term_bank_1.json"), bank).unwrap();
    directory
}

async fn look_up(server: &TestServer, text: &str) -> Value {
    let query = format!("text={}&language=ja", percent_encode(text));
    server
        .get(&format!("/dictionaries/lookup?{query}"))
        .await
        .json()
}

fn percent_encode(text: &str) -> String {
    text.bytes().map(|byte| format!("%{byte:02X}")).collect()
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_a_file_body_is_created() {
    let server = spawn_test_server(false).await;
    assert_eq!(import_fixture(&server).await.status, 201);
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_a_file_body_reports_its_format() {
    let server = spawn_test_server(false).await;
    assert_eq!(import_fixture(&server).await.json()["format"], "yomitan");
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_a_file_body_without_its_name_is_a_bad_request() {
    let server = spawn_test_server(false).await;
    let response = server
        .post_bytes(
            "/dictionaries",
            "application/octet-stream",
            read_fixture("sample-yomitan.zip"),
        )
        .await;
    assert_eq!(response.status, 400);
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_something_that_is_not_a_dictionary_is_a_bad_request() {
    let server = spawn_test_server(false).await;
    let response = server
        .post_bytes(
            "/dictionaries?fileName=notes.txt",
            "application/octet-stream",
            b"nope".to_vec(),
        )
        .await;
    assert_eq!(response.status, 400);
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_a_local_archive_works_when_allowed() {
    let server = spawn_test_server(true).await;
    let path = fixture_path("sample-yomitan.zip");
    let response = import_local(&server, path.to_str().unwrap()).await;
    assert_eq!(response.json()["title"], "Sample Dictionary");
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_a_local_archive_is_refused_when_not_allowed() {
    let server = spawn_test_server(false).await;
    let path = fixture_path("sample-yomitan.zip");
    let response = import_local(&server, path.to_str().unwrap()).await;
    assert_eq!(response.status, 403);
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_a_local_directory_reads_every_file_in_it() {
    let server = spawn_test_server(true).await;
    let directory = unpacked_dictionary();
    let response = import_local(&server, directory.path().to_str().unwrap()).await;
    assert_eq!(response.json()["entry_count"], 1);
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_a_missing_local_path_is_not_found() {
    let server = spawn_test_server(true).await;
    let response = import_local(&server, "/no/such/dictionary.ifo").await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn lists_the_imported_dictionary() {
    let server = spawn_test_server(false).await;
    let imported = import_fixture(&server).await.json();
    let response = server.get("/dictionaries").await;
    assert_eq!(response.json()["dictionaries"], json!([imported]));
}

#[tokio::test(flavor = "multi_thread")]
async fn looks_up_the_term_at_the_start_of_the_text() {
    let server = spawn_test_server(false).await;
    import_fixture(&server).await;
    let response = look_up(&server, "猫が好き").await;
    assert_eq!(response["results"][0]["term"], "猫");
}

#[tokio::test(flavor = "multi_thread")]
async fn looks_up_the_definitions_of_the_term() {
    let server = spawn_test_server(false).await;
    import_fixture(&server).await;
    let response = look_up(&server, "猫").await;
    assert_eq!(
        response["results"][0]["definitions"][0]["entry"]["definitions"][0],
        json!({ "kind": "text", "text": "cat" })
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn looks_up_a_term_by_its_reading() {
    let server = spawn_test_server(false).await;
    import_fixture(&server).await;
    let response = look_up(&server, "たべる").await;
    assert_eq!(response["results"][0]["term"], "食べる");
}

#[tokio::test(flavor = "multi_thread")]
async fn looks_up_a_term_in_every_dictionary() {
    let server = spawn_test_server(false).await;
    import_fixture(&server).await;
    import_fixture(&server).await;
    let response = look_up(&server, "猫").await;
    let definitions = response["results"][0]["definitions"].as_array().unwrap();
    assert_eq!(definitions.len(), 2);
}

#[tokio::test(flavor = "multi_thread")]
async fn looks_up_the_stylesheet_of_a_dictionary_that_defines_the_term() {
    let server = spawn_test_server(false).await;
    let id = imported_id(&server).await;
    let response = look_up(&server, "猫").await;
    assert_eq!(response["stylesheets"][0]["dictionaryId"], id);
}

#[tokio::test(flavor = "multi_thread")]
async fn lists_each_stylesheet_once_however_many_results_it_styles() {
    let server = spawn_test_server(false).await;
    import_fixture(&server).await;
    let response = look_up(&server, "食べた").await;
    assert_eq!(response["stylesheets"].as_array().unwrap().len(), 1);
}

#[tokio::test(flavor = "multi_thread")]
async fn finds_nothing_for_an_unknown_term() {
    let server = spawn_test_server(false).await;
    import_fixture(&server).await;
    let response = look_up(&server, "鳥").await;
    assert_eq!(response["results"], json!([]));
}

#[tokio::test(flavor = "multi_thread")]
async fn finds_no_kanji_for_text_that_starts_with_kana() {
    let server = spawn_test_server(false).await;
    import_fixture(&server).await;
    let response = look_up(&server, "ねこ").await;
    assert_eq!(response["kanji"], json!([]));
}

#[tokio::test(flavor = "multi_thread")]
async fn deleting_a_dictionary_is_no_content() {
    let server = spawn_test_server(false).await;
    let id = imported_id(&server).await;
    let response = server.delete(&format!("/dictionaries/{id}")).await;
    assert_eq!(response.status, 204);
}

#[tokio::test(flavor = "multi_thread")]
async fn deleting_a_dictionary_removes_its_entries_from_lookup() {
    let server = spawn_test_server(false).await;
    let id = imported_id(&server).await;
    server.delete(&format!("/dictionaries/{id}")).await;
    let response = look_up(&server, "猫").await;
    assert_eq!(response["results"], json!([]));
}

#[tokio::test(flavor = "multi_thread")]
async fn deleting_an_unknown_dictionary_is_not_found() {
    let server = spawn_test_server(false).await;
    let response = server.delete("/dictionaries/missing").await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_missing_media_file_is_not_found() {
    let server = spawn_test_server(false).await;
    let id = imported_id(&server).await;
    let response = server
        .get(&format!("/dictionaries/{id}/media/img%2Fmissing.png"))
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn the_media_route_accepts_the_token_in_the_query() {
    let server = spawn_test_server(false).await;
    let id = imported_id(&server).await;
    let path = format!(
        "/dictionaries/{id}/media/missing.png?token={}",
        server.token
    );
    let response = server.request("GET", &path).without_token().send().await;
    assert_eq!(response.status, 404);
}

/// Fonts that a dictionary's stylesheet declares load in CORS mode, so a page on another origin
/// can use them only when the media response allows that origin.
#[tokio::test(flavor = "multi_thread")]
async fn the_media_route_allows_requests_from_other_origins() {
    let server = spawn_test_server(false).await;
    let id = imported_id(&server).await;
    let path = format!(
        "/dictionaries/{id}/media/images%2Fcat.png?token={}",
        server.token
    );
    let response = server
        .request("GET", &path)
        .without_token()
        .header("Origin", "http://localhost:5173")
        .send()
        .await;
    assert_eq!(response.header("access-control-allow-origin"), Some("*"));
}

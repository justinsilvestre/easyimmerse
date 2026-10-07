use std::time::Duration;

use crate::support::{TestResponse, TestServer, fixture_path, read_fixture, spawn_test_server};
use serde_json::{Value, json};

async fn start_fixture_import(server: &TestServer) -> TestResponse {
    server
        .post_bytes(
            "/dictionaries?fileName=sample-yomitan.zip",
            "application/octet-stream",
            read_fixture("sample-yomitan.zip"),
        )
        .await
}

/// Polls the job that `started` answered with until it is done or has failed, and returns its last status.
async fn finished(server: &TestServer, started: TestResponse) -> Value {
    let id = started.json()["id"].as_str().unwrap().to_string();
    loop {
        let status = job_status(server, &id).await.json();
        if status["state"] != "running" {
            return status;
        }
        tokio::time::sleep(Duration::from_millis(10)).await;
    }
}

async fn job_status(server: &TestServer, id: &str) -> TestResponse {
    server.get(&format!("/dictionaries/imports/{id}")).await
}

/// Imports the fixture and returns the stored dictionary.
async fn import_fixture(server: &TestServer) -> Value {
    let started = start_fixture_import(server).await;
    finished(server, started).await["dictionary"].clone()
}

async fn imported_id(server: &TestServer) -> String {
    import_fixture(server).await["id"]
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
async fn importing_a_file_body_is_accepted() {
    let server = spawn_test_server(false).await;
    assert_eq!(start_fixture_import(&server).await.status, 202);
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_a_file_body_starts_a_running_job() {
    let server = spawn_test_server(false).await;
    let id = start_fixture_import(&server).await.json()["id"].clone();
    let status = job_status(&server, id.as_str().unwrap()).await.json();
    assert!(["running", "done"].contains(&status["state"].as_str().unwrap()));
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_a_file_body_reports_its_format() {
    let server = spawn_test_server(false).await;
    assert_eq!(import_fixture(&server).await["format"], "yomitan");
}

#[tokio::test(flavor = "multi_thread")]
async fn a_finished_import_counts_what_it_stored() {
    let server = spawn_test_server(false).await;
    let started = start_fixture_import(&server).await;
    let status = finished(&server, started).await;
    assert_eq!(
        status["progress"]["entries"],
        status["dictionary"]["entry_count"]
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn a_finished_import_has_counted_something() {
    let server = spawn_test_server(false).await;
    let started = start_fixture_import(&server).await;
    let status = finished(&server, started).await;
    assert!(status["progress"]["entries"].as_u64().unwrap() > 0);
}

#[tokio::test(flavor = "multi_thread")]
async fn an_unknown_import_job_is_not_found() {
    let server = spawn_test_server(false).await;
    assert_eq!(job_status(&server, "missing").await.status, 404);
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
async fn importing_something_that_is_not_a_dictionary_fails_the_job() {
    let server = spawn_test_server(false).await;
    let started = server
        .post_bytes(
            "/dictionaries?fileName=notes.txt",
            "application/octet-stream",
            b"nope".to_vec(),
        )
        .await;
    assert_eq!(finished(&server, started).await["state"], "failed");
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_a_file_in_an_unsupported_format_says_so() {
    let server = spawn_test_server(false).await;
    let started = server
        .post_bytes(
            "/dictionaries?fileName=duden.lsd",
            "application/octet-stream",
            b"nope".to_vec(),
        )
        .await;
    assert_eq!(
        finished(&server, started).await["error"]["code"],
        "unsupported_dictionary_format"
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_a_file_body_reports_its_languages() {
    let server = spawn_test_server(false).await;
    let summary = import_fixture(&server).await;
    assert_eq!(
        [&summary["source_language"], &summary["target_language"]],
        [&json!("ja"), &json!("en")]
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_a_local_archive_works_when_allowed() {
    let server = spawn_test_server(true).await;
    let path = fixture_path("sample-yomitan.zip");
    let started = import_local(&server, path.to_str().unwrap()).await;
    assert_eq!(
        finished(&server, started).await["dictionary"]["title"],
        "Sample Dictionary"
    );
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
    let started = import_local(&server, directory.path().to_str().unwrap()).await;
    assert_eq!(
        finished(&server, started).await["dictionary"]["entry_count"],
        1
    );
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
    let imported = import_fixture(&server).await;
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

const GERMAN_TABLE: &[u8] = "Wort;Bedeutung\nHund;dog\nKatze;cat\n".as_bytes();

async fn import_table(server: &TestServer, query: &str) -> TestResponse {
    server
        .post_bytes(
            &format!("/dictionaries?fileName=words.csv{query}"),
            "application/octet-stream",
            GERMAN_TABLE.to_vec(),
        )
        .await
}

#[tokio::test(flavor = "multi_thread")]
async fn previewing_a_table_returns_its_detected_columns() {
    let server = spawn_test_server(false).await;
    let response = server
        .post_bytes(
            "/dictionaries/preview?fileName=words.csv",
            "application/octet-stream",
            GERMAN_TABLE.to_vec(),
        )
        .await;
    assert_eq!(
        response.json()["layout"],
        json!({ "columns": ["term", "definition"], "hasHeader": false })
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn previewing_something_that_is_not_a_table_is_a_bad_request() {
    let server = spawn_test_server(false).await;
    let response = server
        .post_bytes(
            "/dictionaries/preview?fileName=notes.ifo",
            "application/octet-stream",
            b"nope".to_vec(),
        )
        .await;
    assert_eq!(response.status, 400);
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_a_table_with_chosen_columns_skips_the_header_the_user_marks() {
    let server = spawn_test_server(false).await;
    let started = import_table(&server, "&columns=term,definition&hasHeader=true").await;
    assert_eq!(
        finished(&server, started).await["dictionary"]["entry_count"],
        2
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_a_table_with_an_unknown_column_role_is_a_bad_request() {
    let server = spawn_test_server(false).await;
    let response = import_table(&server, "&columns=term,meaning").await;
    assert_eq!(response.status, 400);
}

#[tokio::test(flavor = "multi_thread")]
async fn looking_up_a_verb_in_context_finds_its_separated_particle_verb() {
    let server = spawn_test_server(false).await;
    let started = server
        .post_bytes(
            "/dictionaries?fileName=verbs.csv",
            "application/octet-stream",
            b"anrufen,to call\nrufen,to shout\n".to_vec(),
        )
        .await;
    finished(&server, started).await;
    let context = "Ich rufe dich an.";
    let query = format!(
        "text={}&language=de&context={}&offset=4",
        percent_encode("rufe dich an."),
        percent_encode(context)
    );
    let response = server
        .get(&format!("/dictionaries/lookup?{query}"))
        .await
        .json();
    assert_eq!(response["results"][0]["term"], "anrufen");
}

/// Writes the German table into a new directory, as `words.csv`.
fn local_table() -> tempfile::TempDir {
    let directory = tempfile::tempdir().unwrap();
    std::fs::write(directory.path().join("words.csv"), GERMAN_TABLE).unwrap();
    directory
}

async fn preview_local(server: &TestServer, path: &str) -> TestResponse {
    server
        .post_json("/dictionaries/preview-local", &json!({ "path": path }))
        .await
}

#[tokio::test(flavor = "multi_thread")]
async fn previewing_a_local_table_returns_its_detected_columns() {
    let server = spawn_test_server(true).await;
    let directory = local_table();
    let path = directory.path().join("words.csv");
    let response = preview_local(&server, path.to_str().unwrap()).await;
    assert_eq!(
        response.json()["layout"],
        json!({ "columns": ["term", "definition"], "hasHeader": false })
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn previewing_a_local_table_is_refused_when_not_allowed() {
    let server = spawn_test_server(false).await;
    let directory = local_table();
    let path = directory.path().join("words.csv");
    let response = preview_local(&server, path.to_str().unwrap()).await;
    assert_eq!(response.status, 403);
}

#[tokio::test(flavor = "multi_thread")]
async fn previewing_a_missing_local_table_is_not_found() {
    let server = spawn_test_server(true).await;
    let response = preview_local(&server, "/no/such/words.csv").await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_a_local_table_with_chosen_columns_skips_the_header_the_user_marks() {
    let server = spawn_test_server(true).await;
    let directory = local_table();
    let path = directory.path().join("words.csv");
    let started = server
        .post_json(
            "/dictionaries/import-local",
            &json!({
                "path": path.to_str().unwrap(),
                "tableLayout": { "columns": ["term", "definition"], "hasHeader": true },
            }),
        )
        .await;
    assert_eq!(
        finished(&server, started).await["dictionary"]["entry_count"],
        2
    );
}

/// Writes two tables that share a stem: `words.csv` with two columns and `words.txt` with three.
fn tables_sharing_a_stem() -> tempfile::TempDir {
    let directory = tempfile::tempdir().unwrap();
    std::fs::write(directory.path().join("words.csv"), GERMAN_TABLE).unwrap();
    std::fs::write(
        directory.path().join("words.txt"),
        "Hund\thʊnt\tdog\nKatze\tˈkatsə\tcat\nMaus\tmaʊs\tmouse\n",
    )
    .unwrap();
    directory
}

#[tokio::test(flavor = "multi_thread")]
async fn previewing_a_local_table_previews_the_picked_file_and_not_a_sibling() {
    let server = spawn_test_server(true).await;
    let directory = tables_sharing_a_stem();
    let path = directory.path().join("words.txt");
    let response = preview_local(&server, path.to_str().unwrap()).await;
    assert_eq!(response.json()["rows"][0][0], "Hund");
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_a_local_table_with_chosen_columns_imports_the_picked_file_and_not_a_sibling() {
    let server = spawn_test_server(true).await;
    let directory = tables_sharing_a_stem();
    let path = directory.path().join("words.txt");
    let started = server
        .post_json(
            "/dictionaries/import-local",
            &json!({
                "path": path.to_str().unwrap(),
                "tableLayout": { "columns": ["term", "reading", "definition"], "hasHeader": false },
            }),
        )
        .await;
    assert_eq!(
        finished(&server, started).await["dictionary"]["entry_count"],
        3
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn importing_a_local_table_without_chosen_columns_imports_the_picked_file_and_not_a_sibling()
{
    let server = spawn_test_server(true).await;
    let directory = tables_sharing_a_stem();
    let path = directory.path().join("words.txt");
    let started = import_local(&server, path.to_str().unwrap()).await;
    finished(&server, started).await;
    let response = server
        .get("/dictionaries/lookup?text=Maus&language=de")
        .await;
    assert_eq!(response.json()["results"][0]["term"], "Maus");
}

#[tokio::test(flavor = "multi_thread")]
async fn previewing_a_local_directory_named_like_a_table_reads_the_table_inside_it() {
    let server = spawn_test_server(true).await;
    let directory = tempfile::tempdir().unwrap();
    let named_like_a_table = directory.path().join("words.txt");
    std::fs::create_dir(&named_like_a_table).unwrap();
    std::fs::write(named_like_a_table.join("words.csv"), GERMAN_TABLE).unwrap();
    let response = preview_local(&server, named_like_a_table.to_str().unwrap()).await;
    assert_eq!(
        response.json()["layout"],
        json!({ "columns": ["term", "definition"], "hasHeader": false })
    );
}

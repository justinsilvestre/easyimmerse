mod support;

use support::{TOKEN, TestServer, id_of, read_fixture, spawn_test_server};

/// Imports the structured fixture and returns its id.
async fn import_structured(server: &TestServer) -> String {
    import(server, "sample-yomitan-structured.zip").await
}

async fn import(server: &TestServer, name: &str) -> String {
    let response = server
        .post_bytes("/dictionaries", "application/zip", read_fixture(name))
        .await;
    id_of(&response)
}

async fn get_image(server: &TestServer, id: &str) -> support::TestResponse {
    server
        .get(&format!("/dictionaries/{id}/asset?path=img%2Fcat.svg"))
        .await
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_the_bytes_of_an_image() {
    let server = spawn_test_server(false).await;
    let id = import_structured(&server).await;
    assert!(get_image(&server, &id).await.bytes.starts_with(b"<svg"));
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_an_image_with_its_content_type() {
    let server = spawn_test_server(false).await;
    let id = import_structured(&server).await;
    assert_eq!(
        get_image(&server, &id).await.header("content-type"),
        Some("image/svg+xml")
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_an_image_with_a_policy_that_blocks_scripts() {
    let server = spawn_test_server(false).await;
    let id = import_structured(&server).await;
    let response = get_image(&server, &id).await;
    assert!(
        response
            .header("content-security-policy")
            .unwrap()
            .contains("sandbox")
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_an_image_to_a_token_in_the_query() {
    let server = spawn_test_server(false).await;
    let id = import_structured(&server).await;
    let response = server
        .request(
            "GET",
            &format!("/dictionaries/{id}/asset?path=img%2Fcat.svg&token={TOKEN}"),
        )
        .without_token()
        .send()
        .await;
    assert_eq!(response.status, 200);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_path_the_archive_lacks_is_not_found() {
    let server = spawn_test_server(false).await;
    let id = import_structured(&server).await;
    let response = server
        .get(&format!("/dictionaries/{id}/asset?path=img%2Fdog.svg"))
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn an_asset_of_an_unknown_dictionary_is_not_found() {
    let server = spawn_test_server(false).await;
    let response = server.get("/dictionaries/missing/asset?path=a.svg").await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_the_stylesheet() {
    let server = spawn_test_server(false).await;
    let id = import_structured(&server).await;
    let response = server.get(&format!("/dictionaries/{id}/stylesheet")).await;
    assert!(
        String::from_utf8(response.bytes)
            .unwrap()
            .contains("part-of-speech-info")
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_the_stylesheet_as_css() {
    let server = spawn_test_server(false).await;
    let id = import_structured(&server).await;
    let response = server.get(&format!("/dictionaries/{id}/stylesheet")).await;
    assert_eq!(
        response.header("content-type"),
        Some("text/css; charset=utf-8")
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn serves_an_empty_stylesheet_for_a_dictionary_without_one() {
    let server = spawn_test_server(false).await;
    let id = import(&server, "sample-yomitan.zip").await;
    let response = server.get(&format!("/dictionaries/{id}/stylesheet")).await;
    assert!(response.bytes.is_empty());
}

#[tokio::test(flavor = "multi_thread")]
async fn the_stylesheet_of_an_unknown_dictionary_is_not_found() {
    let server = spawn_test_server(false).await;
    let response = server.get("/dictionaries/missing/stylesheet").await;
    assert_eq!(response.status, 404);
}

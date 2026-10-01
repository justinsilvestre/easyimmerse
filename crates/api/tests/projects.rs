mod support;

use serde_json::json;
use support::{project_settings, spawn_test_server};

#[tokio::test(flavor = "multi_thread")]
async fn lists_the_two_seeded_projects() {
    let server = spawn_test_server(false).await;
    let response = server.get("/projects").await;
    assert_eq!(response.json()["projects"].as_array().unwrap().len(), 2);
}

#[tokio::test(flavor = "multi_thread")]
async fn lists_the_most_recently_opened_project_first() {
    let server = spawn_test_server(false).await;
    let response = server.get("/projects").await;
    assert_eq!(response.json()["projects"][0]["name"], "Japanese drama");
}

#[tokio::test(flavor = "multi_thread")]
async fn creating_a_project_is_created() {
    let server = spawn_test_server(false).await;
    let response = server
        .post_json("/projects", &project_settings("Krimi"))
        .await;
    assert_eq!(response.status, 201);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_created_project_keeps_its_settings() {
    let server = spawn_test_server(false).await;
    let response = server
        .post_json("/projects", &project_settings("Krimi"))
        .await;
    assert_eq!(response.json()["settings"], project_settings("Krimi"));
}

#[tokio::test(flavor = "multi_thread")]
async fn a_created_project_is_listed() {
    let server = spawn_test_server(false).await;
    server.create_project().await;
    let response = server.get("/projects").await;
    assert_eq!(response.json()["projects"].as_array().unwrap().len(), 3);
}

#[tokio::test(flavor = "multi_thread")]
async fn gets_a_created_project_with_no_media() {
    let server = spawn_test_server(false).await;
    let id = server.create_project().await;
    let response = server.get(&format!("/projects/{id}")).await;
    assert_eq!(response.json()["media"], json!([]));
}

#[tokio::test(flavor = "multi_thread")]
async fn getting_an_unknown_project_is_not_found() {
    let server = spawn_test_server(false).await;
    assert_eq!(server.get("/projects/missing").await.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn updates_the_settings_of_a_project() {
    let server = spawn_test_server(false).await;
    let id = server.create_project().await;
    let response = server
        .put_json(
            &format!("/projects/{id}/settings"),
            &project_settings("Tatort"),
        )
        .await;
    assert_eq!(response.json()["settings"]["name"], "Tatort");
}

#[tokio::test(flavor = "multi_thread")]
async fn updating_an_unknown_project_is_not_found() {
    let server = spawn_test_server(false).await;
    let response = server
        .put_json("/projects/missing/settings", &project_settings("Tatort"))
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn an_opened_project_is_listed_first() {
    let server = spawn_test_server(false).await;
    server
        .post_json("/projects/placeholder-1/opened", &json!(null))
        .await;
    let response = server.get("/projects").await;
    assert_eq!(response.json()["projects"][0]["id"], "placeholder-1");
}

#[tokio::test(flavor = "multi_thread")]
async fn opening_an_unknown_project_is_not_found() {
    let server = spawn_test_server(false).await;
    let response = server
        .post_json("/projects/missing/opened", &json!(null))
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn deleting_a_project_has_no_content() {
    let server = spawn_test_server(false).await;
    let id = server.create_project().await;
    assert_eq!(server.delete(&format!("/projects/{id}")).await.status, 204);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_deleted_project_is_not_found() {
    let server = spawn_test_server(false).await;
    let id = server.create_project().await;
    server.delete(&format!("/projects/{id}")).await;
    assert_eq!(server.get(&format!("/projects/{id}")).await.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn deleting_an_unknown_project_is_not_found() {
    let server = spawn_test_server(false).await;
    assert_eq!(server.delete("/projects/missing").await.status, 404);
}

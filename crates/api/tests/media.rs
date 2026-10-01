mod support;

use serde_json::{Value, json};
use support::{TestServer, browser_source, id_of, path_source, spawn_test_server};

fn embedded_track() -> Value {
    json!({
        "name": "English",
        "role": "target",
        "language": "en",
        "source": { "kind": "embedded", "track_id": 3 }
    })
}

/// Creates a project with one media file and returns both ids.
async fn project_with_media(server: &TestServer) -> (String, String) {
    let project_id = server.create_project().await;
    let media_id = server
        .add_media(&project_id, "sample.mp4", path_source("sample.mp4"))
        .await;
    (project_id, media_id)
}

async fn add_track(server: &TestServer, project_id: &str, media_id: &str) -> support::TestResponse {
    server
        .post_json(
            &format!("/projects/{project_id}/media/{media_id}/subtitle-tracks"),
            &embedded_track(),
        )
        .await
}

#[tokio::test(flavor = "multi_thread")]
async fn adding_a_media_file_is_created() {
    let server = spawn_test_server(false).await;
    let project_id = server.create_project().await;
    let body = json!({ "name": "a.mp4", "kind": "video", "source": browser_source() });
    let response = server
        .post_json(&format!("/projects/{project_id}/media"), &body)
        .await;
    assert_eq!(response.status, 201);
}

#[tokio::test(flavor = "multi_thread")]
async fn an_added_media_file_appears_in_the_project() {
    let server = spawn_test_server(false).await;
    let (project_id, media_id) = project_with_media(&server).await;
    let project = server.get(&format!("/projects/{project_id}")).await.json();
    assert_eq!(project["media"][0]["id"], media_id);
}

#[tokio::test(flavor = "multi_thread")]
async fn adding_media_to_an_unknown_project_is_not_found() {
    let server = spawn_test_server(false).await;
    let body = json!({ "name": "a.mp4", "kind": "video", "source": browser_source() });
    let response = server.post_json("/projects/missing/media", &body).await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn sets_the_duration_of_a_media_file() {
    let server = spawn_test_server(false).await;
    let (project_id, media_id) = project_with_media(&server).await;
    let response = server
        .put_json(
            &format!("/projects/{project_id}/media/{media_id}/duration"),
            &json!({ "duration_ms": 5000 }),
        )
        .await;
    assert_eq!(response.json()["duration_ms"], 5000);
}

#[tokio::test(flavor = "multi_thread")]
async fn setting_the_duration_of_unknown_media_is_not_found() {
    let server = spawn_test_server(false).await;
    let project_id = server.create_project().await;
    let response = server
        .put_json(
            &format!("/projects/{project_id}/media/missing/duration"),
            &json!({ "duration_ms": 5000 }),
        )
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn removing_a_media_file_has_no_content() {
    let server = spawn_test_server(false).await;
    let (project_id, media_id) = project_with_media(&server).await;
    let response = server
        .delete(&format!("/projects/{project_id}/media/{media_id}"))
        .await;
    assert_eq!(response.status, 204);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_removed_media_file_leaves_the_project() {
    let server = spawn_test_server(false).await;
    let (project_id, media_id) = project_with_media(&server).await;
    server
        .delete(&format!("/projects/{project_id}/media/{media_id}"))
        .await;
    let project = server.get(&format!("/projects/{project_id}")).await.json();
    assert_eq!(project["media"], json!([]));
}

#[tokio::test(flavor = "multi_thread")]
async fn removing_unknown_media_is_not_found() {
    let server = spawn_test_server(false).await;
    let project_id = server.create_project().await;
    let response = server
        .delete(&format!("/projects/{project_id}/media/missing"))
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn adding_a_subtitle_track_is_created() {
    let server = spawn_test_server(false).await;
    let (project_id, media_id) = project_with_media(&server).await;
    let response = add_track(&server, &project_id, &media_id).await;
    assert_eq!(response.status, 201);
}

#[tokio::test(flavor = "multi_thread")]
async fn an_added_subtitle_track_appears_on_the_media_file() {
    let server = spawn_test_server(false).await;
    let (project_id, media_id) = project_with_media(&server).await;
    let track_id = id_of(&add_track(&server, &project_id, &media_id).await);
    let project = server.get(&format!("/projects/{project_id}")).await.json();
    assert_eq!(project["media"][0]["subtitle_tracks"][0]["id"], track_id);
}

#[tokio::test(flavor = "multi_thread")]
async fn adding_a_subtitle_track_to_unknown_media_is_not_found() {
    let server = spawn_test_server(false).await;
    let project_id = server.create_project().await;
    let response = add_track(&server, &project_id, "missing").await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn removing_a_subtitle_track_has_no_content() {
    let server = spawn_test_server(false).await;
    let (project_id, media_id) = project_with_media(&server).await;
    let track_id = id_of(&add_track(&server, &project_id, &media_id).await);
    let response = server
        .delete(&format!(
            "/projects/{project_id}/media/{media_id}/subtitle-tracks/{track_id}"
        ))
        .await;
    assert_eq!(response.status, 204);
}

#[tokio::test(flavor = "multi_thread")]
async fn removing_an_unknown_subtitle_track_is_not_found() {
    let server = spawn_test_server(false).await;
    let (project_id, media_id) = project_with_media(&server).await;
    let response = server
        .delete(&format!(
            "/projects/{project_id}/media/{media_id}/subtitle-tracks/missing"
        ))
        .await;
    assert_eq!(response.status, 404);
}

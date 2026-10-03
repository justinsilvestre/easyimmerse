use crate::support::spawn_test_server;

#[tokio::test(flavor = "multi_thread")]
async fn lists_the_two_seeded_projects() {
    let server = spawn_test_server(false).await;
    let response = server.get("/projects").await;
    assert_eq!(response.json()["projects"].as_array().unwrap().len(), 2);
}

#[tokio::test(flavor = "multi_thread")]
async fn lists_the_oldest_project_first() {
    let server = spawn_test_server(false).await;
    let response = server.get("/projects").await;
    assert_eq!(response.json()["projects"][0]["name"], "Spanish practice");
}

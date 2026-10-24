//! Account management through the administrator routes.

use serde_json::{Value, json};

use crate::support::{TestResponse, TestServer, spawn_test_server_with_accounts};

const PASSWORD: &str = "correct horse";

/// Creates an account with the launch token and returns it.
async fn create_user(server: &TestServer, email: &str, role: &str) -> Value {
    let body = json!({ "email": email, "password": PASSWORD, "role": role });
    server.post_json("/users", &body).await.json()
}

/// Creates an account with the role and returns the token of a session of it.
async fn token_of_new_user(server: &TestServer, email: &str, role: &str) -> String {
    create_user(server, email, role).await;
    let body = json!({ "email": email, "password": PASSWORD });
    let session = server
        .request("POST", "/auth/login")
        .without_token()
        .json(&body)
        .send()
        .await
        .json();
    session["token"]
        .as_str()
        .expect("a session token")
        .to_string()
}

/// Creates accounts whose email addresses are `user0@example.com` and so on, in that order.
async fn create_users(server: &TestServer, count: usize) {
    for index in 0..count {
        create_user(server, &format!("user{index}@example.com"), "library_user").await;
    }
}

fn emails_of(page: &Value) -> Vec<&str> {
    page["users"]
        .as_array()
        .unwrap()
        .iter()
        .map(|user| user["email"].as_str().unwrap())
        .collect()
}

async fn list_users_as(server: &TestServer, token: &str) -> TestResponse {
    server
        .request("GET", "/users")
        .with_token(token)
        .send()
        .await
}

#[tokio::test(flavor = "multi_thread")]
async fn the_launch_token_creates_an_account_with_the_given_role() {
    let server = spawn_test_server_with_accounts(false).await;
    let user = create_user(&server, "admin@example.com", "administrator").await;
    assert_eq!(user["role"], "administrator");
}

#[tokio::test(flavor = "multi_thread")]
async fn creating_an_account_answers_created() {
    let server = spawn_test_server_with_accounts(false).await;
    let body =
        json!({ "email": "admin@example.com", "password": PASSWORD, "role": "administrator" });
    let response = server.post_json("/users", &body).await;
    assert_eq!(response.status, 201);
}

#[tokio::test(flavor = "multi_thread")]
async fn creating_an_account_with_a_taken_email_conflicts() {
    let server = spawn_test_server_with_accounts(false).await;
    create_user(&server, "admin@example.com", "administrator").await;
    let body = json!({ "email": "admin@example.com", "password": PASSWORD, "role": "privileged" });
    let response = server.post_json("/users", &body).await;
    assert_eq!(response.json()["code"], "email_taken");
}

#[tokio::test(flavor = "multi_thread")]
async fn the_launch_token_lists_the_accounts() {
    let server = spawn_test_server_with_accounts(false).await;
    create_user(&server, "first@example.com", "library_user").await;
    create_user(&server, "second@example.com", "privileged").await;
    let page = server.get("/users").await.json();
    assert_eq!(
        emails_of(&page),
        ["first@example.com", "second@example.com"]
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn a_page_holds_the_accounts_after_the_offset() {
    let server = spawn_test_server_with_accounts(false).await;
    create_users(&server, 5).await;
    let page = server.get("/users?offset=2&limit=2").await.json();
    assert_eq!(emails_of(&page), ["user2@example.com", "user3@example.com"]);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_page_tells_how_many_accounts_there_are_in_all() {
    let server = spawn_test_server_with_accounts(false).await;
    create_users(&server, 5).await;
    let page = server.get("/users?offset=2&limit=2").await.json();
    assert_eq!(page["total"], 5);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_search_finds_accounts_beyond_the_first_page() {
    let server = spawn_test_server_with_accounts(false).await;
    create_users(&server, 3).await;
    let page = server.get("/users?search=%20USER2%20&limit=1").await.json();
    assert_eq!(emails_of(&page), ["user2@example.com"]);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_search_counts_only_the_matching_accounts() {
    let server = spawn_test_server_with_accounts(false).await;
    create_users(&server, 12).await;
    let page = server.get("/users?search=user1&limit=1").await.json();
    assert_eq!(page["total"], 3);
}

#[tokio::test(flavor = "multi_thread")]
async fn an_administrator_account_lists_the_accounts() {
    let server = spawn_test_server_with_accounts(false).await;
    let token = token_of_new_user(&server, "admin@example.com", "administrator").await;
    assert_eq!(list_users_as(&server, &token).await.status, 200);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_privileged_account_may_not_list_the_accounts() {
    let server = spawn_test_server_with_accounts(false).await;
    let token = token_of_new_user(&server, "member@example.com", "privileged").await;
    let response = list_users_as(&server, &token).await;
    assert_eq!(
        (response.status, response.json()["code"].clone()),
        (403, json!("forbidden"))
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn a_library_user_may_not_create_an_account() {
    let server = spawn_test_server_with_accounts(false).await;
    let token = token_of_new_user(&server, "reader@example.com", "library_user").await;
    let body =
        json!({ "email": "other@example.com", "password": PASSWORD, "role": "administrator" });
    let response = server
        .request("POST", "/users")
        .with_token(&token)
        .json(&body)
        .send()
        .await;
    assert_eq!(response.status, 403);
}

#[tokio::test(flavor = "multi_thread")]
async fn the_account_routes_need_a_token() {
    let server = spawn_test_server_with_accounts(false).await;
    let response = server.request("GET", "/users").without_token().send().await;
    assert_eq!(response.status, 401);
}

#[tokio::test(flavor = "multi_thread")]
async fn setting_a_role_returns_the_account_with_it() {
    let server = spawn_test_server_with_accounts(false).await;
    let user = create_user(&server, "reader@example.com", "library_user").await;
    let path = format!("/users/{}/role", user["id"].as_str().unwrap());
    let response = server
        .put_json(&path, &json!({ "role": "privileged" }))
        .await;
    assert_eq!(response.json()["role"], "privileged");
}

#[tokio::test(flavor = "multi_thread")]
async fn a_new_role_applies_to_an_existing_session() {
    let server = spawn_test_server_with_accounts(false).await;
    let token = token_of_new_user(&server, "reader@example.com", "library_user").await;
    let id = server.get("/users").await.json()["users"][0]["id"].clone();
    let path = format!("/users/{}/role", id.as_str().unwrap());
    server
        .put_json(&path, &json!({ "role": "administrator" }))
        .await;
    assert_eq!(list_users_as(&server, &token).await.status, 200);
}

#[tokio::test(flavor = "multi_thread")]
async fn setting_the_role_of_an_unknown_account_is_not_found() {
    let server = spawn_test_server_with_accounts(false).await;
    let response = server
        .put_json("/users/missing/role", &json!({ "role": "privileged" }))
        .await;
    assert_eq!(response.status, 404);
}

#[tokio::test(flavor = "multi_thread")]
async fn deleting_an_account_answers_no_content() {
    let server = spawn_test_server_with_accounts(false).await;
    let user = create_user(&server, "reader@example.com", "library_user").await;
    let path = format!("/users/{}", user["id"].as_str().unwrap());
    assert_eq!(server.delete(&path).await.status, 204);
}

#[tokio::test(flavor = "multi_thread")]
async fn deleting_an_account_ends_its_sessions() {
    let server = spawn_test_server_with_accounts(false).await;
    let token = token_of_new_user(&server, "member@example.com", "privileged").await;
    let id = server.get("/users").await.json()["users"][0]["id"].clone();
    server
        .delete(&format!("/users/{}", id.as_str().unwrap()))
        .await;
    let response = server
        .request("GET", "/auth/me")
        .with_token(&token)
        .send()
        .await;
    assert_eq!(response.status, 401);
}

#[tokio::test(flavor = "multi_thread")]
async fn demoting_the_last_administrator_conflicts() {
    let server = spawn_test_server_with_accounts(false).await;
    let admin = create_user(&server, "admin@example.com", "administrator").await;
    let path = format!("/users/{}/role", admin["id"].as_str().unwrap());
    let response = server
        .put_json(&path, &json!({ "role": "library_user" }))
        .await;
    assert_eq!(
        (response.status, response.json()["code"].clone()),
        (409, json!("last_administrator"))
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn deleting_the_last_administrator_conflicts() {
    let server = spawn_test_server_with_accounts(false).await;
    let admin = create_user(&server, "admin@example.com", "administrator").await;
    let path = format!("/users/{}", admin["id"].as_str().unwrap());
    assert_eq!(
        server.delete(&path).await.json()["code"],
        "last_administrator"
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn an_administrator_is_deleted_while_another_remains() {
    let server = spawn_test_server_with_accounts(false).await;
    let admin = create_user(&server, "admin@example.com", "administrator").await;
    create_user(&server, "second@example.com", "administrator").await;
    let path = format!("/users/{}", admin["id"].as_str().unwrap());
    assert_eq!(server.delete(&path).await.status, 204);
}

#[tokio::test(flavor = "multi_thread")]
async fn deleting_an_unknown_account_is_not_found() {
    let server = spawn_test_server_with_accounts(false).await;
    assert_eq!(server.delete("/users/missing").await.status, 404);
}

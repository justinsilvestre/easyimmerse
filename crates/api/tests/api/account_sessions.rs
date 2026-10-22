//! The devices an account is logged in on, and logging any of them out.

use serde_json::{Value, json};

use crate::support::{TestResponse, TestServer, spawn_test_server_with_accounts};

const PASSWORD: &str = "correct horse";

/// Signs up as `reader@example.com` from a device that sends the User-Agent, and returns the session token.
async fn sign_up_on(server: &TestServer, user_agent: &str) -> String {
    let body = json!({ "email": "reader@example.com", "password": PASSWORD });
    let response = server
        .request("POST", "/auth/signup")
        .without_token()
        .header("User-Agent", user_agent)
        .json(&body)
        .send()
        .await;
    token_of(&response)
}

async fn log_in_on(server: &TestServer, user_agent: &str) -> String {
    let body = json!({ "email": "reader@example.com", "password": PASSWORD });
    let response = server
        .request("POST", "/auth/login")
        .without_token()
        .header("User-Agent", user_agent)
        .json(&body)
        .send()
        .await;
    token_of(&response)
}

fn token_of(response: &TestResponse) -> String {
    response.json()["token"]
        .as_str()
        .expect("a session token")
        .to_string()
}

/// A server where the reader is logged in on a laptop and then on a phone. Returns both tokens.
async fn reader_on_two_devices() -> (TestServer, String, String) {
    let server = spawn_test_server_with_accounts(true).await;
    let laptop = sign_up_on(&server, "Laptop").await;
    let phone = log_in_on(&server, "Phone").await;
    (server, laptop, phone)
}

async fn sessions_as(server: &TestServer, token: &str) -> Vec<Value> {
    let response = server
        .request("GET", "/auth/sessions")
        .with_token(token)
        .send()
        .await;
    response.json()["sessions"]
        .as_array()
        .expect("a list of sessions")
        .clone()
}

/// The id of the listed session that the User-Agent started.
async fn session_id_of(server: &TestServer, token: &str, user_agent: &str) -> String {
    let sessions = sessions_as(server, token).await;
    let session = sessions
        .iter()
        .find(|session| session["user_agent"] == user_agent)
        .expect("a session from the device");
    session["id"].as_str().expect("an id").to_string()
}

async fn delete_as(server: &TestServer, token: &str, id: &str) -> TestResponse {
    server
        .request("DELETE", &format!("/auth/sessions/{id}"))
        .with_token(token)
        .send()
        .await
}

async fn me_status(server: &TestServer, token: &str) -> u16 {
    server
        .request("GET", "/auth/me")
        .with_token(token)
        .send()
        .await
        .status
}

mod listing {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn shows_both_devices() {
        let (server, laptop, _) = reader_on_two_devices().await;
        let user_agents: Vec<Value> = sessions_as(&server, &laptop)
            .await
            .iter()
            .map(|session| session["user_agent"].clone())
            .collect();
        assert_eq!(user_agents, [json!("Phone"), json!("Laptop")]);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn flags_only_the_current_device() {
        let (server, laptop, _) = reader_on_two_devices().await;
        let current: Vec<Value> = sessions_as(&server, &laptop)
            .await
            .iter()
            .filter(|session| session["is_current"] == true)
            .map(|session| session["user_agent"].clone())
            .collect();
        assert_eq!(current, [json!("Laptop")]);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn is_refused_to_the_launch_token() {
        let server = spawn_test_server_with_accounts(true).await;
        let response = server.get("/auth/sessions").await;
        assert_eq!(response.json()["code"], "not_an_account");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn is_forbidden_to_the_launch_token() {
        let server = spawn_test_server_with_accounts(true).await;
        assert_eq!(server.get("/auth/sessions").await.status, 403);
    }
}

mod deleting {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn logs_out_the_other_device() {
        let (server, laptop, phone) = reader_on_two_devices().await;
        let id = session_id_of(&server, &laptop, "Phone").await;
        delete_as(&server, &laptop, &id).await;
        assert_eq!(me_status(&server, &phone).await, 401);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn answers_no_content() {
        let (server, laptop, _) = reader_on_two_devices().await;
        let id = session_id_of(&server, &laptop, "Phone").await;
        assert_eq!(delete_as(&server, &laptop, &id).await.status, 204);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn keeps_the_current_device_logged_in() {
        let (server, laptop, _) = reader_on_two_devices().await;
        let id = session_id_of(&server, &laptop, "Phone").await;
        delete_as(&server, &laptop, &id).await;
        assert_eq!(me_status(&server, &laptop).await, 200);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn the_current_session_logs_out() {
        let (server, laptop, _) = reader_on_two_devices().await;
        let id = session_id_of(&server, &laptop, "Laptop").await;
        delete_as(&server, &laptop, &id).await;
        assert_eq!(me_status(&server, &laptop).await, 401);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn does_not_find_the_session_of_another_account() {
        let (server, laptop, _) = reader_on_two_devices().await;
        let id = session_id_of(&server, &laptop, "Phone").await;
        let body = json!({ "email": "other@example.com", "password": PASSWORD });
        let response = server
            .request("POST", "/auth/signup")
            .without_token()
            .json(&body)
            .send()
            .await;
        let other = token_of(&response);
        assert_eq!(delete_as(&server, &other, &id).await.status, 404);
    }
}

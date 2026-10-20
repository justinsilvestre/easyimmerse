//! Signing up, logging in and out, and the principal behind a token.

use std::time::{SystemTime, UNIX_EPOCH};

use easyimmerse_api::accounts::hash_session_token;
use easyimmerse_api::{ApiConfig, ServeError, ServeOptions, serve};
use easyimmerse_core::account::AccountRole;
use easyimmerse_storage::Storage;
use serde_json::json;
use tokio::net::TcpListener;

use crate::support::{
    TestResponse, TestServer, fixture_path, spawn_test_server, spawn_test_server_with_accounts,
    spawn_test_server_with_accounts_on,
};

const PASSWORD: &str = "correct horse";

async fn sign_up(server: &TestServer, email: &str, password: &str) -> TestResponse {
    let body = json!({ "email": email, "password": password });
    server
        .request("POST", "/auth/signup")
        .without_token()
        .json(&body)
        .send()
        .await
}

async fn log_in(server: &TestServer, email: &str, password: &str) -> TestResponse {
    let body = json!({ "email": email, "password": password });
    server
        .request("POST", "/auth/login")
        .without_token()
        .json(&body)
        .send()
        .await
}

/// Signs up as `reader@example.com` and returns the session token.
async fn reader_token(server: &TestServer) -> String {
    let response = sign_up(server, "reader@example.com", PASSWORD).await;
    response.json()["token"]
        .as_str()
        .expect("a session token")
        .to_string()
}

async fn get_as(server: &TestServer, path: &str, token: &str) -> TestResponse {
    server.request("GET", path).with_token(token).send().await
}

mod server_info {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn reports_no_accounts_on_a_server_without_them() {
        let server = spawn_test_server(false).await;
        let response = server
            .request("GET", "/auth/server")
            .without_token()
            .send()
            .await;
        assert_eq!(
            response.json(),
            json!({ "accounts": false, "open_signup": false })
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn reports_open_signup() {
        let server = spawn_test_server_with_accounts(true).await;
        let response = server
            .request("GET", "/auth/server")
            .without_token()
            .send()
            .await;
        assert_eq!(
            response.json(),
            json!({ "accounts": true, "open_signup": true })
        );
    }
}

mod signup {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn creates_an_account() {
        let server = spawn_test_server_with_accounts(true).await;
        let response = sign_up(&server, "reader@example.com", PASSWORD).await;
        assert_eq!(response.status, 201);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn gives_a_new_account_the_library_user_role() {
        let server = spawn_test_server_with_accounts(true).await;
        let response = sign_up(&server, "reader@example.com", PASSWORD).await;
        assert_eq!(response.json()["user"]["role"], "library_user");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn issues_a_token_that_authenticates_the_account() {
        let server = spawn_test_server_with_accounts(true).await;
        let token = reader_token(&server).await;
        let response = get_as(&server, "/auth/me", &token).await;
        assert_eq!(response.json()["user"]["email"], "reader@example.com");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn is_closed_when_the_server_does_not_open_it() {
        let server = spawn_test_server_with_accounts(false).await;
        let response = sign_up(&server, "reader@example.com", PASSWORD).await;
        assert_eq!(response.json()["code"], "signup_closed");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn is_closed_on_a_server_without_accounts() {
        let server = spawn_test_server(false).await;
        let response = sign_up(&server, "reader@example.com", PASSWORD).await;
        assert_eq!(response.status, 403);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn refuses_an_email_taken_in_another_letter_case() {
        let server = spawn_test_server_with_accounts(true).await;
        sign_up(&server, "reader@example.com", PASSWORD).await;
        let response = sign_up(&server, "Reader@Example.com", PASSWORD).await;
        assert_eq!(
            (response.status, response.json()["code"].clone()),
            (409, json!("email_taken"))
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn refuses_an_invalid_email_address() {
        let server = spawn_test_server_with_accounts(true).await;
        let response = sign_up(&server, "reader", PASSWORD).await;
        assert_eq!(
            (response.status, response.json()["code"].clone()),
            (400, json!("invalid_email"))
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn refuses_a_short_password() {
        let server = spawn_test_server_with_accounts(true).await;
        let response = sign_up(&server, "reader@example.com", "short").await;
        assert_eq!(
            (response.status, response.json()["code"].clone()),
            (400, json!("password_too_short"))
        );
    }
}

mod login {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn succeeds_with_the_right_password() {
        let server = spawn_test_server_with_accounts(true).await;
        sign_up(&server, "reader@example.com", PASSWORD).await;
        let response = log_in(&server, "reader@example.com", PASSWORD).await;
        assert_eq!(response.status, 200);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn issues_a_token_that_reaches_the_other_routes() {
        let server = spawn_test_server_with_accounts(true).await;
        sign_up(&server, "reader@example.com", PASSWORD).await;
        let session = log_in(&server, "reader@example.com", PASSWORD).await.json();
        let token = session["token"].as_str().unwrap();
        assert_eq!(get_as(&server, "/projects", token).await.status, 200);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn refuses_a_wrong_password() {
        let server = spawn_test_server_with_accounts(true).await;
        sign_up(&server, "reader@example.com", PASSWORD).await;
        let response = log_in(&server, "reader@example.com", "battery staple").await;
        assert_eq!(
            (response.status, response.json()["code"].clone()),
            (401, json!("invalid_credentials"))
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn refuses_an_unknown_email_like_a_wrong_password() {
        let server = spawn_test_server_with_accounts(true).await;
        let response = log_in(&server, "nobody@example.com", PASSWORD).await;
        assert_eq!(
            (response.status, response.json()["code"].clone()),
            (401, json!("invalid_credentials"))
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn is_disabled_on_a_server_without_accounts() {
        let server = spawn_test_server(false).await;
        let response = log_in(&server, "reader@example.com", PASSWORD).await;
        assert_eq!(
            (response.status, response.json()["code"].clone()),
            (403, json!("accounts_disabled"))
        );
    }
}

mod throttling {
    use super::*;

    async fn fail_to_log_in(server: &TestServer, times: usize) {
        for _ in 0..times {
            log_in(server, "reader@example.com", "battery staple").await;
        }
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn refuses_a_sixth_login_after_five_failures() {
        let server = spawn_test_server_with_accounts(true).await;
        sign_up(&server, "reader@example.com", PASSWORD).await;
        fail_to_log_in(&server, 5).await;
        let response = log_in(&server, "reader@example.com", PASSWORD).await;
        assert_eq!(
            (response.status, response.json()["code"].clone()),
            (429, json!("too_many_attempts"))
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn tells_in_seconds_when_to_retry() {
        let server = spawn_test_server_with_accounts(true).await;
        fail_to_log_in(&server, 5).await;
        let response = log_in(&server, "Reader@Example.com", PASSWORD).await;
        assert_eq!(response.header("retry-after"), Some("900"));
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn refuses_a_signup_for_the_throttled_address() {
        let server = spawn_test_server_with_accounts(true).await;
        fail_to_log_in(&server, 5).await;
        let response = sign_up(&server, "reader@example.com", PASSWORD).await;
        assert_eq!(response.status, 429);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn forgets_the_failures_after_a_successful_login() {
        let server = spawn_test_server_with_accounts(true).await;
        sign_up(&server, "reader@example.com", PASSWORD).await;
        fail_to_log_in(&server, 4).await;
        log_in(&server, "reader@example.com", PASSWORD).await;
        fail_to_log_in(&server, 4).await;
        let response = log_in(&server, "reader@example.com", PASSWORD).await;
        assert_eq!(response.status, 200);
    }
}

mod me {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn names_the_launch_principal() {
        let server = spawn_test_server(false).await;
        let response = server.get("/auth/me").await;
        assert_eq!(response.json(), json!({ "kind": "launch" }));
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn names_an_account_by_kind() {
        let server = spawn_test_server_with_accounts(true).await;
        let token = reader_token(&server).await;
        let response = get_as(&server, "/auth/me", &token).await;
        assert_eq!(response.json()["kind"], "account");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn refuses_an_unknown_session_token() {
        let server = spawn_test_server_with_accounts(true).await;
        let response = get_as(&server, "/auth/me", "unknown").await;
        assert_eq!(response.json()["code"], "unauthorized");
    }
}

mod session_expiry {
    use super::*;

    const DAY_MS: u64 = 24 * 60 * 60 * 1000;

    fn now_ms() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64
    }

    /// Stores a session with the token `session-token` that expires a day from now.
    fn store_session_expiring_tomorrow(storage: &Storage) {
        let user = storage
            .create_user("reader@example.com", "hash", AccountRole::LibraryUser)
            .unwrap();
        let token_hash = hash_session_token("session-token");
        storage
            .create_session(&token_hash, &user.id, now_ms() + DAY_MS)
            .unwrap();
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_session_in_use_is_extended_to_ninety_days() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("server.sqlite");
        store_session_expiring_tomorrow(&Storage::open(&path).unwrap());
        let server = spawn_test_server_with_accounts_on(Storage::open(&path).unwrap(), true).await;
        get_as(&server, "/auth/me", "session-token").await;
        let session = Storage::open(&path)
            .unwrap()
            .find_live_session(&hash_session_token("session-token"), now_ms())
            .unwrap()
            .unwrap();
        assert!(session.expires_at_ms > now_ms() + 89 * DAY_MS);
    }
}

mod logout {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn ends_the_session() {
        let server = spawn_test_server_with_accounts(true).await;
        let token = reader_token(&server).await;
        server
            .request("POST", "/auth/logout")
            .with_token(&token)
            .send()
            .await;
        assert_eq!(get_as(&server, "/auth/me", &token).await.status, 401);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn answers_no_content() {
        let server = spawn_test_server_with_accounts(true).await;
        let token = reader_token(&server).await;
        let response = server
            .request("POST", "/auth/logout")
            .with_token(&token)
            .send()
            .await;
        assert_eq!(response.status, 204);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn leaves_the_launch_token_working() {
        let server = spawn_test_server(false).await;
        server.request("POST", "/auth/logout").send().await;
        assert_eq!(server.get("/auth/me").await.status, 200);
    }
}

mod local_paths {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn are_closed_to_an_account() {
        let server = spawn_test_server_with_accounts(true).await;
        let token = reader_token(&server).await;
        let body = json!({ "source": { "kind": "path", "path": fixture_path("sample.srt") } });
        let response = server
            .request("POST", "/timed-text/parse")
            .with_token(&token)
            .json(&body)
            .send()
            .await;
        assert_eq!(response.json()["code"], "local_paths_not_allowed");
    }
}

#[tokio::test(flavor = "multi_thread")]
async fn a_server_without_a_launch_token_or_accounts_does_not_start() {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port = listener.local_addr().unwrap().port();
    let config = ApiConfig::for_loopback_hosts(port, false);
    let storage = Storage::open_in_memory().unwrap();
    let result = serve(listener, config, storage, ServeOptions::default()).await;
    assert!(matches!(result, Err(ServeError::NoAuthentication)));
}

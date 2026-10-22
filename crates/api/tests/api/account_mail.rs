//! Confirming an email address and resetting a forgotten password through mailed links.

use serde_json::json;

use crate::support::{
    PUBLIC_URL, TestResponse, TestServer, link_token, mail_with_link,
    spawn_test_server_with_accounts, spawn_test_server_with_mail, wait_for_mails,
};

const PASSWORD: &str = "correct horse";
const EMAIL: &str = "reader@example.com";

async fn post_public(server: &TestServer, path: &str, body: serde_json::Value) -> TestResponse {
    server
        .request("POST", path)
        .without_token()
        .json(&body)
        .send()
        .await
}

/// Signs up as the reader and returns the session token.
async fn sign_up(server: &TestServer) -> String {
    let body = json!({ "email": EMAIL, "password": PASSWORD });
    let response = post_public(server, "/auth/signup", body).await;
    response.json()["token"]
        .as_str()
        .expect("a session token")
        .to_string()
}

async fn me_as(server: &TestServer, token: &str) -> TestResponse {
    server
        .request("GET", "/auth/me")
        .with_token(token)
        .send()
        .await
}

async fn resend_as(server: &TestServer, token: &str) -> TestResponse {
    server
        .request("POST", "/auth/confirmation-email")
        .with_token(token)
        .send()
        .await
}

mod server_info {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn reports_a_server_that_sends_email() {
        let (server, _) = spawn_test_server_with_mail().await;
        let response = server
            .request("GET", "/auth/server")
            .without_token()
            .send()
            .await;
        assert_eq!(response.json()["sends_email"], true);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn reports_a_server_that_sends_none() {
        let server = spawn_test_server_with_accounts(true).await;
        let response = server
            .request("GET", "/auth/server")
            .without_token()
            .send()
            .await;
        assert_eq!(response.json()["sends_email"], false);
    }
}

mod confirmation {
    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn signing_up_sends_one_mail() {
        let (server, recorded) = spawn_test_server_with_mail().await;
        sign_up(&server).await;
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        assert_eq!(wait_for_mails(&recorded, 1).await.len(), 1);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn the_mail_goes_to_the_new_address() {
        let (server, recorded) = spawn_test_server_with_mail().await;
        sign_up(&server).await;
        assert_eq!(wait_for_mails(&recorded, 1).await[0].to, EMAIL);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn the_mail_links_to_the_public_url() {
        let (server, recorded) = spawn_test_server_with_mail().await;
        sign_up(&server).await;
        let mail = &wait_for_mails(&recorded, 1).await[0];
        assert!(mail.text.contains(&format!("{PUBLIC_URL}/?confirm_email=")));
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn the_link_confirms_the_address() {
        let (server, recorded) = spawn_test_server_with_mail().await;
        let session = sign_up(&server).await;
        let token = link_token(&wait_for_mails(&recorded, 1).await[0], "confirm_email");
        post_public(&server, "/auth/confirm-email", json!({ "token": token })).await;
        let me = me_as(&server, &session).await.json();
        assert!(me["user"]["email_confirmed_at_ms"].is_u64());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn the_link_answers_no_content() {
        let (server, recorded) = spawn_test_server_with_mail().await;
        sign_up(&server).await;
        let token = link_token(&wait_for_mails(&recorded, 1).await[0], "confirm_email");
        let response = post_public(&server, "/auth/confirm-email", json!({ "token": token })).await;
        assert_eq!(response.status, 204);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn the_link_works_only_once() {
        let (server, recorded) = spawn_test_server_with_mail().await;
        sign_up(&server).await;
        let token = link_token(&wait_for_mails(&recorded, 1).await[0], "confirm_email");
        post_public(&server, "/auth/confirm-email", json!({ "token": token })).await;
        let again = post_public(&server, "/auth/confirm-email", json!({ "token": token })).await;
        assert_eq!(again.json()["code"], "invalid_link");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn an_unknown_token_is_a_bad_request() {
        let (server, _) = spawn_test_server_with_mail().await;
        let response = post_public(&server, "/auth/confirm-email", json!({ "token": "bad" })).await;
        assert_eq!(response.status, 400);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn resending_after_confirmation_is_a_conflict() {
        let (server, recorded) = spawn_test_server_with_mail().await;
        let session = sign_up(&server).await;
        let token = link_token(&wait_for_mails(&recorded, 1).await[0], "confirm_email");
        post_public(&server, "/auth/confirm-email", json!({ "token": token })).await;
        assert_eq!(
            resend_as(&server, &session).await.json()["code"],
            "already_confirmed"
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn resending_right_after_signup_must_wait() {
        let (server, _) = spawn_test_server_with_mail().await;
        let session = sign_up(&server).await;
        assert_eq!(resend_as(&server, &session).await.status, 429);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn resending_on_a_server_without_mail_is_unavailable() {
        let server = spawn_test_server_with_accounts(true).await;
        let session = sign_up(&server).await;
        assert_eq!(
            resend_as(&server, &session).await.json()["code"],
            "mail_unavailable"
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn signing_up_without_mail_leaves_the_address_unconfirmed() {
        let server = spawn_test_server_with_accounts(true).await;
        let session = sign_up(&server).await;
        let me = me_as(&server, &session).await.json();
        assert!(me["user"]["email_confirmed_at_ms"].is_null());
    }
}

mod password_reset {
    use super::*;

    const NEW_PASSWORD: &str = "battery staple";

    async fn request_reset(server: &TestServer, email: &str) -> TestResponse {
        post_public(server, "/auth/password-reset", json!({ "email": email })).await
    }

    /// Signs up, asks for a reset, and returns the old session token and the token of the reset link.
    async fn reset_link() -> (TestServer, String, String) {
        let (server, recorded) = spawn_test_server_with_mail().await;
        let session = sign_up(&server).await;
        request_reset(&server, EMAIL).await;
        let mails = wait_for_mails(&recorded, 2).await;
        let token = link_token(mail_with_link(&mails, "reset_password"), "reset_password");
        (server, session, token)
    }

    async fn choose_password(server: &TestServer, token: &str, password: &str) -> TestResponse {
        let body = json!({ "token": token, "password": password });
        post_public(server, "/auth/password", body).await
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn is_accepted_for_a_known_address() {
        let (server, _) = spawn_test_server_with_mail().await;
        sign_up(&server).await;
        assert_eq!(request_reset(&server, EMAIL).await.status, 202);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn is_accepted_alike_for_an_unknown_address() {
        let (server, _) = spawn_test_server_with_mail().await;
        assert_eq!(
            request_reset(&server, "nobody@example.com").await.status,
            202
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn sends_nothing_for_an_unknown_address() {
        let (server, recorded) = spawn_test_server_with_mail().await;
        request_reset(&server, "nobody@example.com").await;
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        assert!(recorded.sent().is_empty());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn is_unavailable_on_a_server_without_mail() {
        let server = spawn_test_server_with_accounts(true).await;
        assert_eq!(request_reset(&server, EMAIL).await.status, 503);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn the_new_password_logs_in_on_this_device() {
        let (server, _, token) = reset_link().await;
        let response = choose_password(&server, &token, NEW_PASSWORD).await;
        let session = response.json()["token"].as_str().unwrap().to_string();
        assert_eq!(me_as(&server, &session).await.status, 200);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn the_new_password_logs_out_the_old_session() {
        let (server, old_session, token) = reset_link().await;
        choose_password(&server, &token, NEW_PASSWORD).await;
        assert_eq!(me_as(&server, &old_session).await.status, 401);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn the_new_password_works_for_login() {
        let (server, _, token) = reset_link().await;
        choose_password(&server, &token, NEW_PASSWORD).await;
        let body = json!({ "email": EMAIL, "password": NEW_PASSWORD });
        assert_eq!(post_public(&server, "/auth/login", body).await.status, 200);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_short_password_is_refused() {
        let (server, _, token) = reset_link().await;
        let response = choose_password(&server, &token, "short").await;
        assert_eq!(response.json()["code"], "password_too_short");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn an_unknown_token_is_an_invalid_link() {
        let (server, _) = spawn_test_server_with_mail().await;
        let response = choose_password(&server, "bad", NEW_PASSWORD).await;
        assert_eq!(response.json()["code"], "invalid_link");
    }
}

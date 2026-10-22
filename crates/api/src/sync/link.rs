//! Linking the device's own data to an account on a remote, and unlinking it.

use std::time::Duration;

use axum::http::StatusCode;
use easyimmerse_core::sync::{LinkRemoteRequest, SignInMode};
use easyimmerse_storage::{NewRemote, OwnerId, RemoteKind, StorageError};

use super::SyncEngine;
use super::failures::{checked_server_url, not_linked, remote_failure};
use super::remote_client::{RemoteClient, RemoteError};
use crate::auth::error_body::ApiFailure;
use crate::now_ms::now_ms;
use crate::routes::current_principal::CurrentPrincipal;

/// How long unlinking waits for the remote to end the session before forgetting it anyway.
const LOG_OUT_TIMEOUT: Duration = Duration::from_secs(5);

impl SyncEngine {
    /// Logs in to the remote, or signs up there, and links the device's own data to that account. Blocking.
    /// The remote's session token stays on this server.
    pub fn link(&self, request: &LinkRemoteRequest) -> Result<(), ApiFailure> {
        let server_url = checked_server_url(&request.server_url)?;
        if self.live_link_exists()? {
            return Err(already_linked());
        }
        let anonymous = RemoteClient::new(&server_url, None);
        if !anonymous.auth_info().map_err(remote_failure)?.accounts {
            return Err(ApiFailure::new(
                StatusCode::FORBIDDEN,
                "accounts_disabled",
                "the server has no accounts to log in to",
            ));
        }
        let session = match request.mode {
            SignInMode::Login => anonymous.log_in(&request.email, &request.password),
            SignInMode::Signup => anonymous.sign_up(&request.email, &request.password),
        }
        .map_err(remote_failure)?;
        let client = RemoteClient::new(&server_url, Some(session.token.clone()));
        let CurrentPrincipal::Account { user } = client.me().map_err(remote_failure)? else {
            return Err(remote_failure(RemoteError::Protocol(
                "the server did not log in to an account".to_string(),
            )));
        };
        let remote = NewRemote {
            owner_id: OwnerId::launch(),
            kind: RemoteKind::Account,
            server_url,
            session_token: session.token,
            account_id: user.id,
            account_email: user.email,
            account_role: user.role,
            linked_at_ms: now_ms(),
        };
        if let Err(error) = self.storage.link_sync_remote(&remote) {
            // Another link won the race; the session just opened is of no use.
            let _ = client.log_out();
            return Err(error.into());
        }
        self.reset();
        self.request_round();
        Ok(())
    }

    /// Logs out of the remote when it answers within a few seconds, then forgets the link. Blocking.
    /// The device's own data stays as it is.
    pub fn unlink(&self) -> Result<(), ApiFailure> {
        let remote = self
            .storage
            .get_sync_remote(&OwnerId::launch(), RemoteKind::Account)?
            .ok_or_else(not_linked)?;
        if let Some(token) = &remote.session_token {
            let client = RemoteClient::with_timeout(
                &remote.server_url,
                Some(token.clone()),
                LOG_OUT_TIMEOUT,
            );
            if let Err(error) = client.log_out() {
                tracing::info!("the remote session could not be ended: {error:?}");
            }
        }
        match self.storage.delete_sync_remote(&remote.id) {
            Ok(()) | Err(StorageError::RemoteNotLinked) => {}
            Err(error) => return Err(error.into()),
        }
        self.reset();
        Ok(())
    }

    fn live_link_exists(&self) -> Result<bool, ApiFailure> {
        let remote = self
            .storage
            .get_sync_remote(&OwnerId::launch(), RemoteKind::Account)?;
        Ok(remote.is_some_and(|remote| remote.session_token.is_some()))
    }
}

fn already_linked() -> ApiFailure {
    ApiFailure::from(StorageError::AlreadyLinked)
}

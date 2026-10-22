//! When the engine runs a round, and what it records after one.

use std::sync::Arc;
use std::time::{Duration, Instant};

use easyimmerse_core::sync::SyncLinkState;
use easyimmerse_storage::{OwnerId, RemoteKind, StorageError, StoredRemote};

use super::SyncEngine;
use super::remote_client::RemoteError;
use super::round::{RoundError, run_round};
use crate::now_ms::now_ms;

/// How often the engine checks whether a round is due. Local changes are noticed on this tick.
const TICK: Duration = Duration::from_secs(5);
/// How long after a round the engine pulls again when nothing changed here.
const PULL_INTERVAL: Duration = Duration::from_secs(60);
/// How long the engine waits before trying again after the first, second, third and later failed rounds.
const BACKOFF: [Duration; 4] = [
    Duration::from_secs(5),
    Duration::from_secs(30),
    Duration::from_secs(120),
    Duration::from_secs(300),
];

impl SyncEngine {
    /// Runs rounds for as long as the server runs. Without a link, it only checks for one on each tick.
    pub async fn run(self: Arc<Self>) {
        loop {
            tokio::select! {
                () = self.wake.notified() => {}
                () = tokio::time::sleep(TICK) => {}
            }
            let engine = Arc::clone(&self);
            if let Err(error) = tokio::task::spawn_blocking(move || engine.run_round_if_due()).await
            {
                tracing::error!("a sync round panicked: {error}");
            }
        }
    }

    fn run_round_if_due(&self) {
        let remote = match self
            .storage
            .get_sync_remote(&OwnerId::launch(), RemoteKind::Account)
        {
            Ok(Some(remote)) if remote.session_token.is_some() => remote,
            Ok(_) => return,
            Err(error) => {
                tracing::warn!("the sync link could not be read: {error}");
                return;
            }
        };
        match self.storage.local_change_seq() {
            Ok(local_change_seq) if self.is_round_due(&remote, local_change_seq) => {}
            Ok(_) => return,
            Err(error) => {
                tracing::warn!("the change sequence could not be read: {error}");
                return;
            }
        }
        let started_at_ms = now_ms();
        self.begin_round();
        let result = run_round(self, &remote);
        self.finish_round(&remote, started_at_ms, result);
    }

    fn is_round_due(&self, remote: &StoredRemote, local_change_seq: u64) -> bool {
        let state = self.state();
        if state.is_round_requested {
            return true;
        }
        if let Some(retry_at) = state.retry_at {
            return Instant::now() >= retry_at;
        }
        local_change_seq > remote.pushed_through_seq
            || state
                .last_round_at
                .is_none_or(|at| at.elapsed() >= PULL_INTERVAL)
    }

    fn begin_round(&self) {
        let mut state = self.state();
        state.is_round_requested = false;
        state.last_round_at = Some(Instant::now());
        if !matches!(state.link_state, SyncLinkState::Unreachable { .. }) {
            state.link_state = SyncLinkState::Syncing;
        }
    }

    fn finish_round(
        &self,
        remote: &StoredRemote,
        started_at_ms: u64,
        result: Result<(), RoundError>,
    ) {
        let outcome = result.and_then(|()| {
            self.storage
                .set_sync_last_synced(&remote.id, started_at_ms)
                .map_err(RoundError::Storage)
        });
        match outcome {
            Ok(()) | Err(RoundError::Storage(StorageError::RemoteNotLinked)) => self.succeed(),
            Err(RoundError::Remote(RemoteError::LoggedOut)) => self.log_out(remote),
            Err(RoundError::Remote(RemoteError::Unreachable(reason))) => {
                tracing::info!("the remote could not be reached: {reason}");
                let since_ms = match self.link_state() {
                    SyncLinkState::Unreachable { since_ms } => since_ms,
                    _ => started_at_ms,
                };
                self.fail(SyncLinkState::Unreachable { since_ms });
            }
            Err(error) => {
                let (code, message) = error.code_and_message();
                tracing::warn!(%code, "a sync round failed: {message}");
                self.fail(SyncLinkState::Failed { code, message });
            }
        }
    }

    fn succeed(&self) {
        let mut state = self.state();
        state.link_state = SyncLinkState::Idle;
        state.failure_count = 0;
        state.retry_at = None;
    }

    fn log_out(&self, remote: &StoredRemote) {
        if let Err(error) = self.storage.forget_sync_session_token(&remote.id) {
            tracing::warn!("the remote's session could not be forgotten: {error}");
        }
        self.succeed();
    }

    fn fail(&self, link_state: SyncLinkState) {
        let mut state = self.state();
        state.failure_count += 1;
        let step = (state.failure_count as usize - 1).min(BACKOFF.len() - 1);
        state.retry_at = Some(Instant::now() + BACKOFF[step]);
        state.link_state = link_state;
    }
}

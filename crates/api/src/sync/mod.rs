//! The sync engine of a built-in server: it keeps a copy of the device's own data on the account server
//! it is linked to, pulling the remote's changes and pushing its own in rounds.

mod dictionary_transfer;
mod engine_loop;
pub mod failures;
pub mod link;
pub mod media_transfer;
pub mod proxy;
mod pull;
mod push;
pub mod remote_client;
mod remote_transfers;
mod round;
pub mod status;

use std::path::PathBuf;
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::Instant;

use easyimmerse_core::sync::{MediaTransfer, SyncLinkState};
use easyimmerse_storage::Storage;
use tokio::sync::Notify;

/// Runs rounds of syncing with the linked remote, and holds what the status reports beyond the database.
pub struct SyncEngine {
    storage: Arc<Storage>,
    /// Where this server keeps copies of media bytes; None when it keeps none.
    uploads_dir: Option<PathBuf>,
    wake: Notify,
    state: Mutex<EngineState>,
}

/// What the engine knows that the database does not.
struct EngineState {
    /// Idle, syncing, unreachable or failed. A logged-out link is told by its missing session token instead.
    link_state: SyncLinkState,
    transfer: Option<MediaTransfer>,
    pulled_revision: u64,
    is_round_requested: bool,
    last_round_at: Option<Instant>,
    failure_count: u32,
    retry_at: Option<Instant>,
}

impl Default for EngineState {
    fn default() -> Self {
        Self {
            link_state: SyncLinkState::Idle,
            transfer: None,
            pulled_revision: 0,
            is_round_requested: false,
            last_round_at: None,
            failure_count: 0,
            retry_at: None,
        }
    }
}

impl SyncEngine {
    pub fn new(storage: Arc<Storage>, uploads_dir: Option<PathBuf>) -> Self {
        Self {
            storage,
            uploads_dir,
            wake: Notify::new(),
            state: Mutex::new(EngineState::default()),
        }
    }

    /// Asks for a round as soon as possible, as after linking or when the person asks to sync now.
    pub fn request_round(&self) {
        self.state().is_round_requested = true;
        self.wake.notify_one();
    }

    /// Forgets how the last link fared, after a link was made or removed. The pulled revision keeps rising.
    pub fn reset(&self) {
        let mut state = self.state();
        let pulled_revision = state.pulled_revision;
        *state = EngineState {
            pulled_revision,
            ..EngineState::default()
        };
    }

    pub fn link_state(&self) -> SyncLinkState {
        self.state().link_state.clone()
    }

    pub fn transfer(&self) -> Option<MediaTransfer> {
        self.state().transfer.clone()
    }

    /// Reports the media transfer in progress, or None once it is over.
    fn set_transfer(&self, transfer: Option<MediaTransfer>) {
        self.state().transfer = transfer;
    }

    /// Adds to the bytes the transfer in progress has sent.
    fn add_sent_bytes(&self, count: u64) {
        if let Some(transfer) = &mut self.state().transfer {
            transfer.sent_bytes += count;
        }
    }

    pub fn pulled_revision(&self) -> u64 {
        self.state().pulled_revision
    }

    /// Records that rows from the remote changed this server's data, so that clients reload what they show.
    fn note_pulled_rows(&self) {
        self.state().pulled_revision += 1;
    }

    fn state(&self) -> MutexGuard<'_, EngineState> {
        // A panic while the lock was held leaves plain values behind, which stay usable.
        self.state
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}

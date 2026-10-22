//! What `GET /sync/status` reports: the link of the device's own data, from the database and the engine.

use easyimmerse_core::sync::{SyncLink, SyncLinkState, SyncStatus};
use easyimmerse_storage::{OwnerId, RemoteKind, Storage, StorageError, StoredRemote};

use super::SyncEngine;

/// How many conflicts the status lists.
const LISTED_CONFLICTS: u32 = 20;

impl SyncEngine {
    /// The status of the launch owner's account link. Blocking.
    pub fn status(&self) -> Result<SyncStatus, StorageError> {
        let storage = &self.storage;
        let local_change_seq = storage.local_change_seq()?;
        let link = storage
            .get_sync_remote(&OwnerId::launch(), RemoteKind::Account)?
            .map(|remote| self.link_of(storage, remote))
            .transpose()?;
        Ok(SyncStatus {
            link,
            pulled_revision: self.pulled_revision(),
            local_change_seq,
        })
    }

    fn link_of(&self, storage: &Storage, remote: StoredRemote) -> Result<SyncLink, StorageError> {
        let state = match remote.session_token {
            Some(_) => self.link_state(),
            None => SyncLinkState::LoggedOut,
        };
        Ok(SyncLink {
            kind: remote.kind.into(),
            conflicts: storage.list_sync_conflicts(&remote.id, LISTED_CONFLICTS)?,
            conflict_count: storage.count_sync_conflicts(&remote.id)?,
            server_url: remote.server_url,
            account_email: remote.account_email,
            account_role: remote.account_role,
            linked_at_ms: remote.linked_at_ms,
            last_synced_at_ms: remote.last_synced_at_ms,
            pushed_through_seq: remote.pushed_through_seq,
            state,
            transfer: self.transfer(),
        })
    }
}

/// The status an account sees, since only the device's own data syncs.
pub fn account_status() -> SyncStatus {
    SyncStatus {
        link: None,
        pulled_revision: 0,
        local_change_seq: 0,
    }
}

//! Fixtures shared by the tests of syncing.

use easyimmerse_core::account::AccountRole;

use super::remotes::{NewRemote, RemoteKind, StoredRemote};
use crate::Storage;
use crate::owners::OwnerId;
use crate::review_test_support::seeded_storage;

/// An account link of the launch owner.
pub fn launch_remote() -> NewRemote {
    NewRemote {
        owner_id: OwnerId::launch(),
        kind: RemoteKind::Account,
        server_url: "https://cloud.example.com".to_string(),
        session_token: "token".to_string(),
        account_id: "account".to_string(),
        account_email: "reader@example.com".to_string(),
        account_role: AccountRole::Privileged,
        linked_at_ms: 1_000,
    }
}

/// The placeholder projects, with the launch owner linked to a remote.
pub fn storage_with_remote() -> (Storage, StoredRemote) {
    let storage = seeded_storage();
    let remote = storage.create_sync_remote(&launch_remote()).unwrap();
    (storage, remote)
}

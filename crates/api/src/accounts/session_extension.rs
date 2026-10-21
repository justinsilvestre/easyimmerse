//! Extending a session in use, without making its request wait for the database's writer.

use std::collections::HashSet;
use std::sync::{Arc, Mutex, MutexGuard, PoisonError};

use easyimmerse_storage::{Storage, StorageError};

/// A new expiry that a session in use is due.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SessionExtension {
    pub token_hash: String,
    pub expires_at_ms: u64,
}

impl SessionExtension {
    pub fn apply(&self, storage: &Storage) -> Result<(), StorageError> {
        storage.extend_session(&self.token_hash, self.expires_at_ms)
    }
}

/// The sessions whose extension is being written, so that a burst of requests writes each only once.
#[derive(Debug, Default)]
pub struct PendingExtensions {
    token_hashes: Mutex<HashSet<String>>,
}

impl PendingExtensions {
    /// Whether the caller should write the extension, because no one else is writing it.
    fn claim(&self, extension: &SessionExtension) -> bool {
        self.locked().insert(extension.token_hash.clone())
    }

    fn release(&self, extension: &SessionExtension) {
        self.locked().remove(&extension.token_hash);
    }

    /// A panic while the set was held leaves it consistent, so its lock is used even when poisoned.
    fn locked(&self) -> MutexGuard<'_, HashSet<String>> {
        self.token_hashes
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
    }
}

/// Writes the extension on the blocking thread pool without waiting for it.
/// A failed write is only logged, since the session stays valid until its current expiry.
pub fn extend_in_background(
    storage: Arc<Storage>,
    pending: Arc<PendingExtensions>,
    extension: SessionExtension,
) {
    if !pending.claim(&extension) {
        return;
    }
    drop(tokio::task::spawn_blocking(move || {
        if let Err(error) = extension.apply(&storage) {
            tracing::debug!("could not extend a session: {error}");
        }
        pending.release(&extension);
    }));
}

#[cfg(test)]
mod tests {
    use super::*;

    fn extension() -> SessionExtension {
        SessionExtension {
            token_hash: "hash".to_string(),
            expires_at_ms: 1,
        }
    }

    #[test]
    fn only_the_first_claim_writes() {
        let pending = PendingExtensions::default();
        pending.claim(&extension());
        assert!(!pending.claim(&extension()));
    }

    #[test]
    fn a_released_extension_may_be_claimed_again() {
        let pending = PendingExtensions::default();
        pending.claim(&extension());
        pending.release(&extension());
        assert!(pending.claim(&extension()));
    }
}

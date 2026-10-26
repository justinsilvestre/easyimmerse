//! Recording that a session is in use, without making its request wait for the database's writer.

use std::collections::HashSet;
use std::sync::{Arc, Mutex, MutexGuard, PoisonError};

use easyimmerse_storage::{LiveSession, Storage, StorageError};

use crate::accounts::session_tokens::{
    LAST_USE_PRECISION_MS, SESSION_LIFETIME_MS, SESSION_RENEWAL_HORIZON_MS,
};

/// What a session in use is due: a new time of last use, and a new expiry when the current one is near.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SessionRefresh {
    pub token_hash: String,
    pub last_used_at_ms: u64,
    pub expires_at_ms: Option<u64>,
}

impl SessionRefresh {
    /// The refresh that the session, used at `now_ms`, is due.
    /// Its time of last use is rewritten at most once an hour, and its expiry at most once a day.
    pub fn due(token_hash: String, session: &LiveSession, now_ms: u64) -> Option<Self> {
        let is_expiry_due =
            session.expires_at_ms < now_ms.saturating_add(SESSION_RENEWAL_HORIZON_MS);
        let is_use_due = now_ms
            >= session
                .last_used_at_ms
                .saturating_add(LAST_USE_PRECISION_MS);
        (is_expiry_due || is_use_due).then(|| SessionRefresh {
            token_hash,
            last_used_at_ms: now_ms,
            expires_at_ms: is_expiry_due.then(|| now_ms.saturating_add(SESSION_LIFETIME_MS)),
        })
    }

    pub fn apply(&self, storage: &Storage) -> Result<(), StorageError> {
        storage.refresh_session(&self.token_hash, self.last_used_at_ms, self.expires_at_ms)
    }
}

/// The sessions whose refresh is being written, so that a burst of requests writes each only once.
#[derive(Debug, Default)]
pub struct PendingRefreshes {
    token_hashes: Mutex<HashSet<String>>,
}

impl PendingRefreshes {
    /// Whether the caller should write the refresh, because no one else is writing one for the session.
    fn claim(&self, refresh: &SessionRefresh) -> bool {
        self.locked().insert(refresh.token_hash.clone())
    }

    fn release(&self, refresh: &SessionRefresh) {
        self.locked().remove(&refresh.token_hash);
    }

    /// A panic while the set was held leaves it consistent, so its lock is used even when poisoned.
    fn locked(&self) -> MutexGuard<'_, HashSet<String>> {
        self.token_hashes
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
    }
}

/// Writes the refresh on the blocking thread pool without waiting for it.
/// A failed write is only logged, since the session stays valid until its current expiry.
pub fn refresh_in_background(
    storage: Arc<Storage>,
    pending: Arc<PendingRefreshes>,
    refresh: SessionRefresh,
) {
    if !pending.claim(&refresh) {
        return;
    }
    drop(tokio::task::spawn_blocking(move || {
        if let Err(error) = refresh.apply(&storage) {
            tracing::debug!("could not refresh a session: {error}");
        }
        pending.release(&refresh);
    }));
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::account::{AccountRole, AccountUser};

    use super::*;

    const HOUR_MS: u64 = 60 * 60 * 1000;

    fn refresh() -> SessionRefresh {
        SessionRefresh {
            token_hash: "hash".to_string(),
            last_used_at_ms: 1,
            expires_at_ms: None,
        }
    }

    /// A session last used at zero that expires ninety days later.
    fn fresh_session() -> LiveSession {
        LiveSession {
            id: "id".to_string(),
            user: AccountUser {
                id: "u".to_string(),
                email: "reader@example.com".to_string(),
                role: AccountRole::LibraryUser,
                created_at_ms: 0,
                email_confirmed_at_ms: None,
                manages_library: false,
            },
            last_used_at_ms: 0,
            expires_at_ms: SESSION_LIFETIME_MS,
        }
    }

    fn due_at(now_ms: u64) -> Option<SessionRefresh> {
        SessionRefresh::due("hash".to_string(), &fresh_session(), now_ms)
    }

    #[test]
    fn only_the_first_claim_writes() {
        let pending = PendingRefreshes::default();
        pending.claim(&refresh());
        assert!(!pending.claim(&refresh()));
    }

    #[test]
    fn a_released_refresh_may_be_claimed_again() {
        let pending = PendingRefreshes::default();
        pending.claim(&refresh());
        pending.release(&refresh());
        assert!(pending.claim(&refresh()));
    }

    #[test]
    fn a_session_used_within_the_hour_is_due_nothing() {
        assert_eq!(due_at(HOUR_MS - 1), None);
    }

    #[test]
    fn a_session_used_an_hour_later_records_the_use() {
        assert_eq!(
            due_at(HOUR_MS).map(|due| due.last_used_at_ms),
            Some(HOUR_MS)
        );
    }

    #[test]
    fn a_session_used_an_hour_later_keeps_its_expiry() {
        assert_eq!(due_at(HOUR_MS).and_then(|due| due.expires_at_ms), None);
    }

    #[test]
    fn a_session_used_over_a_day_later_is_extended() {
        let day_ms = 25 * HOUR_MS;
        assert_eq!(
            due_at(day_ms).and_then(|due| due.expires_at_ms),
            Some(day_ms + SESSION_LIFETIME_MS)
        );
    }
}

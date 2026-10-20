//! Slows down password guessing: an email address, or a peer address, with too many recent failed logins must wait.

use std::net::IpAddr;
use std::sync::{Mutex, MutexGuard, PoisonError};

use crate::accounts::error::AccountsError;
use crate::accounts::failure_log::FailureLog;

/// How many failed logins an email address may have within the window.
const EMAIL_FAILURE_LIMIT: usize = 5;
/// How many failed logins a peer address may have within the window, across every email address.
const PEER_FAILURE_LIMIT: usize = 30;

/// The failed logins of the last fifteen minutes, kept in memory.
#[derive(Debug)]
pub struct LoginThrottle {
    by_email: Mutex<FailureLog<String>>,
    by_peer: Mutex<FailureLog<IpAddr>>,
}

impl Default for LoginThrottle {
    fn default() -> Self {
        Self {
            by_email: Mutex::new(FailureLog::new(EMAIL_FAILURE_LIMIT)),
            by_peer: Mutex::new(FailureLog::new(PEER_FAILURE_LIMIT)),
        }
    }
}

impl LoginThrottle {
    /// Fails with `TooManyAttempts` when the email address or the peer must wait.
    pub fn ensure_allowed(
        &self,
        email: &str,
        peer: Option<IpAddr>,
        now_ms: u64,
    ) -> Result<(), AccountsError> {
        let by_email = locked(&self.by_email).retry_after_ms(&throttle_key(email), now_ms);
        let by_peer = peer.and_then(|peer| locked(&self.by_peer).retry_after_ms(&peer, now_ms));
        match by_email.max(by_peer) {
            Some(retry_after_ms) => Err(AccountsError::TooManyAttempts {
                retry_after_secs: retry_after_ms.div_ceil(1000),
            }),
            None => Ok(()),
        }
    }

    pub fn record_failure(&self, email: &str, peer: Option<IpAddr>, now_ms: u64) {
        locked(&self.by_email).record(throttle_key(email), now_ms);
        if let Some(peer) = peer {
            locked(&self.by_peer).record(peer, now_ms);
        }
    }

    /// Forgets the failed logins of the email address, after a successful one.
    pub fn clear(&self, email: &str) {
        locked(&self.by_email).clear(&throttle_key(email));
    }
}

/// Email addresses are compared without regard to letter case, as storage compares them.
fn throttle_key(email: &str) -> String {
    email.trim().to_lowercase()
}

/// A panic while the log was held leaves it consistent, so its lock is used even when poisoned.
fn locked<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    mutex.lock().unwrap_or_else(PoisonError::into_inner)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn throttle_after_failures(email: &str, count: usize, peer: Option<IpAddr>) -> LoginThrottle {
        let throttle = LoginThrottle::default();
        for _ in 0..count {
            throttle.record_failure(email, peer, 1_000);
        }
        throttle
    }

    #[test]
    fn allows_four_failures() {
        let throttle = throttle_after_failures("reader@example.com", 4, None);
        assert!(
            throttle
                .ensure_allowed("reader@example.com", None, 2_000)
                .is_ok()
        );
    }

    #[test]
    fn stops_an_address_after_five_failures_in_any_letter_case() {
        let throttle = throttle_after_failures("reader@example.com", 5, None);
        let result = throttle.ensure_allowed(" Reader@Example.com", None, 2_000);
        assert!(matches!(result, Err(AccountsError::TooManyAttempts { .. })));
    }

    #[test]
    fn rounds_the_wait_up_to_whole_seconds() {
        let throttle = throttle_after_failures("reader@example.com", 5, None);
        let result = throttle.ensure_allowed("reader@example.com", None, 1_500);
        assert!(matches!(
            result,
            Err(AccountsError::TooManyAttempts {
                retry_after_secs: 900
            })
        ));
    }

    #[test]
    fn stops_a_peer_after_thirty_failures_across_addresses() {
        let peer = Some(IpAddr::from([192, 0, 2, 1]));
        let throttle = LoginThrottle::default();
        for index in 0..30 {
            throttle.record_failure(&format!("user{index}@example.com"), peer, 1_000);
        }
        assert!(
            throttle
                .ensure_allowed("new@example.com", peer, 2_000)
                .is_err()
        );
    }

    #[test]
    fn lets_a_cleared_address_try_again() {
        let throttle = throttle_after_failures("reader@example.com", 5, None);
        throttle.clear("reader@example.com");
        assert!(
            throttle
                .ensure_allowed("reader@example.com", None, 2_000)
                .is_ok()
        );
    }
}

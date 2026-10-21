//! Slows down password guessing by counting recent login attempts.
//!
//! The strict limit counts the attempts at one email address from one peer address,
//! so that a guesser elsewhere cannot lock the owner of the address out.
//! Looser limits count every attempt from a peer, and every attempt at an email address.

use std::net::IpAddr;
use std::sync::{Mutex, MutexGuard, PoisonError};

use crate::accounts::error::AccountsError;
use crate::accounts::failure_log::FailureLog;

/// How many attempts at one email address one peer may make within the window.
const EMAIL_AND_PEER_LIMIT: usize = 5;
/// How many attempts a peer may make within the window, across every email address.
const PEER_LIMIT: usize = 30;
/// How many attempts at an email address may be made within the window, from every peer together.
const EMAIL_LIMIT: usize = 50;

/// The login attempts of the last fifteen minutes, kept in memory.
#[derive(Debug, Default)]
pub struct LoginThrottle {
    logs: Mutex<AttemptLogs>,
}

/// One login attempt, counted until it succeeds.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LoginAttempt {
    email: String,
    peer: Option<IpAddr>,
}

#[derive(Debug)]
struct AttemptLogs {
    by_email_and_peer: FailureLog<(String, Option<IpAddr>)>,
    by_peer: FailureLog<IpAddr>,
    by_email: FailureLog<String>,
}

impl LoginThrottle {
    /// Counts an attempt to log in, or fails with `TooManyAttempts` without counting it.
    /// The check and the count happen together, so that concurrent attempts cannot pass the limit.
    pub fn begin_attempt(
        &self,
        email: &str,
        peer: Option<IpAddr>,
        now_ms: u64,
    ) -> Result<LoginAttempt, AccountsError> {
        let attempt = LoginAttempt {
            email: throttle_key(email),
            peer,
        };
        let mut logs = self.locked();
        logs.ensure_allowed(&attempt, now_ms)?;
        logs.record(&attempt, now_ms);
        Ok(attempt)
    }

    /// Fails with `TooManyAttempts` when an attempt would be refused, without counting one.
    pub fn ensure_allowed(
        &self,
        email: &str,
        peer: Option<IpAddr>,
        now_ms: u64,
    ) -> Result<(), AccountsError> {
        let attempt = LoginAttempt {
            email: throttle_key(email),
            peer,
        };
        self.locked().ensure_allowed(&attempt, now_ms)
    }

    /// Stops counting a successful attempt, and forgets the earlier attempts of its peer at its address.
    pub fn succeeded(&self, attempt: &LoginAttempt) {
        let mut logs = self.locked();
        logs.by_email_and_peer
            .clear(&(attempt.email.clone(), attempt.peer));
        logs.by_email.forget_latest(&attempt.email);
        if let Some(peer) = attempt.peer {
            logs.by_peer.forget_latest(&peer);
        }
    }

    /// A panic while the logs were held leaves them consistent, so their lock is used even when poisoned.
    fn locked(&self) -> MutexGuard<'_, AttemptLogs> {
        self.logs.lock().unwrap_or_else(PoisonError::into_inner)
    }
}

impl Default for AttemptLogs {
    fn default() -> Self {
        Self {
            by_email_and_peer: FailureLog::new(EMAIL_AND_PEER_LIMIT),
            by_peer: FailureLog::new(PEER_LIMIT),
            by_email: FailureLog::new(EMAIL_LIMIT),
        }
    }
}

impl AttemptLogs {
    fn ensure_allowed(&self, attempt: &LoginAttempt, now_ms: u64) -> Result<(), AccountsError> {
        let pair = (attempt.email.clone(), attempt.peer);
        let waits = [
            self.by_email_and_peer.retry_after_ms(&pair, now_ms),
            attempt
                .peer
                .and_then(|peer| self.by_peer.retry_after_ms(&peer, now_ms)),
            self.by_email.retry_after_ms(&attempt.email, now_ms),
        ];
        match waits.into_iter().flatten().max() {
            Some(retry_after_ms) => Err(AccountsError::TooManyAttempts {
                retry_after_secs: retry_after_ms.div_ceil(1000),
            }),
            None => Ok(()),
        }
    }

    fn record(&mut self, attempt: &LoginAttempt, now_ms: u64) {
        self.by_email_and_peer
            .record((attempt.email.clone(), attempt.peer), now_ms);
        self.by_email.record(attempt.email.clone(), now_ms);
        if let Some(peer) = attempt.peer {
            self.by_peer.record(peer, now_ms);
        }
    }
}

/// Email addresses are compared without regard to letter case, as storage compares them.
fn throttle_key(email: &str) -> String {
    email.trim().to_lowercase()
}

#[cfg(test)]
mod tests {
    use super::*;

    const EMAIL: &str = "reader@example.com";

    fn peer(last: u8) -> Option<IpAddr> {
        Some(IpAddr::from([192, 0, 2, last]))
    }

    fn throttle_after_attempts(email: &str, count: usize, peer: Option<IpAddr>) -> LoginThrottle {
        let throttle = LoginThrottle::default();
        for _ in 0..count {
            throttle.begin_attempt(email, peer, 1_000).unwrap();
        }
        throttle
    }

    #[test]
    fn allows_a_fifth_attempt() {
        let throttle = throttle_after_attempts(EMAIL, 4, peer(1));
        assert!(throttle.begin_attempt(EMAIL, peer(1), 2_000).is_ok());
    }

    #[test]
    fn refuses_a_sixth_attempt_from_the_same_peer_in_any_letter_case() {
        let throttle = throttle_after_attempts(EMAIL, 5, peer(1));
        let result = throttle.begin_attempt(" Reader@Example.com", peer(1), 2_000);
        assert!(matches!(result, Err(AccountsError::TooManyAttempts { .. })));
    }

    #[test]
    fn lets_another_peer_try_the_same_address() {
        let throttle = throttle_after_attempts(EMAIL, 5, peer(1));
        assert!(throttle.begin_attempt(EMAIL, peer(2), 2_000).is_ok());
    }

    #[test]
    fn rounds_the_wait_up_to_whole_seconds() {
        let throttle = throttle_after_attempts(EMAIL, 5, peer(1));
        let result = throttle.begin_attempt(EMAIL, peer(1), 1_500);
        assert!(matches!(
            result,
            Err(AccountsError::TooManyAttempts {
                retry_after_secs: 900
            })
        ));
    }

    #[test]
    fn refuses_a_peer_after_thirty_attempts_across_addresses() {
        let throttle = LoginThrottle::default();
        for index in 0..30 {
            let email = format!("user{index}@example.com");
            throttle.begin_attempt(&email, peer(1), 1_000).unwrap();
        }
        assert!(throttle.begin_attempt(EMAIL, peer(1), 2_000).is_err());
    }

    #[test]
    fn refuses_an_address_after_fifty_attempts_from_every_peer() {
        let throttle = LoginThrottle::default();
        for index in 0..50 {
            throttle.begin_attempt(EMAIL, peer(index), 1_000).unwrap();
        }
        assert!(throttle.begin_attempt(EMAIL, peer(200), 2_000).is_err());
    }

    #[test]
    fn a_success_lets_the_peer_try_the_address_again() {
        let throttle = throttle_after_attempts(EMAIL, 4, peer(1));
        let attempt = throttle.begin_attempt(EMAIL, peer(1), 1_000).unwrap();
        throttle.succeeded(&attempt);
        assert!(throttle.begin_attempt(EMAIL, peer(1), 2_000).is_ok());
    }

    #[test]
    fn a_success_does_not_count_against_the_peer() {
        let throttle = LoginThrottle::default();
        for index in 0..30 {
            let email = format!("user{index}@example.com");
            let attempt = throttle.begin_attempt(&email, peer(1), 1_000).unwrap();
            throttle.succeeded(&attempt);
        }
        assert!(throttle.begin_attempt(EMAIL, peer(1), 2_000).is_ok());
    }

    #[test]
    fn checking_does_not_count_an_attempt() {
        let throttle = throttle_after_attempts(EMAIL, 4, peer(1));
        throttle.ensure_allowed(EMAIL, peer(1), 1_000).unwrap();
        assert!(throttle.begin_attempt(EMAIL, peer(1), 2_000).is_ok());
    }
}

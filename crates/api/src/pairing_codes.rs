//! The pairing code that lets another device on the local network obtain the launch token.
//!
//! At most one code is active at a time. It is single-use and expires.
//! Failed claims are counted per peer address and across all peers,
//! so that neither one device nor many addresses together can guess codes quickly.

use std::collections::HashMap;
use std::net::IpAddr;
use std::sync::{Mutex, MutexGuard, PoisonError};

use thiserror::Error;

/// How long a pairing code stays valid.
pub const PAIRING_CODE_VALIDITY_MS: u64 = 10 * 60 * 1000;
/// How many failed claims a peer may make within the window.
const FAILED_CLAIM_LIMIT: usize = 10;
/// How many failed claims all peers together may make within the window.
const FAILED_CLAIM_LIMIT_OF_ALL_PEERS: usize = 100;
/// How long a failed claim counts against its peer and against all peers.
const FAILED_CLAIM_WINDOW_MS: u64 = 15 * 60 * 1000;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum PairingError {
    #[error("the pairing code is wrong or has expired")]
    InvalidCode,
    #[error("too many failed pairing attempts; try again in {retry_after_secs} seconds")]
    TooManyAttempts { retry_after_secs: u64 },
}

/// A code that was issued, and when it stops being valid, in milliseconds since the Unix epoch.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IssuedCode {
    pub code: String,
    pub expires_at_ms: u64,
}

/// The active pairing code and the recent failed claims, kept in memory.
#[derive(Debug)]
pub struct PairingCodeState {
    validity_ms: u64,
    inner: Mutex<CodeAndFailures>,
}

#[derive(Debug, Default)]
struct CodeAndFailures {
    active: Option<IssuedCode>,
    failed_claims: HashMap<Option<IpAddr>, Vec<u64>>,
    failed_claims_of_all_peers: Vec<u64>,
}

impl Default for PairingCodeState {
    fn default() -> Self {
        Self::with_validity_ms(PAIRING_CODE_VALIDITY_MS)
    }
}

impl PairingCodeState {
    /// Builds the state with codes that stay valid for `validity_ms`.
    pub fn with_validity_ms(validity_ms: u64) -> Self {
        Self {
            validity_ms,
            inner: Mutex::default(),
        }
    }

    /// Makes `code` the active code, replacing any earlier one.
    pub fn issue(&self, code: String, now_ms: u64) -> IssuedCode {
        let issued = IssuedCode {
            code,
            expires_at_ms: now_ms.saturating_add(self.validity_ms),
        };
        self.locked().active = Some(issued.clone());
        issued
    }

    /// Uses up the active code when `code` equals it and it has not expired.
    /// The check for too many failures comes first, so that a limited peer learns nothing.
    pub fn claim(&self, code: &str, peer: Option<IpAddr>, now_ms: u64) -> Result<(), PairingError> {
        self.locked().claim(code, peer, now_ms)
    }

    /// A panic while the state was held leaves it consistent, so its lock is used even when poisoned.
    fn locked(&self) -> MutexGuard<'_, CodeAndFailures> {
        self.inner.lock().unwrap_or_else(PoisonError::into_inner)
    }
}

impl CodeAndFailures {
    fn claim(&mut self, code: &str, peer: Option<IpAddr>, now_ms: u64) -> Result<(), PairingError> {
        self.forget_old_failures(now_ms);
        if let Some(retry_after_ms) = self.retry_after_ms(peer) {
            return Err(PairingError::TooManyAttempts {
                retry_after_secs: retry_after_ms.saturating_sub(now_ms).div_ceil(1000),
            });
        }
        if self.is_active_code(code, now_ms) {
            self.active = None;
            return Ok(());
        }
        self.failed_claims.entry(peer).or_default().push(now_ms);
        self.failed_claims_of_all_peers.push(now_ms);
        Err(PairingError::InvalidCode)
    }

    fn is_active_code(&self, code: &str, now_ms: u64) -> bool {
        self.active.as_ref().is_some_and(|active| {
            now_ms < active.expires_at_ms
                && bytes_are_equal(code.as_bytes(), active.code.as_bytes())
        })
    }

    /// When the peer may claim again, or None when it may claim now.
    fn retry_after_ms(&self, peer: Option<IpAddr>) -> Option<u64> {
        let of_peer = self
            .failed_claims
            .get(&peer)
            .and_then(|failures| retry_after_failures_ms(failures, FAILED_CLAIM_LIMIT));
        let of_all_peers = retry_after_failures_ms(
            &self.failed_claims_of_all_peers,
            FAILED_CLAIM_LIMIT_OF_ALL_PEERS,
        );
        of_peer.max(of_all_peers)
    }

    fn forget_old_failures(&mut self, now_ms: u64) {
        self.failed_claims.retain(|_, failures| {
            failures.retain(|&at_ms| now_ms < at_ms.saturating_add(FAILED_CLAIM_WINDOW_MS));
            !failures.is_empty()
        });
        self.failed_claims_of_all_peers
            .retain(|&at_ms| now_ms < at_ms.saturating_add(FAILED_CLAIM_WINDOW_MS));
    }
}

/// When enough of the failures, oldest first, have left the window to bring them under `limit`.
fn retry_after_failures_ms(failures: &[u64], limit: usize) -> Option<u64> {
    let oldest_counted = failures.len().checked_sub(limit)?;
    Some(failures[oldest_counted] + FAILED_CLAIM_WINDOW_MS)
}

/// Six random decimal digits.
pub fn generate_pairing_code() -> String {
    format!("{:06}", rand::random_range(0..1_000_000u32))
}

/// Compares in time that does not depend on where the inputs differ.
fn bytes_are_equal(presented: &[u8], expected: &[u8]) -> bool {
    presented.len() == expected.len()
        && presented
            .iter()
            .zip(expected)
            .fold(0u8, |difference, (a, b)| difference | (a ^ b))
            == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    const CODE: &str = "123456";

    fn peer(last: u8) -> Option<IpAddr> {
        Some(IpAddr::from([192, 0, 2, last]))
    }

    fn peer_among_many(number: u16) -> Option<IpAddr> {
        Some(IpAddr::from([0x2001, 0xdb8, 0, 0, 0, 0, 0, number]))
    }

    fn codes_with_active_code() -> PairingCodeState {
        let codes = PairingCodeState::default();
        codes.issue(CODE.to_string(), 1_000);
        codes
    }

    fn codes_after_failed_claims(count: usize) -> PairingCodeState {
        let codes = codes_with_active_code();
        for _ in 0..count {
            let _ = codes.claim("000000", peer(1), 2_000);
        }
        codes
    }

    fn codes_after_one_failed_claim_from_each_of(peer_count: u16) -> PairingCodeState {
        let codes = codes_with_active_code();
        for number in 0..peer_count {
            let _ = codes.claim("000000", peer_among_many(number), 2_000);
        }
        codes
    }

    #[test]
    fn a_code_expires_ten_minutes_after_it_is_issued() {
        let codes = PairingCodeState::default();
        let issued = codes.issue(CODE.to_string(), 1_000);
        assert_eq!(issued.expires_at_ms, 1_000 + PAIRING_CODE_VALIDITY_MS);
    }

    #[test]
    fn accepts_the_active_code() {
        let codes = codes_with_active_code();
        assert_eq!(codes.claim(CODE, peer(1), 2_000), Ok(()));
    }

    #[test]
    fn refuses_a_code_claimed_before() {
        let codes = codes_with_active_code();
        codes.claim(CODE, peer(1), 2_000).unwrap();
        assert_eq!(
            codes.claim(CODE, peer(1), 3_000),
            Err(PairingError::InvalidCode)
        );
    }

    #[test]
    fn refuses_a_wrong_code() {
        let codes = codes_with_active_code();
        assert_eq!(
            codes.claim("654321", peer(1), 2_000),
            Err(PairingError::InvalidCode)
        );
    }

    #[test]
    fn refuses_an_expired_code() {
        let codes = codes_with_active_code();
        let expired_at = 1_000 + PAIRING_CODE_VALIDITY_MS;
        assert_eq!(
            codes.claim(CODE, peer(1), expired_at),
            Err(PairingError::InvalidCode)
        );
    }

    #[test]
    fn refuses_a_code_that_a_newer_one_replaced() {
        let codes = codes_with_active_code();
        codes.issue("999999".to_string(), 2_000);
        assert_eq!(
            codes.claim(CODE, peer(1), 3_000),
            Err(PairingError::InvalidCode)
        );
    }

    #[test]
    fn refuses_any_code_when_none_was_issued() {
        let codes = PairingCodeState::default();
        assert_eq!(
            codes.claim(CODE, peer(1), 1_000),
            Err(PairingError::InvalidCode)
        );
    }

    #[test]
    fn lets_a_peer_try_after_nine_failures() {
        let codes = codes_after_failed_claims(9);
        assert_eq!(codes.claim(CODE, peer(1), 3_000), Ok(()));
    }

    #[test]
    fn refuses_even_the_right_code_after_ten_failures() {
        let codes = codes_after_failed_claims(10);
        assert_eq!(
            codes.claim(CODE, peer(1), 3_000),
            Err(PairingError::TooManyAttempts {
                retry_after_secs: 899
            })
        );
    }

    #[test]
    fn lets_another_peer_try_after_ten_failures() {
        let codes = codes_after_failed_claims(10);
        assert_eq!(codes.claim(CODE, peer(2), 3_000), Ok(()));
    }

    #[test]
    fn lets_a_peer_try_again_once_its_failures_leave_the_window() {
        let codes = codes_after_failed_claims(10);
        let later = 2_000 + FAILED_CLAIM_WINDOW_MS;
        codes.issue(CODE.to_string(), later);
        assert_eq!(codes.claim(CODE, peer(1), later), Ok(()));
    }

    #[test]
    fn lets_a_new_peer_try_after_ninety_nine_failures_across_peers() {
        let codes = codes_after_one_failed_claim_from_each_of(99);
        assert_eq!(codes.claim(CODE, peer(1), 3_000), Ok(()));
    }

    #[test]
    fn refuses_every_peer_after_a_hundred_failures_across_peers() {
        let codes = codes_after_one_failed_claim_from_each_of(100);
        assert_eq!(
            codes.claim(CODE, peer(1), 3_000),
            Err(PairingError::TooManyAttempts {
                retry_after_secs: 899
            })
        );
    }

    #[test]
    fn lets_every_peer_try_again_once_the_failures_across_peers_leave_the_window() {
        let codes = codes_after_one_failed_claim_from_each_of(100);
        let later = 2_000 + FAILED_CLAIM_WINDOW_MS;
        codes.issue(CODE.to_string(), later);
        assert_eq!(codes.claim(CODE, peer(1), later), Ok(()));
    }

    #[test]
    fn generates_six_characters() {
        assert_eq!(generate_pairing_code().len(), 6);
    }

    #[test]
    fn generates_only_digits() {
        let code = generate_pairing_code();
        assert!(code.bytes().all(|byte| byte.is_ascii_digit()), "{code}");
    }
}

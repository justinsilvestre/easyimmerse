//! A record of recent failures per key, such as failed logins per email address.

use std::collections::HashMap;
use std::hash::Hash;

/// How long a failure counts against its key: fifteen minutes.
pub const FAILURE_WINDOW_MS: u64 = 15 * 60 * 1000;

/// Keeps, for each key, the times of its latest failures within the window, at most `limit` of them.
#[derive(Debug)]
pub struct FailureLog<K> {
    limit: usize,
    failures: HashMap<K, Vec<u64>>,
}

impl<K: Eq + Hash> FailureLog<K> {
    pub fn new(limit: usize) -> Self {
        Self {
            limit,
            failures: HashMap::new(),
        }
    }

    /// How long the key must wait before it may try again, or None when it may try now.
    pub fn retry_after_ms(&self, key: &K, now_ms: u64) -> Option<u64> {
        let times = self.failures.get(key)?;
        let recent: Vec<u64> = times
            .iter()
            .copied()
            .filter(|&at_ms| is_recent(at_ms, now_ms))
            .collect();
        let oldest_counted = recent.len().checked_sub(self.limit)?;
        Some(recent[oldest_counted] + FAILURE_WINDOW_MS - now_ms)
    }

    /// Records a failure, after forgetting every failure that left the window.
    pub fn record(&mut self, key: K, now_ms: u64) {
        self.prune(now_ms);
        let times = self.failures.entry(key).or_default();
        times.push(now_ms);
        let excess = times.len().saturating_sub(self.limit);
        times.drain(..excess);
    }

    pub fn clear(&mut self, key: &K) {
        self.failures.remove(key);
    }

    /// Forgets the key's most recent failure, as when an attempt counted as one turns out to succeed.
    pub fn forget_latest(&mut self, key: &K) {
        if let Some(times) = self.failures.get_mut(key) {
            times.pop();
            if times.is_empty() {
                self.failures.remove(key);
            }
        }
    }

    #[cfg(test)]
    pub fn len(&self) -> usize {
        self.failures.len()
    }

    fn prune(&mut self, now_ms: u64) {
        self.failures.retain(|_, times| {
            times.retain(|&at_ms| is_recent(at_ms, now_ms));
            !times.is_empty()
        });
    }
}

fn is_recent(at_ms: u64, now_ms: u64) -> bool {
    now_ms < at_ms.saturating_add(FAILURE_WINDOW_MS)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn log_with_failures(times: &[u64]) -> FailureLog<&'static str> {
        let mut log = FailureLog::new(3);
        for &at_ms in times {
            log.record("key", at_ms);
        }
        log
    }

    #[test]
    fn lets_a_key_below_the_limit_try() {
        assert_eq!(log_with_failures(&[1, 2]).retry_after_ms(&"key", 3), None);
    }

    #[test]
    fn makes_a_key_at_the_limit_wait_until_its_oldest_failure_leaves_the_window() {
        let log = log_with_failures(&[1_000, 2_000, 3_000]);
        assert_eq!(
            log.retry_after_ms(&"key", 4_000),
            Some(FAILURE_WINDOW_MS - 3_000)
        );
    }

    #[test]
    fn lets_a_key_try_once_its_failures_leave_the_window() {
        let log = log_with_failures(&[1, 2, 3]);
        assert_eq!(log.retry_after_ms(&"key", 1 + FAILURE_WINDOW_MS), None);
    }

    #[test]
    fn lets_a_cleared_key_try() {
        let mut log = log_with_failures(&[1, 2, 3]);
        log.clear(&"key");
        assert_eq!(log.retry_after_ms(&"key", 4), None);
    }

    #[test]
    fn forgetting_the_latest_failure_lets_a_key_at_the_limit_try() {
        let mut log = log_with_failures(&[1, 2, 3]);
        log.forget_latest(&"key");
        assert_eq!(log.retry_after_ms(&"key", 4), None);
    }

    #[test]
    fn forgets_other_keys_whose_failures_left_the_window() {
        let mut log = log_with_failures(&[1]);
        log.record("other", 1 + FAILURE_WINDOW_MS);
        assert_eq!(log.len(), 1);
    }
}

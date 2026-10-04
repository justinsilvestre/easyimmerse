//! Which entries to remove when the cache is over its limit.

use crate::key::ConversionKey;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EvictionCandidate {
    pub key: ConversionKey,
    pub size_bytes: u64,
    /// Entries that only change the container are cheap to redo, so they go first.
    pub copies_only: bool,
    /// When the entry was last served, in milliseconds since the Unix epoch.
    pub last_used_ms: u64,
    /// An entry with an active run, a waiting request, or a request in the last ten minutes.
    pub in_use: bool,
}

/// Picks entries to remove, least recently used first and copy-only entries before
/// transcodes, until the usage is under the limit. Entries in use are never picked.
pub fn select_evictions(
    mut candidates: Vec<EvictionCandidate>,
    usage_bytes: u64,
    limit_bytes: u64,
) -> Vec<ConversionKey> {
    candidates.retain(|candidate| !candidate.in_use);
    candidates.sort_by_key(|candidate| (!candidate.copies_only, candidate.last_used_ms));
    let mut remaining = usage_bytes;
    let mut evicted = Vec::new();
    for candidate in candidates {
        if remaining <= limit_bytes {
            break;
        }
        remaining = remaining.saturating_sub(candidate.size_bytes);
        evicted.push(candidate.key);
    }
    evicted
}

#[cfg(test)]
mod tests {
    use super::*;

    fn key(digit: char) -> ConversionKey {
        ConversionKey::parse(&digit.to_string().repeat(64)).expect("key")
    }

    fn candidate(digit: char, copies_only: bool, last_used_ms: u64) -> EvictionCandidate {
        EvictionCandidate {
            key: key(digit),
            size_bytes: 100,
            copies_only,
            last_used_ms,
            in_use: false,
        }
    }

    #[test]
    fn evicts_nothing_under_the_limit() {
        let evicted = select_evictions(vec![candidate('a', true, 1)], 100, 100);
        assert_eq!(evicted, []);
    }

    #[test]
    fn evicts_the_least_recently_used_entry_first() {
        let candidates = vec![candidate('a', false, 2), candidate('b', false, 1)];
        assert_eq!(select_evictions(candidates, 200, 150), [key('b')]);
    }

    #[test]
    fn evicts_copy_only_entries_before_transcodes() {
        let candidates = vec![candidate('a', false, 1), candidate('b', true, 2)];
        assert_eq!(select_evictions(candidates, 200, 150), [key('b')]);
    }

    #[test]
    fn evicts_until_the_usage_is_under_the_limit() {
        let candidates = vec![
            candidate('a', true, 1),
            candidate('b', true, 2),
            candidate('c', true, 3),
        ];
        assert_eq!(select_evictions(candidates, 300, 100), [key('a'), key('b')]);
    }

    #[test]
    fn never_evicts_an_entry_in_use() {
        let busy = EvictionCandidate {
            in_use: true,
            ..candidate('a', true, 1)
        };
        assert_eq!(select_evictions(vec![busy], 100, 0), []);
    }
}

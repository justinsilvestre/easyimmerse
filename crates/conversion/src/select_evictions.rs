//! Choosing which cache entries to remove so that the cache fits its limit.

use crate::key::ConversionKey;

/// What eviction needs to know about one cache entry.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CachedEntry {
    pub key: ConversionKey,
    pub size: u64,
    pub last_access_ms: u64,
    /// Whether the entry re-encodes a track, which makes it slower to produce again than an entry that only copies tracks.
    pub has_transcode: bool,
    pub is_in_use: bool,
}

/// Returns the keys of the entries to remove, in removal order, so that the total size falls under `limit` bytes.
/// Entries in use are kept. Entries that only copy tracks go before entries that re-encode one, and the least recently used go first.
/// When removing every entry not in use is not enough, all of them are chosen.
pub fn select_evictions(entries: &[CachedEntry], limit: u64) -> Vec<ConversionKey> {
    let mut usage: u64 = entries.iter().map(|entry| entry.size).sum();
    let mut candidates: Vec<&CachedEntry> =
        entries.iter().filter(|entry| !entry.is_in_use).collect();
    candidates.sort_by_key(|entry| (entry.has_transcode, entry.last_access_ms));
    let mut evicted = Vec::new();
    for entry in candidates {
        if usage < limit {
            break;
        }
        usage = usage.saturating_sub(entry.size);
        evicted.push(entry.key.clone());
    }
    evicted
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::key;

    fn entry(name: char, size: u64, last_access_ms: u64) -> CachedEntry {
        CachedEntry {
            key: key(name),
            size,
            last_access_ms,
            has_transcode: false,
            is_in_use: false,
        }
    }

    #[test]
    fn removes_nothing_when_the_cache_is_under_the_limit() {
        let entries = [entry('a', 10, 1), entry('b', 10, 2)];
        assert_eq!(select_evictions(&entries, 21), Vec::new());
    }

    #[test]
    fn removes_the_least_recently_used_entry_first() {
        let entries = [entry('a', 10, 2), entry('b', 10, 1)];
        assert_eq!(select_evictions(&entries, 15), vec![key('b')]);
    }

    #[test]
    fn removes_entries_until_the_cache_is_under_the_limit() {
        let entries = [entry('a', 10, 3), entry('b', 10, 1), entry('c', 10, 2)];
        assert_eq!(select_evictions(&entries, 15), vec![key('b'), key('c')]);
    }

    #[test]
    fn removes_an_entry_when_the_cache_is_exactly_at_the_limit() {
        let entries = [entry('a', 10, 1)];
        assert_eq!(select_evictions(&entries, 10), vec![key('a')]);
    }

    #[test]
    fn keeps_entries_in_use() {
        let in_use = CachedEntry {
            is_in_use: true,
            ..entry('a', 10, 1)
        };
        let entries = [in_use, entry('b', 10, 2)];
        assert_eq!(select_evictions(&entries, 15), vec![key('b')]);
    }

    #[test]
    fn removes_copied_entries_before_transcoded_ones() {
        let transcoded = CachedEntry {
            has_transcode: true,
            ..entry('a', 10, 1)
        };
        let entries = [transcoded, entry('b', 10, 2)];
        assert_eq!(select_evictions(&entries, 15), vec![key('b')]);
    }

    #[test]
    fn removes_every_entry_not_in_use_when_that_is_not_enough() {
        let in_use = CachedEntry {
            is_in_use: true,
            ..entry('a', 30, 1)
        };
        let entries = [in_use, entry('b', 10, 2)];
        assert_eq!(select_evictions(&entries, 15), vec![key('b')]);
    }
}

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

/// A span of media time in milliseconds, with `end_ms` exclusive.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct TimeRange {
    pub start_ms: u64,
    pub end_ms: u64,
}

impl TimeRange {
    pub fn contains(&self, time_ms: u64) -> bool {
        self.start_ms <= time_ms && time_ms < self.end_ms
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const RANGE: TimeRange = TimeRange {
        start_ms: 500,
        end_ms: 1500,
    };

    #[test]
    fn contains_its_start() {
        assert!(RANGE.contains(500));
    }

    #[test]
    fn excludes_its_end() {
        assert!(!RANGE.contains(1500));
    }
}

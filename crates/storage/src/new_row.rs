//! What every new row gets: a random id and the time it was created.

use std::time::{SystemTime, UNIX_EPOCH};

/// Sixteen random bytes, hex encoded.
pub fn generate_id() -> String {
    hex::encode(rand::random::<[u8; 16]>())
}

/// The clock is only ever behind the epoch on a misconfigured machine; such a time is reported as zero.
pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| u64::try_from(elapsed.as_millis()).unwrap_or(u64::MAX))
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generates_a_32_character_hex_id() {
        assert_eq!(generate_id().len(), 32);
    }

    #[test]
    fn generates_distinct_ids() {
        assert_ne!(generate_id(), generate_id());
    }
}

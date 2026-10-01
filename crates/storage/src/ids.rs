/// Generates a record identifier: 16 random bytes, hex encoded.
pub fn generate_id() -> String {
    hex::encode(rand::random::<[u8; 16]>())
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

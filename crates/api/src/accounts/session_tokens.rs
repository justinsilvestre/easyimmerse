//! Session tokens are random, and stored only as their SHA-256 hashes,
//! so that someone who reads the database cannot present them.

use sha2::{Digest, Sha256};

/// How long a session lasts after it is created: ninety days.
pub const SESSION_LIFETIME_MS: u64 = 90 * 24 * 60 * 60 * 1000;

/// Thirty-two random bytes, hex encoded.
pub fn generate_session_token() -> String {
    hex::encode(rand::random::<[u8; 32]>())
}

/// The SHA-256 hash of the token, hex encoded.
pub fn hash_session_token(token: &str) -> String {
    hex::encode(Sha256::digest(token.as_bytes()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generates_a_64_character_token() {
        assert_eq!(generate_session_token().len(), 64);
    }

    #[test]
    fn generates_distinct_tokens() {
        assert_ne!(generate_session_token(), generate_session_token());
    }

    #[test]
    fn hashes_a_token_with_sha256() {
        assert_eq!(
            hash_session_token("abc"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }
}

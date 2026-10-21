//! Passwords are stored as Argon2id hashes in PHC string form, with the crate's default parameters.

use argon2::Argon2;
use argon2::password_hash::{PasswordHasher, PasswordVerifier};

use crate::accounts::error::AccountsError;

/// The hash of a password that no one knows.
/// A login with an unknown email address is checked against it,
/// so that it takes as long as a login with a wrong password.
const DUMMY_PASSWORD_HASH: &str = "$argon2id$v=19$m=19456,t=2,p=1$JTu3ExpDsL6QlK9dPAfzQA$bKK0//MqxSBExGWjO8fPJ54tx+1uIZcjv5Vl1o8K4yo";

pub fn hash_password(password: &str) -> Result<String, AccountsError> {
    Argon2::default()
        .hash_password(password.as_bytes())
        .map(|hash| hash.to_string())
        .map_err(|error| AccountsError::Hashing(error.to_string()))
}

/// A stored hash that cannot be read counts as a mismatch.
pub fn password_matches(password: &str, password_hash: &str) -> bool {
    Argon2::default()
        .verify_password(password.as_bytes(), password_hash)
        .is_ok()
}

/// Spends the time of one password check, for a login whose email address has no account.
pub fn check_against_dummy_hash(password: &str) {
    let _ = password_matches(password, DUMMY_PASSWORD_HASH);
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The algorithm, version and parameters of a PHC string: everything before the salt.
    fn hash_settings(hash: &str) -> &str {
        hash.rsplitn(3, '$').last().unwrap()
    }

    #[test]
    fn a_hash_matches_its_password() {
        let hash = hash_password("correct horse").unwrap();
        assert!(password_matches("correct horse", &hash));
    }

    #[test]
    fn a_hash_does_not_match_another_password() {
        let hash = hash_password("correct horse").unwrap();
        assert!(!password_matches("battery staple", &hash));
    }

    #[test]
    fn a_malformed_hash_matches_nothing() {
        assert!(!password_matches("anything", "not a hash"));
    }

    #[test]
    fn hashes_with_argon2id() {
        assert!(hash_password("password").unwrap().starts_with("$argon2id$"));
    }

    #[test]
    fn the_dummy_hash_has_the_settings_of_a_real_one() {
        let real = hash_password("password").unwrap();
        assert_eq!(hash_settings(DUMMY_PASSWORD_HASH), hash_settings(&real));
    }
}

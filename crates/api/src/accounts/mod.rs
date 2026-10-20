//! Accounts and their sessions: the operations that the HTTP routes and the command line share.
//! Passwords are hashed with Argon2id and session tokens with SHA-256 here, and nowhere else.

mod credentials;
mod error;
mod failure_log;
mod login_throttle;
mod password_hashing;
mod session_tokens;

pub use error::AccountsError;
pub use login_throttle::LoginThrottle;

use easyimmerse_core::account::{AccountRole, AccountUser};
use easyimmerse_storage::{Storage, StorageError};

use credentials::{ensure_password_long_enough, normalized_email};
use password_hashing::{check_against_dummy_hash, hash_password, password_matches};
use session_tokens::{SESSION_LIFETIME_MS, generate_session_token, hash_session_token};

/// Creates an account after checking that its email address and password follow the rules.
pub fn create_account(
    storage: &Storage,
    email: &str,
    password: &str,
    role: AccountRole,
) -> Result<AccountUser, AccountsError> {
    let email = normalized_email(email)?;
    ensure_password_long_enough(password)?;
    let password_hash = hash_password(password)?;
    Ok(storage.create_user(&email, &password_hash, role)?)
}

/// Finds the account with the email address and password.
/// An unknown address and a wrong password fail alike, and take about as long.
pub fn authenticate(
    storage: &Storage,
    email: &str,
    password: &str,
) -> Result<AccountUser, AccountsError> {
    match storage.find_user_by_email(email.trim())? {
        Some(stored) if password_matches(password, &stored.password_hash) => Ok(stored.user),
        Some(_) => Err(AccountsError::InvalidCredentials),
        None => {
            check_against_dummy_hash(password);
            Err(AccountsError::InvalidCredentials)
        }
    }
}

/// Starts a session of the user and returns its token. Deletes every expired session on the way.
pub fn start_session(
    storage: &Storage,
    user_id: &str,
    now_ms: u64,
) -> Result<String, StorageError> {
    storage.delete_expired_sessions(now_ms)?;
    let token = generate_session_token();
    let expires_at_ms = now_ms.saturating_add(SESSION_LIFETIME_MS);
    storage.create_session(&hash_session_token(&token), user_id, expires_at_ms)?;
    Ok(token)
}

/// Finds the user of the session with the token, unless it has expired by `now_ms`.
pub fn find_session_user(
    storage: &Storage,
    token: &str,
    now_ms: u64,
) -> Result<Option<AccountUser>, StorageError> {
    storage.find_session_user(&hash_session_token(token), now_ms)
}

pub fn end_session(storage: &Storage, token: &str) -> Result<(), StorageError> {
    storage.delete_session(&hash_session_token(token))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn storage_with_reader() -> Storage {
        let storage = Storage::open_in_memory().unwrap();
        create_account(
            &storage,
            "reader@example.com",
            "correct horse",
            AccountRole::LibraryUser,
        )
        .unwrap();
        storage
    }

    #[test]
    fn stores_the_trimmed_email_address() {
        let storage = Storage::open_in_memory().unwrap();
        let user = create_account(
            &storage,
            " reader@example.com ",
            "correct horse",
            AccountRole::LibraryUser,
        )
        .unwrap();
        assert_eq!(user.email, "reader@example.com");
    }

    #[test]
    fn authenticates_with_the_right_password_in_any_letter_case_of_the_address() {
        let storage = storage_with_reader();
        let user = authenticate(&storage, "Reader@Example.com", "correct horse").unwrap();
        assert_eq!(user.email, "reader@example.com");
    }

    #[test]
    fn refuses_a_wrong_password() {
        let storage = storage_with_reader();
        let result = authenticate(&storage, "reader@example.com", "battery staple");
        assert!(matches!(result, Err(AccountsError::InvalidCredentials)));
    }

    #[test]
    fn refuses_an_unknown_address_like_a_wrong_password() {
        let storage = storage_with_reader();
        let result = authenticate(&storage, "other@example.com", "correct horse");
        assert!(matches!(result, Err(AccountsError::InvalidCredentials)));
    }

    #[test]
    fn finds_the_user_of_a_started_session() {
        let storage = storage_with_reader();
        let user = authenticate(&storage, "reader@example.com", "correct horse").unwrap();
        let token = start_session(&storage, &user.id, 1_000).unwrap();
        assert_eq!(
            find_session_user(&storage, &token, 2_000).unwrap(),
            Some(user)
        );
    }

    #[test]
    fn a_session_expires_after_ninety_days() {
        let storage = storage_with_reader();
        let user = authenticate(&storage, "reader@example.com", "correct horse").unwrap();
        let token = start_session(&storage, &user.id, 0).unwrap();
        assert_eq!(
            find_session_user(&storage, &token, SESSION_LIFETIME_MS).unwrap(),
            None
        );
    }

    #[test]
    fn an_ended_session_finds_no_user() {
        let storage = storage_with_reader();
        let user = authenticate(&storage, "reader@example.com", "correct horse").unwrap();
        let token = start_session(&storage, &user.id, 1_000).unwrap();
        end_session(&storage, &token).unwrap();
        assert_eq!(find_session_user(&storage, &token, 2_000).unwrap(), None);
    }
}

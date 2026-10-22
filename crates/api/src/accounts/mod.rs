//! Accounts and their sessions: the operations that the HTTP routes and the command line share.
//! Passwords are hashed with Argon2id and session tokens with SHA-256 here, and nowhere else.

mod credentials;
mod email_tokens;
mod error;
mod failure_log;
mod login_throttle;
mod mail_throttle;
mod password_hashing;
mod session_refresh;
mod session_tokens;

pub use credentials::ensure_credentials_bounded;
pub use email_tokens::{confirm_email, issue_email_token, reset_password};
pub use error::AccountsError;
pub use login_throttle::{LoginAttempt, LoginThrottle};
pub use mail_throttle::MailThrottle;
pub use session_refresh::{PendingRefreshes, SessionRefresh, refresh_in_background};
pub use session_tokens::hash_session_token;

use easyimmerse_core::account::{AccountRole, AccountUser};
use easyimmerse_storage::{NewSession, Storage, StorageError};

use credentials::{ensure_password_acceptable, normalized_email};
use password_hashing::{check_against_dummy_hash, hash_password, password_matches};
use session_tokens::{SESSION_LIFETIME_MS, generate_session_token};

/// Creates an account after checking that its email address and password follow the rules.
pub fn create_account(
    storage: &Storage,
    email: &str,
    password: &str,
    role: AccountRole,
) -> Result<AccountUser, AccountsError> {
    let email = normalized_email(email)?;
    ensure_password_acceptable(password)?;
    let password_hash = hash_password(password)?;
    Ok(storage.create_user(&email, &password_hash, role)?)
}

/// Gives an account a new password, after checking that it follows the rules, and ends all of its sessions.
pub fn set_password(storage: &Storage, user_id: &str, password: &str) -> Result<(), AccountsError> {
    ensure_password_acceptable(password)?;
    let password_hash = hash_password(password)?;
    Ok(storage.set_password_hash(user_id, &password_hash)?)
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

/// Starts a session of the user on the device that `user_agent` describes and returns its token.
/// Deletes every expired session on the way.
pub fn start_session(
    storage: &Storage,
    user_id: &str,
    user_agent: &str,
    now_ms: u64,
) -> Result<String, StorageError> {
    storage.delete_expired_sessions(now_ms)?;
    let token = generate_session_token();
    storage.create_session(&NewSession {
        token_hash: &hash_session_token(&token),
        user_id,
        user_agent,
        created_at_ms: now_ms,
        expires_at_ms: now_ms.saturating_add(SESSION_LIFETIME_MS),
    })?;
    Ok(token)
}

/// The session that a token belongs to: its id, its user, and the refresh it is due, if any.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FoundSession {
    pub id: String,
    pub user: AccountUser,
    /// Present when the session's last use was recorded an hour or more ago, or its expiry lies less than 89 days ahead.
    /// Applying it records the use, and in the second case makes the session last ninety days from now,
    /// so that a session in use never expires.
    pub refresh: Option<SessionRefresh>,
}

/// Finds the session with the token, unless it has expired by `now_ms`. Only reads.
pub fn find_session(
    storage: &Storage,
    token: &str,
    now_ms: u64,
) -> Result<Option<FoundSession>, StorageError> {
    let token_hash = hash_session_token(token);
    let Some(session) = storage.find_live_session(&token_hash, now_ms)? else {
        return Ok(None);
    };
    let refresh = SessionRefresh::due(token_hash, &session, now_ms);
    Ok(Some(FoundSession {
        id: session.id,
        user: session.user,
        refresh,
    }))
}

pub fn end_session(storage: &Storage, token: &str) -> Result<(), StorageError> {
    storage.delete_session(&hash_session_token(token))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Finds the session's user as a request would, applying the extension the session is due.
    fn find_session_user(
        storage: &Storage,
        token: &str,
        now_ms: u64,
    ) -> Result<Option<AccountUser>, StorageError> {
        let Some(found) = find_session(storage, token, now_ms)? else {
            return Ok(None);
        };
        if let Some(refresh) = &found.refresh {
            refresh.apply(storage)?;
        }
        Ok(Some(found.user))
    }

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
        let token = start_session(&storage, &user.id, "", 1_000).unwrap();
        assert_eq!(
            find_session_user(&storage, &token, 2_000).unwrap(),
            Some(user)
        );
    }

    #[test]
    fn a_session_expires_after_ninety_days() {
        let storage = storage_with_reader();
        let user = authenticate(&storage, "reader@example.com", "correct horse").unwrap();
        let token = start_session(&storage, &user.id, "", 0).unwrap();
        assert_eq!(
            find_session_user(&storage, &token, SESSION_LIFETIME_MS).unwrap(),
            None
        );
    }

    #[test]
    fn a_session_in_use_outlives_ninety_days() {
        let storage = storage_with_reader();
        let user = authenticate(&storage, "reader@example.com", "correct horse").unwrap();
        let token = start_session(&storage, &user.id, "", 0).unwrap();
        find_session_user(&storage, &token, SESSION_LIFETIME_MS / 2).unwrap();
        assert_eq!(
            find_session_user(&storage, &token, SESSION_LIFETIME_MS).unwrap(),
            Some(user)
        );
    }

    #[test]
    fn a_session_used_again_within_a_day_keeps_its_expiry() {
        let storage = storage_with_reader();
        let user = authenticate(&storage, "reader@example.com", "correct horse").unwrap();
        let token = start_session(&storage, &user.id, "", 0).unwrap();
        find_session_user(&storage, &token, 1_000).unwrap();
        let session = storage
            .find_live_session(&hash_session_token(&token), 1_000)
            .unwrap()
            .unwrap();
        assert_eq!(session.expires_at_ms, SESSION_LIFETIME_MS);
    }

    #[test]
    fn a_new_password_lets_the_account_log_in() {
        let storage = storage_with_reader();
        let user = authenticate(&storage, "reader@example.com", "correct horse").unwrap();
        set_password(&storage, &user.id, "battery staple").unwrap();
        assert!(authenticate(&storage, "reader@example.com", "battery staple").is_ok());
    }

    #[test]
    fn a_new_password_must_be_long_enough() {
        let storage = storage_with_reader();
        let user = authenticate(&storage, "reader@example.com", "correct horse").unwrap();
        let result = set_password(&storage, &user.id, "short");
        assert!(matches!(result, Err(AccountsError::PasswordTooShort)));
    }

    #[test]
    fn an_ended_session_finds_no_user() {
        let storage = storage_with_reader();
        let user = authenticate(&storage, "reader@example.com", "correct horse").unwrap();
        let token = start_session(&storage, &user.id, "", 1_000).unwrap();
        end_session(&storage, &token).unwrap();
        assert_eq!(find_session_user(&storage, &token, 2_000).unwrap(), None);
    }
}

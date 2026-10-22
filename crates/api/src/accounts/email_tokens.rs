//! The tokens of mailed links, which confirm an email address or let its owner choose a new password.

use easyimmerse_storage::{EmailTokenPurpose, NewEmailToken, Storage, StorageError};

use crate::accounts::credentials::ensure_password_acceptable;
use crate::accounts::error::AccountsError;
use crate::accounts::password_hashing::hash_password;
use crate::accounts::session_tokens::{generate_session_token, hash_session_token};

const HOUR_MS: u64 = 60 * 60 * 1000;
/// How long a link to confirm an email address works: a day.
const CONFIRMATION_LINK_LIFETIME_MS: u64 = 24 * HOUR_MS;
/// How long a link to choose a new password works: an hour.
const RESET_LINK_LIFETIME_MS: u64 = HOUR_MS;

/// Stores a new token for the user, replacing their earlier one of the same purpose, and returns it.
pub fn issue_email_token(
    storage: &Storage,
    user_id: &str,
    purpose: EmailTokenPurpose,
    now_ms: u64,
) -> Result<String, StorageError> {
    let token = generate_session_token();
    let lifetime_ms = match purpose {
        EmailTokenPurpose::ConfirmEmail => CONFIRMATION_LINK_LIFETIME_MS,
        EmailTokenPurpose::ResetPassword => RESET_LINK_LIFETIME_MS,
    };
    storage.issue_email_token(&NewEmailToken {
        token_hash: &hash_session_token(&token),
        user_id,
        purpose,
        created_at_ms: now_ms,
        expires_at_ms: now_ms.saturating_add(lifetime_ms),
    })?;
    Ok(token)
}

/// Uses up a confirmation token and records that its user confirmed their email address.
pub fn confirm_email(storage: &Storage, token: &str, now_ms: u64) -> Result<(), AccountsError> {
    if storage.confirm_email_with_token(&hash_session_token(token), now_ms)? {
        Ok(())
    } else {
        Err(AccountsError::InvalidLink)
    }
}

/// Uses up a reset token and gives its user the new password, which ends all of their sessions.
/// Following the link proves that the user reads mail at the address, so the address counts as confirmed.
/// Returns the user's id.
pub fn reset_password(
    storage: &Storage,
    token: &str,
    password: &str,
    now_ms: u64,
) -> Result<String, AccountsError> {
    ensure_password_acceptable(password)?;
    let password_hash = hash_password(password)?;
    let purpose = EmailTokenPurpose::ResetPassword;
    let Some(user_id) = storage.take_email_token(&hash_session_token(token), purpose, now_ms)?
    else {
        return Err(AccountsError::InvalidLink);
    };
    storage.set_password_hash(&user_id, &password_hash)?;
    storage.confirm_email(&user_id, now_ms)?;
    Ok(user_id)
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::account::AccountRole;

    use super::*;
    use crate::accounts::{authenticate, create_account};

    fn storage_with_reader() -> (Storage, String) {
        let storage = Storage::open_in_memory().unwrap();
        let user = create_account(
            &storage,
            "reader@example.com",
            "correct horse",
            AccountRole::LibraryUser,
        )
        .unwrap();
        (storage, user.id)
    }

    fn reset_token(storage: &Storage, user_id: &str) -> String {
        issue_email_token(storage, user_id, EmailTokenPurpose::ResetPassword, 0).unwrap()
    }

    #[test]
    fn a_reset_lets_the_account_log_in_with_the_new_password() {
        let (storage, user_id) = storage_with_reader();
        let token = reset_token(&storage, &user_id);
        reset_password(&storage, &token, "battery staple", 1_000).unwrap();
        assert!(authenticate(&storage, "reader@example.com", "battery staple").is_ok());
    }

    #[test]
    fn a_reset_link_stops_working_after_an_hour() {
        let (storage, user_id) = storage_with_reader();
        let token = reset_token(&storage, &user_id);
        let result = reset_password(&storage, &token, "battery staple", HOUR_MS);
        assert!(matches!(result, Err(AccountsError::InvalidLink)));
    }

    #[test]
    fn a_reset_confirms_the_email_address() {
        let (storage, user_id) = storage_with_reader();
        let token = reset_token(&storage, &user_id);
        reset_password(&storage, &token, "battery staple", 1_000).unwrap();
        let user = storage.get_user(&user_id).unwrap();
        assert_eq!(user.email_confirmed_at_ms, Some(1_000));
    }

    #[test]
    fn a_short_new_password_leaves_the_link_working() {
        let (storage, user_id) = storage_with_reader();
        let token = reset_token(&storage, &user_id);
        let _ = reset_password(&storage, &token, "short", 1_000);
        assert!(reset_password(&storage, &token, "battery staple", 1_000).is_ok());
    }

    #[test]
    fn a_confirmation_link_works_for_a_day() {
        let (storage, user_id) = storage_with_reader();
        let purpose = EmailTokenPurpose::ConfirmEmail;
        let token = issue_email_token(&storage, &user_id, purpose, 0).unwrap();
        assert!(confirm_email(&storage, &token, 24 * HOUR_MS - 1).is_ok());
    }

    #[test]
    fn a_reset_token_does_not_confirm_an_address() {
        let (storage, user_id) = storage_with_reader();
        let token = reset_token(&storage, &user_id);
        let result = confirm_email(&storage, &token, 1_000);
        assert!(matches!(result, Err(AccountsError::InvalidLink)));
    }
}
